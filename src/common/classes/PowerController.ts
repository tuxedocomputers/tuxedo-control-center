import { IntelRAPLController } from "./IntelRAPLController";

export class PowerController {
    private intelRAPL: IntelRAPLController;
    private RAPLPowerStatus: boolean = false;
    private currentEnergy: number;
    private lastUpdateTime: number;

    constructor(intelRAPL: IntelRAPLController) {
        this.intelRAPL = intelRAPL;
        this.RAPLPowerStatus = this.intelRAPL.getIntelRAPLEnergyAvailable();
        this.currentEnergy = 0;
        this.lastUpdateTime = Date.now();
    }

    public getCurrentPower(): number {
        if (!this.RAPLPowerStatus) return -1;
        const energyIncrement: number = this.intelRAPL.getEnergy() - this.currentEnergy;
        const delay: number = this.getDelay();
        const powerDraw: number =
            delay && this.currentEnergy > 0
                ? energyIncrement / delay / 1000000
                : -1;
        this.currentEnergy += energyIncrement;
        return powerDraw;
    }

    private getDelay(): number {
        const currentTime: number = Date.now();
        const timeDifference: number =
            this.lastUpdateTime > 0
                ? (currentTime - this.lastUpdateTime) / 1000
                : -1;
        this.lastUpdateTime = currentTime;
        return timeDifference;
    }
}
