import { ITccFanTable, ITccFanTableEntry } from '../../common/models/TccFanTable';

const TICK_DELAY = 1;

export class FanControlLogic {

    private currentTemperature;

    private tableMaxEntry: ITccFanTableEntry;
    private tableMinEntry: ITccFanTableEntry;

    private lastSpeed = 0;

    private tickCount = 0;

    constructor(private fanTable: ITccFanTable) {
        fanTable.entries.sort((a, b) => a.temp - b.temp);
        this.tableMinEntry = fanTable.entries[0];
        this.tableMaxEntry = fanTable.entries[fanTable.entries.length - 1];
    }

    public reportTemperature(temperatureValue: number) {
        this.tickCount = ((this.tickCount + 1) % TICK_DELAY);
        this.currentTemperature = temperatureValue;
    }

    public getSpeedPercent(): number {
        const foundEntryIndex = this.findFittingEntryIndex(this.currentTemperature);
        const foundEntry = this.fanTable.entries[foundEntryIndex];
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
            return this.fanTable.entries.length - 1;
        } else if (this.currentTemperature < this.tableMinEntry.temp) {
            return 0;
        }

        const foundIndex = this.fanTable.entries.findIndex(entry => entry.temp === this.currentTemperature);
        if (foundIndex !== -1) {
            return foundIndex;
        } else {
            return this.findFittingEntryIndex(temperatureValue + 1);
        }
    }
}
