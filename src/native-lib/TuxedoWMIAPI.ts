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
     * Set standard auto fan control for specified fan
     * @returns True if successful, false otherwise
     */
    setFanAuto(fanNumber: number): boolean;
    /**
     * Set speed of specified fan in percent
     * @returns True if successful, false otherwise
     */
    setFanSpeedPercent(fanNumber: number, setFanSpeedPercent: number): boolean;
    /**
     * Get speed of specified fan in percent
     * @returns The percentage or -1 on error
     */
    getFanSpeedPercent(fanNumber: number): number;
    /**
     * Get temperature of sensor for specified fan
     * @returns Temperature in celcius or -1 on error
     */
    getFanTemperature(fanNumber: number): number;
}

export const TuxedoWMIAPI: ITuxedoWMIAPI = require('TuxedoWMIAPI');
