/*!
 * Copyright (c) 2022-2023 TUXEDO Computers GmbH <tux@tuxedocomputers.com>
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
import { customFanPreset } from "./TccFanTable";

export enum LegacyDefaultProfileIDs {
    Default = '__legacy_default__',
    CoolAndBreezy = '__legacy_cool_and_breezy__',
    PowersaveExtreme = '__legacy_powersave_extreme__',
}

export enum DefaultProfileIDs {
    MaxEnergySave = '__profile_max_energy_save__',
    Quiet = '__profile_silent__',
    Office = '__office__',
    HighPerformance = '__high_performance__',
}

export const defaultCustomProfileID = '__default_custom_profile__';
export const defaultMobileCustomProfileID = '__default_mobile_custom_profile__';

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
        useBrightness: true,
        refreshRate: 60,
        useRefRate: false,
        xResolution: 1920,
        yResolution: 1080,
        useResolution: false
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
        maximumFanspeed: 100,
        offsetFanspeed: 0,
        customFanCurve: customFanPreset,
    },
    odmProfile: { name: 'power_save' },
    odmPowerLimits: { tdpValues: [5, 10, 15] },
    nvidiaPowerCTRLProfile: { cTGPOffset: 0 }
};

const silent: ITccProfile = {
    id: DefaultProfileIDs.Quiet,
    name: DefaultProfileIDs.Quiet,
    description: '',
    display: {
        brightness: 50,
        useBrightness: true,
        refreshRate: -1,
        useRefRate: false,
        xResolution: -1,
        yResolution: -1,
        useResolution: false
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
        maximumFanspeed: 100,
        offsetFanspeed: 0,
        customFanCurve: customFanPreset,
    },
    odmProfile: { name: 'power_save' },
    odmPowerLimits: { tdpValues: [10, 15, 25] },
    nvidiaPowerCTRLProfile: { cTGPOffset: 0 }
};

const office: ITccProfile = {
    id: DefaultProfileIDs.Office,
    name: DefaultProfileIDs.Office,
    description: '',
    display: {
        brightness: 60,
        useBrightness: true,
        refreshRate: -1,
        useRefRate: false,
        xResolution: -1,
        yResolution: -1,
        useResolution: false
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
        maximumFanspeed: 100,
        offsetFanspeed: 0,
        customFanCurve: customFanPreset,
    },
    odmProfile: { name: 'enthusiast' },
    odmPowerLimits: { tdpValues: [25, 35, 35] },
    nvidiaPowerCTRLProfile: { cTGPOffset: 0 }
};

const highPerformance: ITccProfile = {
    id: DefaultProfileIDs.HighPerformance,
    name: DefaultProfileIDs.HighPerformance,
    description: '',
    display: {
        brightness: 60,
        useBrightness: true,
        refreshRate: -1,
        useRefRate: false,
        xResolution: -1,
        yResolution: -1,
        useResolution: false
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
        maximumFanspeed: 100,
        offsetFanspeed: 0,
        customFanCurve: customFanPreset,
    },
    odmProfile: { name: 'overboost' },
    odmPowerLimits: { tdpValues: [60, 60, 70] },
    nvidiaPowerCTRLProfile: { cTGPOffset: 0 }
};

export const defaultCustomProfile: ITccProfile = {
    id: defaultCustomProfileID,
    name: 'TUXEDO Defaults',
    description: 'Edit profile to change behaviour',
    display: {
        brightness: 100,
        useBrightness: false,
        refreshRate: -1,
        useRefRate: false,
        xResolution: -1,
        yResolution: -1,
        useResolution: false
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
        maximumFanspeed: 100,
        offsetFanspeed: 0,
        customFanCurve: customFanPreset,
    },
    odmProfile: { name: undefined },
    odmPowerLimits: { tdpValues: [] },
    nvidiaPowerCTRLProfile: { cTGPOffset: 0 }
};

export const defaultMobileCustomProfileTDP: ITccProfile = {
    id: defaultMobileCustomProfileID,
    name: 'TUXEDO Mobile Default',
    description: 'Edit profile to change behaviour',
    display: {
        brightness: 100,
        useBrightness: false,
        refreshRate: -1,
        useRefRate: false,
        xResolution: -1,
        yResolution: -1,
        useResolution: false
    },
    cpu: {
        onlineCores: undefined,
        useMaxPerfGov: false,
        scalingMinFrequency: undefined,
        scalingMaxFrequency: 3500000,
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
        maximumFanspeed: 100,
        offsetFanspeed: 0,
        customFanCurve: customFanPreset,
    },
    odmProfile: { name: undefined },
    odmPowerLimits: { tdpValues: [15, 25, 50] },
    nvidiaPowerCTRLProfile: { cTGPOffset: 0 }
};

export const defaultMobileCustomProfileCl: ITccProfile = {
    id: defaultMobileCustomProfileID,
    name: 'TUXEDO Mobile Default',
    description: 'Edit profile to change behaviour',
    display: {
        brightness: 100,
        useBrightness: false,
        refreshRate: -1,
        useRefRate: false,
        xResolution: -1,
        yResolution: -1,
        useResolution: false
    },
    cpu: {
        onlineCores: undefined,
        useMaxPerfGov: false,
        scalingMinFrequency: undefined,
        scalingMaxFrequency: 3500000,
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
        maximumFanspeed: 100,
        offsetFanspeed: 0,
        customFanCurve: customFanPreset,
        
    },
    odmProfile: { name: undefined },
    odmPowerLimits: { tdpValues: [] },
    nvidiaPowerCTRLProfile: { cTGPOffset: 0 }
};

const highPerformance25WcTGP: ITccProfile = {
    id: DefaultProfileIDs.HighPerformance,
    name: DefaultProfileIDs.HighPerformance,
    description: '',
    display: {
        brightness: 60,
        useBrightness: true,
        refreshRate: -1,
        useRefRate: false,
        xResolution: -1,
        yResolution: -1,
        useResolution: false
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
        maximumFanspeed: 100,
        offsetFanspeed: 0,
        customFanCurve: customFanPreset,
    },
    odmProfile: { name: 'overboost' },
    odmPowerLimits: { tdpValues: [60, 60, 70] },
    nvidiaPowerCTRLProfile: { cTGPOffset: 25 }
};

export const defaultCustomProfile25WcTGP: ITccProfile = {
    id: defaultCustomProfileID,
    name: 'TUXEDO Defaults',
    description: 'Edit profile to change behaviour',
    display: {
        brightness: 100,
        useBrightness: false,
        refreshRate: -1,
        useRefRate: false,
        xResolution: -1,
        yResolution: -1,
        useResolution: false
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
        maximumFanspeed: 100,
        offsetFanspeed: 0,
        customFanCurve: customFanPreset,
    },
    odmProfile: { name: undefined },
    odmPowerLimits: { tdpValues: [] },
    nvidiaPowerCTRLProfile: { cTGPOffset: 25 }
};

export enum TUXEDODevice {
    IBP17G6,
    PULSE1403,
    PULSE1404,
    IBP14G6_TUX,
    IBP14G6_TRX,
    IBP14G6_TQF,
    IBP14G7_AQF_ARX,
    IBPG8,
    IBPG10AMD,
    PULSE1502,
    AURA14G3,
    AURA15G3,
    POLARIS1XA02,
    POLARIS1XI02,
    POLARIS1XA03,
    POLARIS1XI03,
    POLARIS1XA05,
    STELLARIS1XA03,
    STELLARIS1XI03,
    STELLARIS1XI04,
    STEPOL1XA04,
    STELLARIS1XI05,
    STELLARIS1XA05,
    STELLARIS16I06,
    STELLARIS17I06,
    STELLSL15A06,
    STELLSL15I06,
    STELLARIS16A07,
    STELLARIS16I07,
    SIRIUS1601,
    SIRIUS1602,
};

/*
 * Device specific default profiles
 */
export const deviceProfiles: Map<TUXEDODevice, ITccProfile[]> = new Map();

deviceProfiles.set(TUXEDODevice.IBP14G6_TUX, [ maxEnergySave, silent, office ]);
deviceProfiles.set(TUXEDODevice.IBP14G6_TRX, [ maxEnergySave, silent, office ]);
deviceProfiles.set(TUXEDODevice.IBP14G6_TQF, [ maxEnergySave, silent, office ]);
deviceProfiles.set(TUXEDODevice.IBP14G7_AQF_ARX, [ maxEnergySave, silent, office ]);
deviceProfiles.set(TUXEDODevice.IBPG8, [ maxEnergySave, silent, office ]);

deviceProfiles.set(TUXEDODevice.PULSE1502, [ maxEnergySave, silent, office ]);

deviceProfiles.set(TUXEDODevice.POLARIS1XI02, [ maxEnergySave, silent, office, highPerformance ]);
deviceProfiles.set(TUXEDODevice.POLARIS1XI03, [ maxEnergySave, silent, office, highPerformance ]);
deviceProfiles.set(TUXEDODevice.POLARIS1XA02, [ maxEnergySave, silent, office, highPerformance25WcTGP ]);
deviceProfiles.set(TUXEDODevice.POLARIS1XA03, [ maxEnergySave, silent, office, highPerformance25WcTGP ]);
deviceProfiles.set(TUXEDODevice.POLARIS1XA05, [ maxEnergySave, silent, office, highPerformance ]);

deviceProfiles.set(TUXEDODevice.STELLARIS1XI03, [ maxEnergySave, silent, office, highPerformance ]);
deviceProfiles.set(TUXEDODevice.STELLARIS1XI04, [ maxEnergySave, silent, office, highPerformance ]);
deviceProfiles.set(TUXEDODevice.STELLARIS1XI05, [ maxEnergySave, silent, office, highPerformance ]);

deviceProfiles.set(TUXEDODevice.STELLARIS1XA03, [ maxEnergySave, silent, office, highPerformance ]);
deviceProfiles.set(TUXEDODevice.STEPOL1XA04, [ maxEnergySave, silent, office, highPerformance ]);
deviceProfiles.set(TUXEDODevice.STELLARIS1XA05, [ maxEnergySave, silent, office, highPerformance ]);

deviceProfiles.set(TUXEDODevice.STELLARIS16I06, [ maxEnergySave, silent, office, highPerformance ]);
deviceProfiles.set(TUXEDODevice.STELLARIS17I06, [ maxEnergySave, silent, office, highPerformance ]);

export const deviceCustomProfiles: Map<TUXEDODevice, ITccProfile[]> = new Map();

// Devices not listed here default to [ defaultCustomProfile ].
// The first entry is used as the skeleton for new profiles created by the user.
deviceCustomProfiles.set(TUXEDODevice.IBPG8, [ defaultCustomProfile, defaultMobileCustomProfileTDP ]);
deviceCustomProfiles.set(TUXEDODevice.AURA14G3, [ defaultCustomProfile, defaultMobileCustomProfileCl ]);
deviceCustomProfiles.set(TUXEDODevice.AURA15G3, [ defaultCustomProfile, defaultMobileCustomProfileCl ]);
deviceCustomProfiles.set(TUXEDODevice.POLARIS1XA02, [ defaultCustomProfile25WcTGP ]);
deviceCustomProfiles.set(TUXEDODevice.POLARIS1XA03, [ defaultCustomProfile25WcTGP ]);
deviceCustomProfiles.set(TUXEDODevice.STELLARIS1XA03, [ defaultCustomProfile25WcTGP ]);
