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
import { TuxedoControlCenterDaemon } from "./TuxedoControlCenterDaemon";
import { execCommandAsync } from "src/common/classes/Utils";

export class PrimeWorker extends DaemonWorker {
    primeSupported: Boolean;

    constructor(tccd: TuxedoControlCenterDaemon) {
        super(10000, tccd);
    }

    public async onStart() {
        await this.checkPrimeSupported();
        this.setPrimeStatus();
    }

    public async onWork() {
        this.setPrimeStatus();
    }

    public onExit() {}

    private setPrimeStatus() {
        if (this.primeSupported) {
            this.checkPrimeStatus();
        }
        if (!this.primeSupported) {
            this.tccd.dbusData.primeState = "-1";
        }
    }

    private async checkPrimeSupported() {
        this.primeSupported =
            (await execCommandAsync("prime-supported /dev/null")) === "yes";
    }

    private async checkPrimeStatus() {
        this.tccd.dbusData.primeState = this.transformPrimeStatus(
            await execCommandAsync("prime-select query")
        );
    }

    private transformPrimeStatus(status: string): string {
        switch (status) {
            case "nvidia":
                return "dGPU";
            case "intel":
                return "iGPU";
            case "on-demand":
                return "on-demand";
            default:
                return "off";
        }
    }
}
