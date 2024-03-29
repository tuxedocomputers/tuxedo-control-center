import { Injectable } from "@angular/core";
import { AvailabilityService } from "src/common/classes/availability.service";
import * as path from "path";
import { amdDGpuDeviceIdString } from "src/common/classes/DeviceIDs";
import { UtilsService } from "./utils.service";

@Injectable({
    providedIn: "root",
})
export class PowerStateService {
    private busPath: string;

    constructor(
        public availability: AvailabilityService,
        private utils: UtilsService
    ) {
        if (this.availability.getNvidiaDGpuCount() === 1) {
            this.busPath = this.getBusPath("nvidia");
        } else if (this.availability.getAmdDGpuCount() === 1) {
            this.busPath = this.getBusPath("amd");
        }
    }

    private getBusPath(driver: string): string {
        let devicePattern: string;

        if (driver === "nvidia") {
            devicePattern = "DRIVER=nvidia";
        } else if (driver === "amd") {
            devicePattern = "PCI_ID=" + amdDGpuDeviceIdString;
        }

        if (devicePattern) {
            const grepCmd = `grep -lx '${devicePattern}' /sys/bus/pci/devices/*/uevent | sed 's|/uevent||'`;
            return this.utils.execCmdSync(grepCmd).trim();
        }
        return undefined;
    }

    public async getDGpuPowerState(): Promise<string> {
        if (this.busPath) {
            try {
                const powerStatePath = path.join(this.busPath, "power_state");
                const powerState = await this.utils.readTextFile(
                    powerStatePath
                );

                return powerState.trim();
            } catch (err) {
                console.error("Failed to get power state of GPU: ", err);
            }
        }

        return "-1";
    }
}
