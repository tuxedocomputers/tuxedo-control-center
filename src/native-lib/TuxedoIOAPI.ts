/*!
 * Copyright (c) 2019-2022 TUXEDO Computers GmbH <tux@tuxedocomputers.com>
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
export interface ITuxedoIOAPI {
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
     * @returns True if call succeeded, false otherwise
     */
    setEnableModeSet(enabled: boolean): boolean;

    /**
     * Get number of controllable fan interfaces,
     * not necessarily the number of actual fans
     */
    getNumberFans(): number;

    /**
     * Set all fans to default mode
     */
    setFansAuto(): boolean;
    /**
     * Set speed of the specified fan 0-100
     * @returns True if call succeeded, false otherwise
     */
    setFanSpeedPercent(fanNumber: number, fanSpeedPercent: number): boolean;
    /**
     * Get speed from the specified fan
     * @returns Current set speed 0-100
     */
    getFanSpeedPercent(fanNumber: number, fanSpeedPercent: ObjWrapper<number>): boolean;
    /**
     * Get temperature of the sensor for the specified fan
     * @returns True if call succeeded, false otherwise
     */
    getFanTemperature(fanNumber: number, fanTemperatureCelcius: ObjWrapper<number>): boolean;
    /**
     * Set webcam switch
     * @returns True if call succeeded, false otherwise
     */
    setWebcamStatus(webcamOn: boolean): boolean;
    /**
     * Get webcam switch status
     * @returns True if call succeeded, false otherwise
     */
    getWebcamStatus(status: ObjWrapper<boolean>): boolean;
    /**
     * Get names of output ports
     * @returns Array of output port names
     */
     getOutputPorts(): Array<Array<string>>;
    /**
     *  Get list of available ODM performance profiles
     *  @returns True if call succeeded, false otherwise
     */
    getAvailableODMPerformanceProfiles(profiles: ObjWrapper<string[]>): boolean;
    /**
     *  Set active performance profile (from valid list)
     *  @returns True if call succeeded, false otherwise
     */
    setODMPerformanceProfile(performanceProfile: string): boolean;
    /**
     *  Get the default performance profile name
     *  @returns True if call succeeded, false otherwise
     */
    getDefaultODMPerformanceProfile(profileName: ObjWrapper<string>): boolean;
    /**
     *  Get TDP info array of available configurable options
     *  @returns True if call succeeded, false otherwise
     */
    getTDPInfo(tdpInfo: TDPInfo[]): boolean;
    /**
     *  Set TDP values according to specified array. Numbers need to be
     *  in range as listed by a call to TDPInfo
     *  @returns True if call succeeded, false otherwise
     */
    setTDPValues(tdpValues: Number[]): boolean;
}


export class ModuleInfo {
    version = '';
    activeInterface = '';
}

export class TDPInfo {
    min: number;
    max: number;
    current: number;
    descriptor: string;
}

export class ObjWrapper<T> {
    value: T;
}

export const TuxedoIOAPI: ITuxedoIOAPI = require('TuxedoIOAPI');
