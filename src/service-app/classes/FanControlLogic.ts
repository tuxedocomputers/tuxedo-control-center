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
