/*!
 * Copyright (c) 2019-2023 TUXEDO Computers GmbH <tux@tuxedocomputers.com>
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

export class DisplayRefreshRateWorker extends DaemonWorker {
    private controller: XDisplayRefreshRateController;
    private displayInfo: IDisplayFreqRes;
    private displayInfoFound: boolean = false;
    private previousUsers: string = "";

    constructor(tccd: TuxedoControlCenterDaemon) {
        super(5000, tccd);
        this.controller = new XDisplayRefreshRateController();
    }

    public onStart(): void {}

    // user is able to switch XDG_SESSION_TYPE in login screen and thus a new check needs to be done
    // not checking XDG_SESSION_TYPE during login screen, checking again on user change
    private checkUsers() {
        const loggedInUsers = child_process.execSync(`users`).toString().trim();

        const usersAvailable = Boolean(loggedInUsers);
        const usersChanged = loggedInUsers !== this.previousUsers;

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

        if (usersAvailable && !this.controller.getIsWayland()) {
            if (!this.displayInfoFound) {
                this.updateDisplayData();
            }

            this.setActiveDisplayMode();
        }
    }

    public onExit(): void {}

    private setActiveDisplayMode(): void {
        const activeprofile = this.tccd.getCurrentProfile();

        const useRefRate = activeprofile?.display?.useRefRate;
        const activeMode = this.displayInfo?.activeMode;

        if (useRefRate && activeMode) {
            const refreshRate = activeprofile.display.refreshRate;
            const hasDifferentRefreshRate =
                refreshRate !== activeMode.refreshRates[0];

            if (hasDifferentRefreshRate) {
                this.setDisplayMode(
                    activeMode.xResolution,
                    activeMode.yResolution,
                    refreshRate
                );
                activeMode.refreshRates[0] = refreshRate;
            }
        }
    }

    private updateDisplayData(): void {
        this.displayInfo = this.controller.getDisplayModes();

        this.tccd.dbusData.isX11 = this.controller.getIsX11();

        if (this.displayInfo === undefined) {
            this.tccd.dbusData.displayModes = undefined;
        } else {
            this.displayInfoFound = true;
            this.tccd.dbusData.displayModes = JSON.stringify(this.displayInfo);
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

    private setDisplayMode(xRes: number, yRes: number, refRate: number) {
        this.controller.setRefreshResolution(xRes, yRes, refRate);
    }
}
