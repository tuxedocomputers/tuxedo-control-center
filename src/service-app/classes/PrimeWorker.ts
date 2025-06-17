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
import { TuxedoControlCenterDaemon } from "./TuxedoControlCenterDaemon";
import { execCommandAsync, delay } from "../../common/classes/Utils";
import * as fs from "fs";

export class PrimeWorker extends DaemonWorker {
    private primeSupported: Boolean;

    constructor(tccd: TuxedoControlCenterDaemon) {
        super(10000, "PrimeWorker", tccd);
    }

    public async onStart(): Promise<void> {
        // not instantly setting prime status in onStart() because requires_offloading only gets updated after some delay
        // checking it directly in onStart() will result in getting a wrong state
        await delay(2000);
        this.setPrimeStatus();
    }

    public async onWork(): Promise<void> {
        // checking in case someone changes state externally, otherwise could be removed to avoid periodic checking
        this.setPrimeStatus();
    }

    private async setPrimeStatus(): Promise<void> {
        const primeSupported: boolean = await this.checkPrimeSupported();

        if (primeSupported) {
            this.tccd.dbusData.primeState = JSON.stringify(await this.checkPrimeStatus());
            this.primeSupported = primeSupported;
        }
        if (!primeSupported) {
            this.tccd.dbusData.primeState = JSON.stringify("-1");
        }
    }

    public async onExit(): Promise<void> {}

    // only supporting gpu switch on systems which can use prime-select since primary focus is Tuxdeo OS and Ubuntu
    // other operating systems may handle this differently and thus can't easily be supported
    private async checkPrimeSupported(): Promise<boolean> {
        const offloadingStatus: boolean =
            fs.existsSync(
                "/var/lib/ubuntu-drivers-common/requires_offloading"
            ) === true;

        const primeAvailable: string = (
            await execCommandAsync("which prime-select | cat")
        )
            .toString()
            .trim();

        return offloadingStatus && !!primeAvailable;
    }

    private async checkPrimeStatus(): Promise<string> {
        return this.transformPrimeStatus(
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
