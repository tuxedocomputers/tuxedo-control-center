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

import { ITccProfile } from './TccProfile';

export enum DefaultProfileIDs {
    MaxEnergySave = '__profile_max_energy_save__',
    Quiet = '__profile_silent__',
    Office = '__office__',
    HighPerformance = '__high_performance__',
}

export interface IProfileTextMappings {
    name: string;
    description: string;
}

const maxEnergySave: ITccProfile = {
    id: DefaultProfileIDs.MaxEnergySave,
    name: DefaultProfileIDs.MaxEnergySave,
    description: '',
    display: {
        brightness: 40,
        useBrightness: true
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
        fanProfile: 'Silent',
        minimumFanspeed: 0,
        offsetFanspeed: 0
    },
    odmProfile: { name: undefined },
    odmPowerLimits: { tdpValues: [5, 10, 15] }
};

const silent: ITccProfile = {
    id: DefaultProfileIDs.Quiet,
    name: DefaultProfileIDs.Quiet,
    description: '',
    display: {
        brightness: 50,
        useBrightness: true
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
        fanProfile: 'Silent',
        minimumFanspeed: 0,
        offsetFanspeed: 0
    },
    odmProfile: { name: undefined },
    odmPowerLimits: { tdpValues: [10, 15, 25] }
};

const office: ITccProfile = {
    id: DefaultProfileIDs.Office,
    name: DefaultProfileIDs.Office,
    description: '',
    display: {
        brightness: 60,
        useBrightness: true
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
        fanProfile: 'Quiet',
        minimumFanspeed: 0,
        offsetFanspeed: 0
    },
    odmProfile: { name: undefined },
    odmPowerLimits: { tdpValues: [25, 35, 35] }
};

const highPerformance: ITccProfile = {
    id: DefaultProfileIDs.HighPerformance,
    name: DefaultProfileIDs.HighPerformance,
    description: '',
    display: {
        brightness: 60,
        useBrightness: true
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
    odmPowerLimits: { tdpValues: [60, 60, 70] }
};

export enum TUXEDODevice {
    IBP14G6_TUX,
    IBP14G6_TRX,
    IBP14G6_TQF,
    POLARIS1XA02,
    POLARIS1XI02,
    POLARIS1XA03,
    POLARIS1XI03,
    STELLARIS1XA03,
    STELLARIS1XI03,
    STELLARIS1XI04
};

/*
 * Device specific default profiles
 */
export const deviceProfiles: Map<TUXEDODevice, ITccProfile[]> = new Map();

deviceProfiles.set(TUXEDODevice.IBP14G6_TUX, [ maxEnergySave, silent, office ]);
deviceProfiles.set(TUXEDODevice.IBP14G6_TRX, [ maxEnergySave, silent, office ]);
deviceProfiles.set(TUXEDODevice.IBP14G6_TQF, [ maxEnergySave, silent, office ]);

deviceProfiles.set(TUXEDODevice.POLARIS1XI02, [ maxEnergySave, silent, office, highPerformance ]);
deviceProfiles.set(TUXEDODevice.POLARIS1XI03, [ maxEnergySave, silent, office, highPerformance ]);
deviceProfiles.set(TUXEDODevice.POLARIS1XA02, [ maxEnergySave, silent, office, highPerformance ]);
deviceProfiles.set(TUXEDODevice.POLARIS1XA03, [ maxEnergySave, silent, office, highPerformance ]);

deviceProfiles.set(TUXEDODevice.STELLARIS1XI03, [ maxEnergySave, silent, office, highPerformance ]);
deviceProfiles.set(TUXEDODevice.STELLARIS1XI04, [ maxEnergySave, silent, office, highPerformance ]);

deviceProfiles.set(TUXEDODevice.STELLARIS1XA03, [ maxEnergySave, silent, office, highPerformance ]);