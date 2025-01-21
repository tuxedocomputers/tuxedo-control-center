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

export interface IiGpuInfo {
    temp: number;
    coreFrequency: number;
    maxCoreFrequency: number;
    powerDraw: number;
    vendor: string;
}

export interface IdGpuInfo {
    coreFrequency: number;
    maxCoreFrequency: number;
    powerDraw: number;
    maxPowerLimit: number;
    enforcedPowerLimit: number;
    d0MetricsUsage?: boolean;
}

export interface IDeviceCounts {
    intelIGpuDevices: number;
    amdIGpuDevices: number;
    amdDGpuDevices: number;
    nvidiaDevices: number;
}
