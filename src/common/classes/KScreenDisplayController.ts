/*!
 * Copyright (c) 2019-2026 TUXEDO Computers GmbH <tux@tuxedocomputers.com>
 *
 * This file is part of TUXEDO Control Center.
 *
 * TUXEDO Control Center is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * TUXEDO Control Center is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with TUXEDO Control Center.  If not, see <https://www.gnu.org/licenses/>.
 */

import type { IDisplayFreqRes, IDisplayMode } from '../models/DisplayFreqRes';
import type { IDisplayRefreshRateController } from '../models/IDisplayRefreshRateController';
import type { ISessionEnvironment } from '../models/SessionEnvironment';
import { execCommandAsync, execCommandSync } from './Utils';

interface IKScreenMode {
    id: string;
    size: { width: number; height: number };
    refreshRate: number;
}

interface IKScreenOutput {
    name: string;
    connected: boolean;
    enabled: boolean;
    currentModeId: string;
    modes: IKScreenMode[];
}

interface IKScreenDoctorJSON {
    outputs: IKScreenOutput[];
}

interface IParsedKScreenModes {
    displayFreqRes: IDisplayFreqRes;
    outputName: string;
    modeIdByKey: Map<string, string>;
}

function modeKey(xRes: number, yRes: number, rate: number): string {
    return `${xRes}x${yRes}@${rate.toFixed(2)}`;
}

/**
 * Refresh-rate-on-profile-activation backend for KDE Plasma sessions (X11 or Wayland),
 * driven through KWin's own kscreen-doctor CLI instead of xrandr.
 */
export class KScreenDisplayController implements IDisplayRefreshRateController {
    private applies: boolean = false;

    private username: string = '';
    private xdgRuntimeDir: string = '';
    private waylandDisplay: string = '';
    private dbusSessionBusAddress: string = '';

    private kscreenDoctorAvailable: boolean = undefined;
    private outputName: string = '';
    private modeIdByKey: Map<string, string> = new Map();

    public async setVariables(env: ISessionEnvironment): Promise<void> {
        this.applies = env.sessionType === 'wayland' && env.currentDesktop.toUpperCase().includes('KDE');

        if (this.applies) {
            this.username = env.username;
            this.xdgRuntimeDir = env.xdgRuntimeDir;
            this.waylandDisplay = env.waylandDisplay;
            this.dbusSessionBusAddress = env.dbusSessionBusAddress;
        }

        if (this.kscreenDoctorAvailable === undefined) {
            this.kscreenDoctorAvailable = await this.checkKscreenDoctorInstalled();
        }
    }

    public checkVariablesAvailable(): boolean {
        return (
            this.applies &&
            !!this.username &&
            !!this.xdgRuntimeDir &&
            !!this.waylandDisplay &&
            this.kscreenDoctorAvailable !== undefined
        );
    }

    public resetValues(): void {
        this.applies = false;
        this.username = '';
        this.xdgRuntimeDir = '';
        this.waylandDisplay = '';
        this.dbusSessionBusAddress = '';
        this.outputName = '';
        this.modeIdByKey = new Map();
    }

    private async checkKscreenDoctorInstalled(): Promise<boolean> {
        try {
            const stdout: string = await execCommandAsync('which kscreen-doctor');
            return stdout?.trim()?.length > 0;
        } catch (err: unknown) {
            console.error(`KScreenDisplayController: checkKscreenDoctorInstalled failed => ${err}`);
            return false;
        }
    }

    /**
     * Prefixes a command so it runs as the target (logged-in) user with that user's
     * Wayland/D-Bus session env vars, since tccd itself runs as root.
     */
    private buildUserCommand(command: string): string {
        let env = `WAYLAND_DISPLAY=${this.waylandDisplay} XDG_RUNTIME_DIR=${this.xdgRuntimeDir}`;
        if (this.dbusSessionBusAddress) {
            env += ` DBUS_SESSION_BUS_ADDRESS=${this.dbusSessionBusAddress}`;
        }
        return `runuser -u ${this.username} -- env ${env} ${command}`;
    }

    public getDisplayModes(): IDisplayFreqRes | undefined {
        if (!this.kscreenDoctorAvailable) {
            return undefined;
        }

        const result: string = execCommandSync(this.buildUserCommand('kscreen-doctor -j'));
        if (result === undefined) {
            console.error('KScreenDisplayController: getDisplayModes: kscreen-doctor -j failed');
            return undefined;
        }

        const parsed: IParsedKScreenModes = KScreenDisplayController.parseKscreenDoctorJSON(result);
        if (!parsed) {
            return undefined;
        }

        this.outputName = parsed.outputName;
        this.modeIdByKey = parsed.modeIdByKey;
        return parsed.displayFreqRes;
    }

    /**
     * Pure parsing of `kscreen-doctor -j` output, kept separate from getDisplayModes() so
     * it can be unit tested without shelling out. Picks the first connected+enabled laptop
     * panel output (eDP/LVDS), matching XDisplayRefreshRateController's X11 behavior.
     */
    public static parseKscreenDoctorJSON(json: string): IParsedKScreenModes | undefined {
        let parsedJSON: IKScreenDoctorJSON;
        try {
            parsedJSON = JSON.parse(json);
        } catch (err: unknown) {
            console.error(`KScreenDisplayController: parseKscreenDoctorJSON: invalid JSON => ${err}`);
            return undefined;
        }

        const output: IKScreenOutput = parsedJSON?.outputs?.find(
            (candidate: IKScreenOutput): boolean =>
                candidate.connected && candidate.enabled && /^(eDP|LVDS)/i.test(candidate.name ?? ''),
        );
        if (!output || !Array.isArray(output.modes) || output.modes.length === 0) {
            return undefined;
        }

        const displayFreqRes: IDisplayFreqRes = {
            displayName: output.name,
            activeMode: { refreshRates: [], xResolution: 0, yResolution: 0 },
            displayModes: [],
        };
        const modesByResolution: Map<string, IDisplayMode> = new Map();
        const modeIdByKey: Map<string, string> = new Map();

        for (const mode of output.modes) {
            const xResolution: number = mode.size?.width;
            const yResolution: number = mode.size?.height;
            const rate: number = mode.refreshRate;
            if (xResolution === undefined || yResolution === undefined || rate === undefined) {
                continue;
            }

            const resolutionKey = `${xResolution}x${yResolution}`;
            let displayMode: IDisplayMode = modesByResolution.get(resolutionKey);
            if (!displayMode) {
                displayMode = { refreshRates: [], xResolution, yResolution };
                modesByResolution.set(resolutionKey, displayMode);
                displayFreqRes.displayModes.push(displayMode);
            }
            if (!displayMode.refreshRates.includes(rate)) {
                displayMode.refreshRates.push(rate);
            }
            modeIdByKey.set(modeKey(xResolution, yResolution, rate), mode.id);

            if (mode.id === output.currentModeId) {
                displayFreqRes.activeMode = { refreshRates: [rate], xResolution, yResolution };
            }
        }

        return { displayFreqRes, outputName: output.name, modeIdByKey };
    }

    public setRefreshRateAndResolution(xRes: number, yRes: number, rate: number): boolean {
        if (!this.checkVariablesAvailable() || !this.outputName) {
            return false;
        }

        const modeId: string = this.modeIdByKey.get(modeKey(xRes, yRes, rate));
        if (modeId === undefined) {
            console.error(
                `KScreenDisplayController: setRefreshRateAndResolution: no mode found for ${xRes}x${yRes}@${rate} on output "${this.outputName}"`,
            );
            return false;
        }

        const result: string = execCommandSync(
            this.buildUserCommand(`kscreen-doctor output.${this.outputName}.mode.${modeId}`),
        );
        return result !== undefined;
    }

    public getDebugInfo(): string {
        return `kscreen-doctor output "${this.outputName}" for user "${this.username}" with XDG_RUNTIME_DIR "${this.xdgRuntimeDir}"`;
    }

    public getDisplayType(): string {
        return 'wayland (KDE Plasma)';
    }
}
