import { Injectable } from "@angular/core";
import { UtilsService } from "./utils.service";
import * as path from "path";

@Injectable({
    providedIn: "root",
})
export class PowerStateService {
    constructor(private utils: UtilsService) {}

    public async getDGpuPowerState(): Promise<string> {
        const nvidiaBusPath = (
            await this.utils.execCmd(
                "grep -l 'DRIVER=nvidia' /sys/bus/pci/devices/*/uevent | sed 's|/uevent||'"
            )
        ).toString();

        if (nvidiaBusPath) {
            return (
                await this.utils.execCmd(
                    `cat ${path.join(nvidiaBusPath.trim(), "power_state")}`
                )
            )
                .toString()
                .trim();
        }
        return "-1";
    }
}
