/*!
 * Copyright (c) 2019-2020 TUXEDO Computers GmbH <tux@tuxedocomputers.com>
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
     * Gets information about the tuxedo-cc-wmi module
     *
     * @param info Structure to fill with data
     * @returns True if successful, false otherwise
     */
    getModuleInfo(info: ModuleInfo): boolean;

    /**
     * Check the availability of tuxedo WMI, that is, if it is possible
     * to open the device file
     * @returns True if it's available, false otherwise
     */
    wmiAvailable(): boolean;

    /**
     * Enable/disable manual mode set (needed on some devices)
     */
    setEnableModeSet(enabled: boolean): void;

    /**
     * Get number of controllable fan interfaces,
     * not necessarily the number of actual fans
     */
    getNumberFans(): number;

    /**
     * Set all fans to default mode
     */
    setFansAuto(): void;
    /**
     * Set speed of the specified fan 0-100
     */
    setFanSpeedPercent(fanNumber: number, fanSpeedPercent: number): void;
    /**
     * Get speed from the specified fan
     * @returns Current set speed 0-100
     */
    getFanSpeedPercent(fanNumber: number): number;
    /**
     * Get temperature of the sensor for the specified fan
     * @returns Temperature in celcius
     */
    getFanTemperature(fanNumber: number): number;
    /**
     * Set webcam switch
     */
    setWebcamStatus(webcamOn: boolean);
    /**
     * Get webcam switch status
     * @returns True if on, false if off
     */
    getWebcamStatus(): boolean;
}


export class ModuleInfo {
    version = '';
}

export const TuxedoWMIAPI: ITuxedoWMIAPI = require('TuxedoWMIAPI');
