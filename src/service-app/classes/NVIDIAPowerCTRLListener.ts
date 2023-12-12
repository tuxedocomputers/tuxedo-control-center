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
import { TuxedoControlCenterDaemon } from './TuxedoControlCenterDaemon';
import { SysFsPropertyInteger } from "../../common/classes/SysFsProperties";

export class NVIDIAPowerCTRLListener {
    private ctgpOffsetPath: string = "/sys/devices/platform/tuxedo_nvidia_power_ctrl/ctgp_offset";
    private ctgpOffsetSysfsProp: SysFsPropertyInteger = new SysFsPropertyInteger(this.ctgpOffsetPath);
    private available: boolean = this.ctgpOffsetSysfsProp.isAvailable();

    constructor(private tccd: TuxedoControlCenterDaemon) {
        if (!this.isAvailable()) {
            return;
        }

        this.init();
    }

    private async init(): Promise<void> {
        this.ctgpOffsetSysfsProp.setFSWatchListener((async function(event: "rename" | "change", filename: string): Promise<void> {
            let ctgpOffset: number = this.tccd.activeProfile.nvidiaPowerCTRLProfile.cTGPOffset;
            if (event == "change" && this.ctgpOffsetSysfsProp.readValueNT() != ctgpOffset) {
                this.ctgpOffsetSysfsProp.writeValue(ctgpOffset);
            }
        }).bind(this));

        this.applyActiveProfile();

        this.tccd.dbusData.nvidiaPowerCTRLAvailable = true;
    }

    public isAvailable(): boolean {
        return this.available;
    }

    private applyActiveProfile(): void {
        this.ctgpOffsetSysfsProp.writeValue(this.tccd.activeProfile.nvidiaPowerCTRLProfile.cTGPOffset);
    }
}