/*!
 * Copyright (c) 2019-2025 TUXEDO Computers GmbH <tux@tuxedocomputers.com>
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

import { DaemonWorker } from "./DaemonWorker";
import { XDisplayRefreshRateController } from "../../common/classes/XDisplayRefreshRateController";
import {
    IDisplayFreqRes,
    IDisplayMode,
} from "../../common/models/DisplayFreqRes";
import { TuxedoControlCenterDaemon } from "./TuxedoControlCenterDaemon";
import * as child_process from "child_process";
import { ITccProfile } from "src/common/models/TccProfile";

export class DisplayRefreshRateWorker extends DaemonWorker {
    private controller: XDisplayRefreshRateController;
    private displayInfo: IDisplayFreqRes;
    private displayInfoFound: boolean = false;
    private previousUsers: string = "";

    constructor(tccd: TuxedoControlCenterDaemon) {
        super(5000, "DisplayRefreshrateWorker", tccd);
        this.controller = new XDisplayRefreshRateController();
    }

    public onStart(): void {}

    // user is able to switch XDG_SESSION_TYPE in login screen and thus a new check needs to be done
    // not checking XDG_SESSION_TYPE during login screen, checking again on user change
    // sometimes "users" returns the same user more than once
    private checkUsers(): boolean[] {
        const loggedInUsers: string = [
            ...new Set(
                child_process.execSync("users").toString().trim().split(" ")
            ),
        ].toString();

        const usersAvailable: boolean = loggedInUsers.length > 0;
        const usersChanged: boolean = loggedInUsers !== this.previousUsers;
        this.previousUsers = loggedInUsers;

        return [usersAvailable, usersChanged];
    }

    private resetToDefault(): void {
        this.displayInfo = undefined;
        this.displayInfoFound = false;
        this.controller.resetValues();
    }

    public onWork(): void {
        const [usersAvailable, usersChanged] = this.checkUsers();

        if (usersChanged) {
            this.resetToDefault();
        }

        if (usersAvailable && !this.controller.checkVariablesAvailable()) {
            if (!this.displayInfoFound && this.controller.getIsTTY() !== true) {
                this.updateDisplayData();
            }
        }
        this.setActiveDisplayMode();
    }

    public onExit(): void {}

    private setActiveDisplayMode(): void {
        const activeprofile: ITccProfile = this.tccd.getCurrentProfile();

        const useRefRate: boolean = activeprofile?.display?.useRefRate;
        const activeMode: IDisplayMode = this.displayInfo?.activeMode;

        if (useRefRate && activeMode) {
            const refreshRate: number = activeprofile.display.refreshRate;
            // todo: add variable checks to avoid access error
            const hasDifferentRefreshRate: boolean =
                refreshRate !== activeMode?.refreshRates[0];

            if (hasDifferentRefreshRate) {
                const status: boolean =
                    this.controller.setRefreshRateAndResolution(
                        activeMode.xResolution,
                        activeMode.yResolution,
                        refreshRate
                    );

                if (status) {
                    console.log(
                        `DisplayRefreshRateWorker: setActiveDisplayMode: Set ${refreshRate}Hz with ${activeMode.xResolution}x${activeMode.yResolution}`
                    );
                    activeMode.refreshRates[0] = refreshRate;
                } else {
                    console.error(
                        `DisplayRefreshRateWorker: setActiveDisplayMode: Failed to set refresh rate ${refreshRate}Hz with ${
                            activeMode.xResolution
                        }x${
                            activeMode.yResolution
                        } for display ${this.controller.getDisplay()} with the name ${this.controller.getDisplayName()}`
                    );
                }
            }
        }
    }

    private updateDisplayData(): void {
        this.controller.setVariables();

        if (
            this.controller.getIsTTY() === false &&
            this.controller.getIsWayland() === false &&
            this.controller.getIsX11() === 1
        ) {
            this.displayInfo = this.controller.getDisplayModes();
            if (this.displayInfo === undefined) {
                this.tccd.dbusData.displayModesJSON = "{}";
            } else {
                this.displayInfoFound = true;
                this.tccd.dbusData.displayModesJSON = JSON.stringify(
                    this.displayInfo
                );
            }
        } else {
            this.tccd.dbusData.displayModesJSON = "{}";
        }

        this.tccd.dbusData.isX11 = this.controller.getIsX11();

        if (this.controller.getIsX11() === 1) {
            console.log(
                "DisplayRefreshRateWorker: Detected x11"
            );
        }

        if (this.controller.getIsWayland()) {
            console.log(
                "DisplayRefreshRateWorker: Detected wayland"
            );
        }

        if (this.controller.getIsTTY()) {
            console.log(
                "DisplayRefreshRateWorker: Detected tty"
            );
        }
    }

    public getActiveDisplayMode(): IDisplayMode {
        if (this.displayInfo === undefined) {
            this.updateDisplayData();
        }
        if (this.displayInfo === undefined) {
            return undefined;
        } else {
            return this.displayInfo.activeMode;
        }
    }
}
