import { Injectable } from "@angular/core";
import { UtilsService } from "./utils.service";
import {
    amdIGpuDeviceIdString,
    intelIGpuDeviceIdString,
} from "src/common/classes/DeviceIDs";
import { countLines } from "src/common/classes/Utils";

@Injectable({
    providedIn: "root",
})
export class AvailabilityService {
    private iGpuAvailable: boolean = false;
    private dGpuAvailable: boolean = false;

    constructor(private utils: UtilsService) {
        // prime-select is not reliable since it does not check hardware availability or bios settings,
        // looking for DRIVER=nvidia in /sys/bus yields no results if prime-select is in "intel" mode,
        // looking for an intel vendor id is not enough since more devices are from intel, amd iGPU
        // and dGPU both use amdgpu, /var/log/gpu-manager.log only exists in Ubuntu and does not discern
        // amd iGPU and dGPU. As a solution, looking for vendor and product IDs for active pci devices,
        // but some laptops show iGPU when bios is in dGPU mode.

        const intelIGpuDevices = this.getIntelIGpuDevices();
        const amdIGpuDevices = this.getAmdIGpuDevices();
        const nvidiaDevices = this.getNvidiaDevices();

        if (intelIGpuDevices === 1 || amdIGpuDevices === 1) {
            this.iGpuAvailable = true;
        }

        // todo: dashboard does only have nvidia metrics support for now
        if (nvidiaDevices === 1) {
            this.dGpuAvailable = true;
        }
    }

    // using || to return a success code to avoid throwing an error in execCmdSync and : means no-op
    private getIntelIGpuDevices() {
        return countLines(
            this.utils.execCmdSync(
                `grep -lP '${intelIGpuDeviceIdString}' /sys/bus/pci/devices/*/uevent || :`
            )
        );
    }

    private getAmdIGpuDevices() {
        return countLines(
            this.utils.execCmdSync(
                `grep -lP '${amdIGpuDeviceIdString}' /sys/bus/pci/devices/*/uevent || :`
            )
        );
    }

    private getNvidiaDevices() {
        const nvidiaVendorId = "10DE";
        const nvidiaDevices = this.utils.execCmdSync(
            `grep -lx '0x${nvidiaVendorId.toLowerCase()}' /sys/bus/pci/devices/*/vendor || :`
        );

        // count multiple paths as one
        // example: "0000:01:00.1" and "0000:01:00.2" belong to the device "0000:01:00"
        return (
            [
                ...new Set(
                    nvidiaDevices
                        .match(/\/sys\/bus\/pci\/devices\/([^\s]+)/g)
                        ?.map((path) => {
                            const prefix = path.split("/")[5];
                            return prefix.substring(0, prefix.lastIndexOf("."));
                        })
                ),
            ]?.length || 0
        );
    }

    public getIGpuAvailable(): boolean {
        return this.iGpuAvailable;
    }

    public getDGpuAvailable(): boolean {
        return this.dGpuAvailable;
    }
}
