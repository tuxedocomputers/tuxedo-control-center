import { Injectable } from "@angular/core";

@Injectable({
    providedIn: "root",
})
export class PowerStateService {
    private busPath: string;

    constructor(
    ) {
        if (window.power.getNvidiaDGpuCount() === 1) {
            this.busPath = this.getBusPath("nvidia");
        } else if (window.power.getAmdDGpuCount() === 1) {
            this.busPath = this.getBusPath("amd");
        }
    }

    private getBusPath(driver: string): string {
        return window.power.getBusPath(driver);
    }

    public async getDGpuPowerState(): Promise<string> {
        return window.power.getDGpuPowerState(this.busPath);
    }
}
