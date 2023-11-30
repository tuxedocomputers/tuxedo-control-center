import { Injectable } from "@angular/core";

@Injectable({
    providedIn: "root",
})
export class PowerStateService {
    getDGpuPowerState()
    {
        return window.power.getDGpuPowerState();
    }   
}
