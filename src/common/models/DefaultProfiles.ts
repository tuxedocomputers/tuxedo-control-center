/*!
 * Copyright (c) 2022 TUXEDO Computers GmbH <tux@tuxedocomputers.com>
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

import { ITccProfile } from "./TccProfile";

export enum TUXEDODevice {
    IBP14G6_TUX,
    IBP14G6_TRX,
    IBP14G6_TQF,
    POLARIS1XA02,
    POLARIS1XI02,
    POLARIS1XA03,
    POLARIS1XI03,
    STELLARIS1XA03,
    STELLARIS1XI03
};

/*
 * Device specific default profiles
 */
export const deviceProfiles: Map<TUXEDODevice, ITccProfile[]> = new Map();

deviceProfiles.set(TUXEDODevice.IBP14G6_TUX, [
    {
        name: 'Default',
        description: '',
        display: {
            brightness: 100,
            useBrightness: false
        },
        cpu: {
            onlineCores: undefined,
            useMaxPerfGov: false,
            scalingMinFrequency: undefined,
            scalingMaxFrequency: undefined,
            governor: 'powersave', // unused: see CpuWorker.ts->applyCpuProfile(...)
            energyPerformancePreference: 'balance_performance',
            noTurbo: false
        },
        webcam: {
            status: true,
            useStatus: true
        },
        fan: {
            useControl: true,
            fanProfile: 'Balanced',
            minimumFanspeed: 0,
            offsetFanspeed: 0
        },
        odmProfile: { name: undefined },
        odmPowerLimits: { tdpValues: [] }
    },
    {
        name: 'Something tux',
        description: '',
        display: {
            brightness: 100,
            useBrightness: false
        },
        cpu: {
            onlineCores: undefined,
            useMaxPerfGov: false,
            scalingMinFrequency: undefined,
            scalingMaxFrequency: undefined,
            governor: 'powersave', // unused: see CpuWorker.ts->applyCpuProfile(...)
            energyPerformancePreference: 'balance_performance',
            noTurbo: false
        },
        webcam: {
            status: true,
            useStatus: true
        },
        fan: {
            useControl: true,
            fanProfile: 'Balanced',
            minimumFanspeed: 0,
            offsetFanspeed: 0
        },
        odmProfile: { name: undefined },
        odmPowerLimits: { tdpValues: [] }
    },
]);

deviceProfiles.set(TUXEDODevice.IBP14G6_TRX, [
    {
        name: 'Default',
        description: '',
        display: {
            brightness: 100,
            useBrightness: false
        },
        cpu: {
            onlineCores: undefined,
            useMaxPerfGov: false,
            scalingMinFrequency: undefined,
            scalingMaxFrequency: undefined,
            governor: 'powersave', // unused: see CpuWorker.ts->applyCpuProfile(...)
            energyPerformancePreference: 'balance_performance',
            noTurbo: false
        },
        webcam: {
            status: true,
            useStatus: true
        },
        fan: {
            useControl: true,
            fanProfile: 'Balanced',
            minimumFanspeed: 0,
            offsetFanspeed: 0
        },
        odmProfile: { name: undefined },
        odmPowerLimits: { tdpValues: [] }
    },
    {
        name: 'Something trx',
        description: '',
        display: {
            brightness: 100,
            useBrightness: false
        },
        cpu: {
            onlineCores: undefined,
            useMaxPerfGov: false,
            scalingMinFrequency: undefined,
            scalingMaxFrequency: undefined,
            governor: 'powersave', // unused: see CpuWorker.ts->applyCpuProfile(...)
            energyPerformancePreference: 'balance_performance',
            noTurbo: false
        },
        webcam: {
            status: true,
            useStatus: true
        },
        fan: {
            useControl: true,
            fanProfile: 'Balanced',
            minimumFanspeed: 0,
            offsetFanspeed: 0
        },
        odmProfile: { name: undefined },
        odmPowerLimits: { tdpValues: [] }
    },
]);

deviceProfiles.set(TUXEDODevice.POLARIS1XI03, [
    {
        name: 'Default',
        description: '',
        display: {
            brightness: 100,
            useBrightness: false
        },
        cpu: {
            onlineCores: undefined,
            useMaxPerfGov: false,
            scalingMinFrequency: undefined,
            scalingMaxFrequency: undefined,
            governor: 'powersave', // unused: see CpuWorker.ts->applyCpuProfile(...)
            energyPerformancePreference: 'balance_performance',
            noTurbo: false
        },
        webcam: {
            status: true,
            useStatus: true
        },
        fan: {
            useControl: true,
            fanProfile: 'Balanced',
            minimumFanspeed: 0,
            offsetFanspeed: 0
        },
        odmProfile: { name: undefined },
        odmPowerLimits: { tdpValues: [] }
    },
    {
        name: 'Something polaris intel gen 3',
        description: '',
        display: {
            brightness: 100,
            useBrightness: false
        },
        cpu: {
            onlineCores: undefined,
            useMaxPerfGov: false,
            scalingMinFrequency: undefined,
            scalingMaxFrequency: undefined,
            governor: 'powersave', // unused: see CpuWorker.ts->applyCpuProfile(...)
            energyPerformancePreference: 'balance_performance',
            noTurbo: false
        },
        webcam: {
            status: true,
            useStatus: true
        },
        fan: {
            useControl: true,
            fanProfile: 'Balanced',
            minimumFanspeed: 0,
            offsetFanspeed: 0
        },
        odmProfile: { name: undefined },
        odmPowerLimits: { tdpValues: [] }
    },
]);