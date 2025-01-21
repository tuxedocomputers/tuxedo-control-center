/*!
 * Copyright (c) 2019-2025 TUXEDO Computers GmbH <tux@tuxedocomputers.com>
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

export interface IDBusFanData {
    cpu: FanData;
    gpu1: FanData;
    gpu2: FanData;
  }

export class dbusVariant<T>
{
    public signature: string;
    public value: T;
    constructor(signature: string, value: T)
    {
        this.signature = signature;
        this.value = value;
    }
}

/**
 * Structure for fan data
 */
export class FanData {
    public speed: TimeData;
    public temp: TimeData;
    constructor(timestamp = -1, speed = -1, temp = -1)
    {
        this.speed = new TimeData(timestamp, speed);
        this.temp = new TimeData(timestamp, temp);
    }
}


/**
 * Structure for timestamped data
 */
export class TimeData {
    public timestamp: dbusVariant<number>;
    public data: number;
    constructor(timestampNumber: number, data:number) {
        this.timestamp = new dbusVariant('x', timestampNumber);
        this.data = data;
    }

}



