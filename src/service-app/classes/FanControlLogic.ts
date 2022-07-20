/*!
 * Copyright (c) 2019-2021 TUXEDO Computers GmbH <tux@tuxedocomputers.com>
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

export enum FAN_LOGIC { CPU, GPU }

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

const MAX_SPEED_JUMP = 2;
const SPEED_JUMP_THRESHOLD = 20;

export class FanControlLogic {

    private latestSpeedPercent;

    private tempBuffer = new ValueBuffer();

    private tableMaxEntry: ITccFanTableEntry;
    private tableMinEntry: ITccFanTableEntry;

    private lastSpeed = 0;

    private useTable: string

    /**
     * Minimum fan speed returned by logic
     */
    private _minimumFanspeed: number = 0;
    get minimumFanspeed() { return this._minimumFanspeed; }
    set minimumFanspeed(speed: number) {
        if (speed === undefined) {
            this._minimumFanspeed = 0;
        } else if (speed < 0) {
            this._minimumFanspeed = 0;
        } else if (speed > 100) {
            this._minimumFanspeed = 100;
        } else {
            this._minimumFanspeed = speed;
        }
    }

    /**
     * Number added to table value providing an offset fan table lookup
     */
    private _offsetFanspeed: number = 0;
    get offsetFanspeed() { return this._offsetFanspeed; }
    set offsetFanspeed(speed: number) {
        if (speed === undefined) {
            this._offsetFanspeed = 0;
        } else if (speed < -100) {
            this._offsetFanspeed = -100;
        } else if (speed > 100) {
            this._offsetFanspeed = 100;
        } else {
            this._offsetFanspeed = speed;
        }
    }

    constructor(private fanProfile: ITccFanProfile, type: FAN_LOGIC) {
        if (type === FAN_LOGIC.CPU) {
            this.useTable = 'tableCPU';
        } else if (type === FAN_LOGIC.GPU) {
            this.useTable = 'tableGPU';
        } else {
            throw new Error('FanControlLogic: Invalid argument');
        }
        this.setFanProfile(fanProfile);
    }

    public setFanProfile(fanProfile: ITccFanProfile) {
        fanProfile[this.useTable].sort((a, b) => a.temp - b.temp);
        this.tableMinEntry = fanProfile[this.useTable][0];
        this.tableMaxEntry = fanProfile[this.useTable][fanProfile[this.useTable].length - 1];
        this.fanProfile = fanProfile;
    }

    /**
     * Used to report temperature to the logic handler.
     *
     * @param temperatureValue New temperature sensor value in celcius
     */
    public reportTemperature(temperatureValue: number) {
        this.tempBuffer.addValue(temperatureValue);

        // Calculate filtered table speed
        let nextSpeedPercent = this.calculateSpeedPercent();

        this.latestSpeedPercent = nextSpeedPercent;
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
        const foundEntry = this.fanProfile[this.useTable][foundEntryIndex];
        
        let newSpeed = foundEntry.speed;
        
        // Alter lookup value by offsetFanspeed parameter (aka apply offset)
        const offsetDisableCondition = this.offsetFanspeed < 0 && effectiveTemperature > 75;
        if (!offsetDisableCondition) {
            newSpeed += this.offsetFanspeed;
            if (newSpeed > 100) {
                newSpeed = 100;
            } else if (newSpeed < 0) {
                newSpeed = 0;
            }
        }

        // Adjust for minimum speed parameter
        if (newSpeed < this.minimumFanspeed) {
            newSpeed = this.minimumFanspeed;
        }
        
        // Limit falling speed change
        let speedJump = newSpeed - this.lastSpeed;
        if (this.lastSpeed > SPEED_JUMP_THRESHOLD && speedJump <= -MAX_SPEED_JUMP) {
            speedJump = -MAX_SPEED_JUMP;
            newSpeed = this.lastSpeed + speedJump;
        }
        this.lastSpeed = newSpeed;
        return newSpeed;
    }

    private findFittingEntryIndex(temperatureValue: number): number {
        if (temperatureValue > this.tableMaxEntry.temp) {
            return this.fanProfile[this.useTable].length - 1;
        } else if (temperatureValue < this.tableMinEntry.temp) {
            return 0;
        }

        const foundIndex = this.fanProfile[this.useTable].findIndex(entry => entry.temp === temperatureValue);
        if (foundIndex !== -1) {
            return foundIndex;
        } else {
            return this.findFittingEntryIndex(temperatureValue + 1);
        }
    }

    public getFilteredTemp(): number {
        return this.tempBuffer.getFilteredValue();
    }

    public getFanProfile(): ITccFanProfile {
        return this.fanProfile;
    }
}
