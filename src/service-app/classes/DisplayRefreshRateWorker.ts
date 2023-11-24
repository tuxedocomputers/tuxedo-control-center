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
import { ITccProfile } from "src/common/models/TccProfile";

export class DisplayRefreshRateWorker extends DaemonWorker {
    private controller: XDisplayRefreshRateController;
    private displayInfo: IDisplayFreqRes;
    private refreshRateSupported: boolean;
    private retryCount: number = 0;
    private displayInfoFound: boolean = false;

    private activeprofile: ITccProfile;

    constructor(tccd: TuxedoControlCenterDaemon) {
        super(3000, tccd);
        this.controller = new XDisplayRefreshRateController();
    }

    public onStart(): void {}

    public onWork(): void {
        this.retryCount += 1;
        this.activeprofile = this.tccd.getCurrentProfile();

        if (this.retryCount < 5 && !this.displayInfoFound) {
            this.setDisplayInfo();
        }

        this.setActiveDisplayMode();
    }

    public onExit(): void {}

    private setDisplayInfo() {
        this.updateDisplayData();
        // happens right after boot when user was not logged into graphical DE yet (but into tty)
        if (!this.activeprofile || !this.displayInfo) {
            return;
        }
    }

    private setActiveDisplayMode(): void {
        const useRefRate = this.activeprofile?.display?.useRefRate;
        const activeMode = this.displayInfo?.activeMode;

        if (useRefRate && activeMode) {
            const refreshRate = this.activeprofile.display.refreshRate;
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
        // check if x11 because of future wayland support
        this.refreshRateSupported = this.controller.getIsX11();
        if (this.displayInfo === undefined) {
            this.tccd.dbusData.displayModes = undefined;
        } else {
            this.displayInfoFound = true;
            this.tccd.dbusData.displayModes = JSON.stringify(this.displayInfo);
        }
        this.tccd.dbusData.refreshRateSupported = this.refreshRateSupported;
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
