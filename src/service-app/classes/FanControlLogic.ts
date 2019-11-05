import { ITccFanProfile, ITccFanTableEntry } from '../../common/models/TccFanTable';

const TICK_DELAY = 1;

export class FanControlLogic {

    private currentTemperature;

    private tableMaxEntry: ITccFanTableEntry;
    private tableMinEntry: ITccFanTableEntry;

    private lastSpeed = 0;

    private tickCount = 0;

    constructor(private fanProfile: ITccFanProfile) {
        this.setFanProfile(fanProfile);
    }

    public setFanProfile(fanProfile: ITccFanProfile) {
        fanProfile.table.sort((a, b) => a.temp - b.temp);
        fanProfile.table.sort((a, b) => a.temp - b.temp);
        this.tableMinEntry = fanProfile.table[0];
        this.tableMaxEntry = fanProfile.table[fanProfile.table.length - 1];
        this.fanProfile = fanProfile;
    }

    public reportTemperature(temperatureValue: number) {
        this.tickCount = ((this.tickCount + 1) % TICK_DELAY);
        this.currentTemperature = temperatureValue;
    }

    public getSpeedPercent(): number {
        const foundEntryIndex = this.findFittingEntryIndex(this.currentTemperature);
        const foundEntry = this.fanProfile.table[foundEntryIndex];
        let chosenSpeed: number;
        if (foundEntry.speed < this.lastSpeed) {
            if (this.tickCount === 0) {
                chosenSpeed = this.lastSpeed - 1;
            } else {
                chosenSpeed = this.lastSpeed;
            }
        } else {
            chosenSpeed = foundEntry.speed;
        }
        this.lastSpeed = chosenSpeed;
        return chosenSpeed;
    }

    private findFittingEntryIndex(temperatureValue: number): number {
        if (this.currentTemperature > this.tableMaxEntry.temp) {
            return this.fanProfile.table.length - 1;
        } else if (this.currentTemperature < this.tableMinEntry.temp) {
            return 0;
        }

        const foundIndex = this.fanProfile.table.findIndex(entry => entry.temp === this.currentTemperature);
        if (foundIndex !== -1) {
            return foundIndex;
        } else {
            return this.findFittingEntryIndex(temperatureValue + 1);
        }
    }
}
