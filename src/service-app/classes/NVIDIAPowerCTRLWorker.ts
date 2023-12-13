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
import { TuxedoControlCenterDaemon } from "./TuxedoControlCenterDaemon";
import { SysFsPropertyInteger } from "../../common/classes/SysFsProperties";
import { DaemonWorker } from "./DaemonWorker";
import * as fs from "fs";

export class NVIDIAPowerCTRLWorker extends DaemonWorker {
    private ctgpOffsetPath: string =
        "/sys/devices/platform/tuxedo_nvidia_power_ctrl/ctgp_offset";
    private ctgpOffsetSysfsProp: SysFsPropertyInteger =
        new SysFsPropertyInteger(this.ctgpOffsetPath);
    private available: boolean = this.ctgpOffsetSysfsProp.isAvailable();
    private fsListener: Array<fs.FSWatcher>;

    constructor(tccd: TuxedoControlCenterDaemon) {
        super(10000, tccd);
    }

    public async onStart() {
        if (!this.available) {
            return;
        }

        this.fsListener = this.ctgpOffsetSysfsProp.setFSWatchListener(
            async function (
                event: "rename" | "change",
                filename: string
            ): Promise<void> {
                let ctgpOffset: number =
                    this.tccd.activeProfile.nvidiaPowerCTRLProfile.cTGPOffset;
                if (
                    event == "change" &&
                    this.ctgpOffsetSysfsProp.readValueNT() != ctgpOffset
                ) {
                    this.ctgpOffsetSysfsProp.writeValue(ctgpOffset);
                }
            }.bind(this)
        );

        this.applyActiveProfile();
        this.tccd.dbusData.nvidiaPowerCTRLAvailable = true;
    }

    public async onWork() {
        if (
            JSON.stringify(this.previousProfile) !=
            JSON.stringify(this.activeProfile)
        ) {
            this.applyActiveProfile();
        }
    }

    public onExit() {
        this.fsListener.forEach((fs) => fs.close());
    }

    private applyActiveProfile(): void {
        this.ctgpOffsetSysfsProp.writeValue(
            this.tccd.activeProfile.nvidiaPowerCTRLProfile.cTGPOffset
        );
    }
}
