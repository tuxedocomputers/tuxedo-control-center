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

import {
    amdDGpuDeviceIdString,
    amdIGpuDeviceIdString,
} from "./AmdDeviceIDs";
import { intelIGpuDeviceIdString } from "./IntelDeviceIDs";
import { countLines, execCommandSync } from "./Utils";
import type { IDeviceCounts } from "src/common/models/TccGpuValues";


export class AvailabilityService {
    private iGpuAvailable: boolean = false;
    private dGpuAvailable: boolean = false;
    private intelIGpuDevices: number;
    private amdIGpuDevices: number;
    private amdDGpuDevices: number;
    private nvidiaDevices: number;

    constructor() {
        const devices: IDeviceCounts = this.getDevices();
        this.iGpuAvailable =
            devices.intelIGpuDevices === 1 || devices.amdIGpuDevices === 1;
        this.dGpuAvailable =
            devices.nvidiaDevices !== devices.amdDGpuDevices &&
            (devices.nvidiaDevices === 1 || devices.amdDGpuDevices === 1);

        this.intelIGpuDevices = devices.intelIGpuDevices;
        this.amdIGpuDevices = devices.amdIGpuDevices;
        this.amdDGpuDevices = devices.amdDGpuDevices;
        this.nvidiaDevices = devices.nvidiaDevices;
    }

    // prime-select is not reliable since it does not check hardware availability or bios settings,
    // looking for DRIVER=nvidia in /sys/bus yields no results if prime-select is in "intel" mode,
    // looking for an intel vendor id is not enough since more devices are from intel, amd iGPU
    // and dGPU both use amdgpu, /var/log/gpu-manager.log only exists in Ubuntu and does not discern
    // amd iGPU and dGPU. As a solution, looking for vendor and product IDs for active pci devices,
    // but some laptops show iGPU when bios is in dGPU mode.
    private getDevices(): IDeviceCounts {
        return {
            intelIGpuDevices: this.countDevicesMatchingPattern(
                intelIGpuDeviceIdString
            ),
            amdIGpuDevices: this.countDevicesMatchingPattern(
                amdIGpuDeviceIdString
            ),
            amdDGpuDevices: this.countDevicesMatchingPattern(
                amdDGpuDeviceIdString
            ),
            nvidiaDevices: this.countNvidiaDevices(),
        };
    }

    // using || to return a success code to avoid throwing an error in execCmdSync and : means no-op
    private countDevicesMatchingPattern(pattern: string): number {
        const grepCmd = `grep -lP '${pattern}' /sys/bus/pci/devices/*/uevent || :`;
        const output: string = execCommandSync(grepCmd);
        return countLines(output);
    }

    private countNvidiaDevices(): number {
        const nvidiaVendorId = "10DE";
        const grepCmd = `grep -lx '0x${nvidiaVendorId.toLowerCase()}' /sys/bus/pci/devices/*/vendor || :`;
        const output: string = execCommandSync(grepCmd);

        // count multiple paths as one
        // example: "0000:01:00.1" and "0000:01:00.2" belong to the device "0000:01:00"
        const distinctPaths: string[] = [
            ...new Set(
                output
                    .match(/\/sys\/bus\/pci\/devices\/([^\s]+)/g)
                    ?.map((path: string): string => {
                        const prefix: string = path.split("/")[5];
                        return prefix.substring(0, prefix.lastIndexOf("."));
                    })
            ),
        ];
        return distinctPaths?.length || 0;
    }

    public isIGpuAvailable(): boolean {
        return this.iGpuAvailable;
    }

    public isDGpuAvailable(): boolean {
        return this.dGpuAvailable;
    }

    public getIntelIGpuCount(): number {
        return this.intelIGpuDevices;
    }

    public getAmdIGpuCount(): number {
        return this.amdIGpuDevices;
    }

    public getAmdDGpuCount(): number {
        return this.amdDGpuDevices;
    }

    public getNvidiaDGpuCount(): number {
        return this.nvidiaDevices;
    }
}
