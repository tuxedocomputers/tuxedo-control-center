import { ITccFanTable, ITccFanTableEntry } from 'src/common/models/TccFanTable';

const TICK_DELAY = 5;

export class FanControlLogic {

    private currentTemperature;

    private tableMaxEntry: ITccFanTableEntry;
    private tableMinEntry: ITccFanTableEntry;

    private lastEntryIndex = 0;

    private tickCount: number = 0;

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
        let chosenEntryIndex: number;
        if (foundEntryIndex < this.lastEntryIndex) {
            if (this.tickCount === 0) {
                chosenEntryIndex = this.lastEntryIndex - 1;
            } else {
                chosenEntryIndex = this.lastEntryIndex;
            }
        } else {
            chosenEntryIndex = foundEntryIndex;
        }
        this.lastEntryIndex = chosenEntryIndex;
        return this.fanTable.entries[chosenEntryIndex].speed;
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
