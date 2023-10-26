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
    private ctgp_offset_path: string = "/sys/devices/platform/tuxedo_nvidia_power_ctrl/ctgp_offset";
    private ctgp_offset_sysfs_prop: SysFsPropertyInteger = new SysFsPropertyInteger(this.ctgp_offset_path);
    private available: boolean = this.ctgp_offset_sysfs_prop.isAvailable();

    constructor(private tccd: TuxedoControlCenterDaemon) {
        if (!this.isAvailable()) {
            return;
        }

        this.init();
    }

    private async init(): Promise<void> {
        this.ctgp_offset_sysfs_prop.setFSWatchListener((async function(event: "rename" | "change", filename: string): Promise<void> {
            let ctgp_offset: number = this.tccd.activeProfile.nvidiaPowerCTRLProfile.ctgp_offset;
            if (event == "change" && this.ctgp_offset_sysfs_prop.readValueNT() != ctgp_offset) {
                this.ctgp_offset_sysfs_prop.writeValue(ctgp_offset);
            }
        }).bind(this));

        this.applyActiveProfile();

        this.tccd.dbusData.nvidiaPowerCTRLAvailable = true;
    }

    public isAvailable(): boolean {
        return this.available;
    }

    private applyActiveProfile(): void {
        this.ctgp_offset_sysfs_prop.writeValue(this.tccd.activeProfile.nvidiaPowerCTRLProfile.cTGPOffset);
    }
}