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

export interface IGeneralCPUInfo {
    availableCores: number;
    minFreq: number;
    maxFreq: number;
    scalingAvailableFrequencies: number[];
    scalingAvailableGovernors: string[];
    energyPerformanceAvailablePreferences: string[];
    reducedAvailableFreq: number;
    boost: boolean;
  }
  
  export interface ILogicalCoreInfo {
    index: number;
    online: boolean;
    scalingCurFreq: number;
    scalingMinFreq: number;
    scalingMaxFreq: number;
    scalingDriver: string;
    energyPerformanceAvailablePreferences: string[];
    energyPerformancePreference: string;
    scalingAvailableGovernors: string[];
    scalingGovernor: string;
    cpuInfoMinFreq: number;
    cpuInfoMaxFreq: number;
    coreId: number;
    coreSiblingsList: number[];
    physicalPackageId: number;
    threadSiblingsList: number[];
  }
  
  export interface IDisplayBrightnessInfo {
    driver: string;
    brightness: number;
    maxBrightness: number;
  }
  
  export interface IPstateInfo {
    noTurbo: boolean;
  }