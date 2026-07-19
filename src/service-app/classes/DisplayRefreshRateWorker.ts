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
import { execCommandAsync } from '../../common/classes/Utils';
import { KScreenDisplayController } from '../../common/classes/KScreenDisplayController';
import { SessionEnvironmentReader } from '../../common/classes/SessionEnvironmentReader';
import { XDisplayRefreshRateController } from '../../common/classes/XDisplayRefreshRateController';
import type { IDisplayFreqRes, IDisplayMode } from '../../common/models/DisplayFreqRes';
import type { IDisplayRefreshRateController } from '../../common/models/IDisplayRefreshRateController';
import type { ISessionEnvironment } from '../../common/models/SessionEnvironment';
import type { ITccProfile } from '../../common/models/TccProfile';
import { DaemonWorker } from './DaemonWorker';
import type { TuxedoControlCenterDaemon } from './TuxedoControlCenterDaemon';

export class DisplayRefreshRateWorker extends DaemonWorker {
    // Reads the raw session environment, shared by all candidate backends below.
    private sessionReader: SessionEnvironmentReader;
    // Candidate backends, tried in order; each decides for itself whether it applies.
    private controllers: IDisplayRefreshRateController[];
    // Whichever backend applies to the current session, or undefined if none does.
    private activeController: IDisplayRefreshRateController;
    // Set once a full pass over this.controllers found none applicable (e.g. TTY session),
    // so we stop re-scanning every poll until a user/session change resets it.
    private noControllerApplies: boolean = false;

    private displayInfo: IDisplayFreqRes;
    private displayInfoFound: boolean = false;
    private previousUsers: string[] = [];
    private wAvailable: boolean = undefined;
    private disallowedUserNames: string[] = ['sddm', 'gdm', 'gdm-gree', 'root'];

    constructor(tccd: TuxedoControlCenterDaemon) {
        super(5000, 'DisplayRefreshrateWorker', tccd);
        this.sessionReader = new SessionEnvironmentReader();
        this.controllers = [new XDisplayRefreshRateController(), new KScreenDisplayController()];
    }

    public async onStart(): Promise<void> {
        try {
            this.wAvailable = !!(await execCommandAsync('which w')).toString().trim();
            if (!this.wAvailable) {
                console.log('DisplayRefreshrateWorker: w not available');
            }
        } catch (err: unknown) {
            console.error(`DisplayRefreshrateWorker: onStart failed => ${err}`);
            this.wAvailable = false;
        }
    }

    // user is able to switch XDG_SESSION_TYPE in login screen and thus a new check needs to be done
    // not checking XDG_SESSION_TYPE during login screen, checking again on user change
    private checkUsers(): boolean[] {
        const userInformation: string[] = child_process.execSync('w --no-header').toString().split('\n');

        const loggedInUsers: string[] = [];

        for (const line of userInformation) {
            const result: RegExpMatchArray = line.match(/^([^\s\d]+)/);

            if (result) {
                const userName: string = result[0];

                if (userName && !this.disallowedUserNames.includes(userName)) {
                    loggedInUsers.push(userName);
                }
            }
        }

        const usersAvailable: boolean = loggedInUsers.length > 0;
        const usersChanged: boolean = JSON.stringify(loggedInUsers) !== JSON.stringify(this.previousUsers);

        this.previousUsers = loggedInUsers;

        return [usersAvailable, usersChanged];
    }

    private resetToDefault(): void {
        this.displayInfo = undefined;
        this.displayInfoFound = false;
        this.activeController = undefined;
        this.noControllerApplies = false;
        for (const controller of this.controllers) {
            controller.resetValues();
        }
    }

    public async onWork(): Promise<void> {
        if (!this.wAvailable) {
            return;
        }

        const [usersAvailable, usersChanged] = this.checkUsers();

        if (usersChanged) {
            this.resetToDefault();
        }

        if (usersAvailable && !this.activeController && !this.noControllerApplies && !this.displayInfoFound) {
            await this.updateDisplayData();
        }
        this.setActiveDisplayMode();
    }

    public async onExit(): Promise<void> {}

    private setActiveDisplayMode(): void {
        const activeprofile: ITccProfile = this.tccd.getCurrentProfile();

        const useRefRate: boolean = activeprofile?.display?.useRefRate;
        const activeMode: IDisplayMode = this.displayInfo?.activeMode;

        if (useRefRate && activeMode && this.activeController) {
            const refreshRate: number = activeprofile.display.refreshRate;
            // todo: add variable checks to avoid access error
            const hasDifferentRefreshRate: boolean = refreshRate !== activeMode?.refreshRates[0];

            if (hasDifferentRefreshRate) {
                const status: boolean = this.activeController.setRefreshRateAndResolution(
                    activeMode.xResolution,
                    activeMode.yResolution,
                    refreshRate,
                );

                if (status) {
                    console.log(
                        `DisplayRefreshRateWorker: setActiveDisplayMode: Set ${refreshRate}Hz with ${
                            activeMode.xResolution
                        }x${activeMode.yResolution} via ${this.activeController.getDebugInfo()}`,
                    );
                    activeMode.refreshRates[0] = refreshRate;
                } else {
                    console.error(
                        `DisplayRefreshRateWorker: setActiveDisplayMode: Failed to set refresh rate ${refreshRate}Hz with ${
                            activeMode.xResolution
                        }x${activeMode.yResolution} via ${this.activeController.getDebugInfo()}`,
                    );
                    this.resetToDefault();
                }
            }
        }
    }

    /**
     * Tries each candidate backend in order against the given raw session environment,
     * and picks the first one that applies and is ready. this.activeController stays
     * undefined, and this.noControllerApplies is set, if none applies (e.g. TTY, or a
     * Wayland session on a desktop environment without a backend yet).
     */
    private async selectActiveController(env: ISessionEnvironment): Promise<void> {
        for (const controller of this.controllers) {
            await controller.setVariables(env);
            if (controller.checkVariablesAvailable()) {
                this.activeController = controller;
                return;
            }
        }
        this.noControllerApplies = true;
    }

    private async updateDisplayData(): Promise<void> {
        this.resetToDefault();
        const env: ISessionEnvironment = this.sessionReader.read();

        await this.selectActiveController(env);

        if (this.activeController) {
            this.displayInfo = this.activeController.getDisplayModes();

            if (this.displayInfo === undefined) {
                this.tccd.dbusData.displayModesJSON = '{}';
            } else {
                this.displayInfoFound = true;
                this.tccd.dbusData.displayModesJSON = JSON.stringify(this.displayInfo);
            }
        } else {
            this.tccd.dbusData.displayModesJSON = '{}';
        }

        this.tccd.dbusData.isX11 = env.sessionType === '' ? -1 : env.sessionType === 'x11' ? 1 : 0;

        if (env.sessionType === 'x11') {
            console.log('DisplayRefreshRateWorker: Detected x11');
        } else if (env.sessionType === 'wayland') {
            console.log(
                `DisplayRefreshRateWorker: Detected wayland${env.currentDesktop.toUpperCase().includes('KDE') ? ' (KDE Plasma)' : ''}`,
            );
        } else if (env.sessionType === 'tty') {
            console.log('DisplayRefreshRateWorker: Detected tty');
        }
    }
}
