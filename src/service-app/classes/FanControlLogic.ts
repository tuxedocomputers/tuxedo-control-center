/*!
 * Copyright (c) 2019 TUXEDO Computers GmbH <tux@tuxedocomputers.com>
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
import { ITccFanProfile, ITccFanTableEntry } from '../../common/models/TccFanTable';

class ValueBuffer {
    private bufferData: Array<number>;
    private bufferMaxSize = 13; // Buffer max size

    constructor() {
        this.bufferData = new Array();
    }

    public addValue(value: number): void {
        this.bufferData.push(value);
        while (this.bufferData.length > this.bufferMaxSize) {
            this.bufferData.shift();
        }
    }

    public getFilteredValue(): number {
        // Number of values to reduce to, to take average from
        // Note (bufferMaxSize - usedSize) / 2 values are ignored on either side
        const usedSize = 7;

        const copy = Array.from(this.bufferData);
        copy.sort((a, b) => a - b);

        while (copy.length >= usedSize + 2) {
            copy.shift();
            copy.pop();
        }

        // Calculate average from rest of array
        const averageValue = Math.round(copy.reduce((accVal, currentValue) => accVal + currentValue) / copy.length);
        return averageValue;
    }

    public getBufferCopy(): Array<number> {
        return Array.from(this.bufferData);
    }
}

const TICK_DELAY = 1;

export class FanControlLogic {

    private latestSpeedPercent;

    private tempBuffer = new ValueBuffer();

    private tableMaxEntry: ITccFanTableEntry;
    private tableMinEntry: ITccFanTableEntry;

    private lastSpeed = 0;

    constructor(private fanProfile: ITccFanProfile) {
        this.setFanProfile(fanProfile);
    }

    public setFanProfile(fanProfile: ITccFanProfile) {
        fanProfile.table.sort((a, b) => a.temp - b.temp);
        this.tableMinEntry = fanProfile.table[0];
        this.tableMaxEntry = fanProfile.table[fanProfile.table.length - 1];
        this.fanProfile = fanProfile;
    }

    /**
     * Used to report temperature to the logic handler.
     *
     * @param temperatureValue New temperature sensor value in celcius
     */
    public reportTemperature(temperatureValue: number) {
        this.tempBuffer.addValue(temperatureValue);
        this.latestSpeedPercent = this.calculateSpeedPercent();
    }

    /**
     * Get the speed in percent decided by the logic handler
     */
    public getSpeedPercent(): number {
        return this.latestSpeedPercent;
    }

    private calculateSpeedPercent(): number {
        const effectiveTemperature = this.tempBuffer.getFilteredValue();
        const foundEntryIndex = this.findFittingEntryIndex(effectiveTemperature);
        const foundEntry = this.fanProfile.table[foundEntryIndex];
        let newSpeed = foundEntry.speed;
        let speedJump = newSpeed - this.lastSpeed;
        if (speedJump <= -2) {
            speedJump = -2;
            newSpeed = this.lastSpeed + speedJump;
        }
        this.lastSpeed = newSpeed;
        return newSpeed;
    }

    private findFittingEntryIndex(temperatureValue: number): number {
        if (temperatureValue > this.tableMaxEntry.temp) {
            return this.fanProfile.table.length - 1;
        } else if (temperatureValue < this.tableMinEntry.temp) {
            return 0;
        }

        const foundIndex = this.fanProfile.table.findIndex(entry => entry.temp === temperatureValue);
        if (foundIndex !== -1) {
            return foundIndex;
        } else {
            return this.findFittingEntryIndex(temperatureValue + 1);
        }
    }

    public getFilteredTemp(): number {
        return this.tempBuffer.getFilteredValue();
    }
}
