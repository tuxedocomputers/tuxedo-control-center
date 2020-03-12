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
export interface ITuxedoWMIAPI {
    /**
     * Connect webcam
     * @returns True if successful, false otherwise
     */
    webcamOn(): boolean;
    /**
     * Disconnect webcam
     * @returns True if successful, false otherwise
     */
    webcamOff(): boolean;

    /**
     * Set standard auto fan control for specified fan(s)
     * @returns True if successful, false otherwise
     */
    setFanAuto(fan1: boolean, fan2: boolean, fan3: boolean, fan4: boolean): boolean;
    /**
     * Set speed of all fans as a byte value 0-255
     * @returns True if successful, false otherwise
     */
    setFanSpeedByte(speed1: number, speed2: number, speed3: number, speed4: number): boolean;
    /**
     * Get information from the specified fan 1-4
     * @returns True if successful, false otherwise
     */
    getFanInfo(fanNumber: number, fanInfo: IFanInfo): boolean;
}

export interface IFanInfo {
    speed: number;
    temp1: number;
    temp2: number;
}

export const TuxedoWMIAPI: ITuxedoWMIAPI = require('TuxedoWMIAPI');
