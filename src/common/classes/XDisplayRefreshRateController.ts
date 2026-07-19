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

import * as child_process from 'node:child_process';
import * as fs from 'node:fs';
import type { IDisplayRefreshRateController } from '../models/IDisplayRefreshRateController';
import type { IDisplayFreqRes, IDisplayMode } from '../models/DisplayFreqRes';
import type { ISessionEnvironment } from '../models/SessionEnvironment';
import { execCommandAsync } from './Utils';

/**
 * Refresh-rate-on-profile-activation backend for X11 sessions, driven via xrandr.
 */
export class XDisplayRefreshRateController implements IDisplayRefreshRateController {
    private displayName: string = '';

    private applies: boolean = false;
    private xrandrAvailable: boolean = undefined;

    private display: string = '';
    private xAuthorityFile: string = '';

    private setXAuthority(env: ISessionEnvironment) {
        // additional checks to make sure environment variables are not taken from login screen
        // sddm XDG_SESSION_TYPE can differ from actual session type
        let xAuthorityFile: string;

        if (
            env.xAuthorityRaw &&
            (env.xAuthorityRaw.includes('/var/run/sddm/{') || env.xAuthorityRaw.includes('/var/lib/lightdm'))
        ) {
            xAuthorityFile = undefined;
        } else {
            xAuthorityFile = env.xAuthorityRaw;
        }

        let xAuthorityFileExists: boolean = undefined;

        if (xAuthorityFile) {
            xAuthorityFileExists = fs.existsSync(xAuthorityFile);
        }

        if (xAuthorityFileExists) {
            // gdm XDG_SESSION_TYPE can differ from actual session type
            // Ubuntu creates xAuthority file with user gdm and that user name is unavailable,
            // but Tuxedo OS with sddm allows the user name gdm
            const xAuthorityFileInfo: string = child_process.execSync(`ls -l ${xAuthorityFile}`).toString();

            if (xAuthorityFileInfo.includes(' gdm gdm ') && env.username === 'gdm') {
                this.xAuthorityFile = undefined;
            } else {
                this.xAuthorityFile = xAuthorityFile;
            }
        } else {
            this.xAuthorityFile = undefined;
        }
    }

    public async setVariables(env: ISessionEnvironment): Promise<void> {
        this.applies = env.sessionType === 'x11';

        if (this.applies) {
            this.setXAuthority(env);
            this.display = env.display;
        }

        if (this.xrandrAvailable === undefined) {
            this.xrandrAvailable = await this.checkXrandrInstalled();
        }
    }

    public getDisplay(): string {
        return this.display;
    }

    public getDisplayName(): string {
        return this.displayName;
    }

    public getXAuthorityFile(): string {
        return this.xAuthorityFile;
    }

    public getDebugInfo(): string {
        return `display "${this.display}" with the name "${this.displayName}" and XAUTHORITY "${this.xAuthorityFile}"`;
    }

    public resetValues(): void {
        this.applies = false;
        this.display = '';
        this.xAuthorityFile = '';
        this.displayName = '';
    }

    public checkVariablesAvailable(): boolean {
        return (
            this.applies &&
            this.display !== undefined &&
            this.display !== '' &&
            this.display !== ' ' &&
            this.xAuthorityFile !== undefined &&
            this.xAuthorityFile !== '' &&
            this.xAuthorityFile !== ' ' &&
            this.xrandrAvailable !== undefined
        );
    }

    private async checkXrandrInstalled(): Promise<boolean> {
        try {
            const stdout: string = await execCommandAsync('which xrandr');
            return stdout?.trim()?.length > 0;
        } catch (err: unknown) {
            console.error(`XDisplayRefreshRateController: checkXrandrInstalled failed => ${err}`);
            return false;
        }
    }

    public getDisplayModes(): IDisplayFreqRes {
        if (!this.xrandrAvailable) {
            return undefined;
        }

        let result: string = '';
        try {
            result = child_process
                .execSync(`XAUTHORITY=${this.xAuthorityFile} xrandr -q -display ${this.display} --current`)
                .toString();
        } catch (err: unknown) {
            console.error(
                `XDisplayRefreshRateController: getDisplayModes: xrandr failed with xAuthorityFile "${this.xAuthorityFile}" and display "${this.display}" => ${err}`,
            );
            return undefined;
        }

        const displayNameRegex = /(eDP\S*|LVDS\S*)/;

        // for example "1920x1080" and "1920x1080i"
        const resolutionRegex: RegExp = /\s+[0-9]{3,4}x[0-9]{3,4}[a-z]?/;

        // for example "60.00*+", "50.00", "59.94" and 59.99"
        const freqRegex: RegExp = /[0-9]{1,3}\.[0-9]{2}[*]?[+]?/g;

        // matches currently active config, for example "2560x1440 165.00*+ 40.00 +"
        const fullLineRegex: RegExp = /\s+[0-9]{3,4}x[0-9]{3,4}[a-z]?(\s+[0-9]{1,3}\.[0-9]{2}[*]?[+]?)+/;

        const newDisplayModes: IDisplayFreqRes = {
            displayName: '',
            activeMode: {
                refreshRates: [],
                xResolution: 0,
                yResolution: 0,
            },
            displayModes: [],
        };

        const lines: string[] = result.split('\n');
        const lineIter: IterableIterator<string> = lines[Symbol.iterator]();
        let foundDisplayName: boolean = false;
        let currLine: string = lineIter.next().value;

        while (currLine && !foundDisplayName) {
            const displayNameMatch: RegExpMatchArray = currLine.match(displayNameRegex);
            if (displayNameMatch) {
                newDisplayModes.displayName = this.displayName = displayNameMatch[0].trim();

                foundDisplayName = true;
            }
            currLine = lineIter.next().value;
        }
        while (currLine?.match(fullLineRegex)) {
            this.createDisplayMode(currLine, resolutionRegex, freqRegex, newDisplayModes);
            currLine = lineIter.next().value;
        }

        return newDisplayModes;
    }

    private createDisplayMode(
        line: string,
        resolutionRegex: RegExp,
        freqRegex: RegExp,
        newDisplayModes: IDisplayFreqRes,
    ): void {
        const resolution: string[] = line.match(resolutionRegex)[0].split('x');
        const refreshrates: RegExpMatchArray = line.match(freqRegex);
        const newMode: IDisplayMode = {
            refreshRates: [],
            xResolution: Number.parseInt(resolution[0], 10),
            yResolution: Number.parseInt(resolution[1], 10),
        };
        for (const rate of refreshrates) {
            const num: number = Number.parseFloat(rate.replace(/[^0-9.]/g, ''));
            if (!newMode?.refreshRates.includes(num)) {
                newMode?.refreshRates.push(num);
            }
        }
        newDisplayModes.displayModes.push(newMode);

        this.setActiveDisplayMode(refreshrates, newDisplayModes, newMode);
    }

    private setActiveDisplayMode(
        refreshrates: RegExpMatchArray,
        newDisplayModes: IDisplayFreqRes,
        newMode: IDisplayMode,
    ): void {
        const activeRateIndex: number = refreshrates.findIndex((rate: string): boolean => rate.includes('*'));
        if (activeRateIndex !== -1) {
            newDisplayModes.activeMode.refreshRates = [newMode?.refreshRates[activeRateIndex]];
            newDisplayModes.activeMode.xResolution = newMode.xResolution;
            newDisplayModes.activeMode.yResolution = newMode.yResolution;
        }
    }

    public setRefreshRateAndResolution(xRes: number, yRes: number, rate: number): boolean {
        if (this.checkVariablesAvailable()) {
            try {
                child_process.execSync(
                    `XAUTHORITY=${this.xAuthorityFile} xrandr -display ${this.display} --output ${this.displayName} --mode ${xRes}x${yRes} -r ${rate}`,
                );
                return true;
            } catch (_err: unknown) {
                return false;
            }
        }
        return false;
    }
}
