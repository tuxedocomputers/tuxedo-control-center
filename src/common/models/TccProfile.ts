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
export interface ITccProfile {
    name: string;
    description: string;
    display: ITccProfileDisplay;
    cpu: ITccProfileCpu;
    webcam: ITccProfileWebCam;
    fan: ITccProfileFanControl;
    odmProfile: ITccODMProfile;
    odmPowerLimits: ITccODMPowerLimits;
}

export class TccProfile implements ITccProfile {
    name: string;
    description: string;
    display: ITccProfileDisplay;
    cpu: ITccProfileCpu;
    webcam: ITccProfileWebCam;
    fan: ITccProfileFanControl;
    odmProfile: ITccODMProfile;
    odmPowerLimits: ITccODMPowerLimits;
    public constructor(init: ITccProfile) {
        this.name = init.name;
        this.display = JSON.parse(JSON.stringify(init.display));
        this.cpu = JSON.parse(JSON.stringify(init.cpu));
        this.webcam = JSON.parse(JSON.stringify(init.webcam));
        this.fan = JSON.parse(JSON.stringify(init.fan));
        this.odmProfile = JSON.parse(JSON.stringify(init.odmProfile));
        this.odmPowerLimits = JSON.parse(JSON.stringify(init.odmPowerLimits));
    }
}

interface ITccProfileDisplay {
    brightness: number;
    useBrightness: boolean;
}

interface ITccProfileCpu {
    onlineCores: number;
    useMaxPerfGov: boolean;
    scalingMinFrequency: number;
    scalingMaxFrequency: number;
    governor: string; // unused: see CpuWorker.ts->applyCpuProfile(...)
    energyPerformancePreference: string;
    noTurbo: boolean;
}

interface ITccProfileWebCam {
    status: boolean;
    useStatus: boolean;
}

interface ITccProfileFanControl {
    useControl: boolean;
    fanProfile: string;
    minimumFanspeed: number;
    offsetFanspeed: number;
}

interface ITccODMProfile {
    name: string
}

interface ITccODMPowerLimits {
    tdpValues: number[]
}

export const defaultProfiles: ITccProfile[] = [
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
        name: 'Cool and breezy',
        description: '',
        display: {
            brightness: 50,
            useBrightness: false
        },
        cpu: {
            onlineCores: undefined,
            useMaxPerfGov: false,
            scalingMinFrequency: undefined,
            scalingMaxFrequency: -1,
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
        odmPowerLimits: { tdpValues: [] }
    },
    {
        name: 'Powersave extreme',
        description: '',
        display: {
            brightness: 60,
            useBrightness: true
        },
        cpu: {
            onlineCores: undefined,
            useMaxPerfGov: false,
            scalingMinFrequency: 0,
            scalingMaxFrequency: 0,
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
        odmPowerLimits: { tdpValues: [] }
    }
];

export const defaultCustomProfile: ITccProfile = {
    name: 'Default custom profile',
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
};

export const defaultCustomProfileXP1508UHD: ITccProfile = {
    name: 'Custom XP1508 UHD',
    description: '',
    display: {
        brightness: 100,
        useBrightness: false
    },
    cpu: {
        onlineCores: undefined,
        useMaxPerfGov: false,
        scalingMinFrequency: undefined,
        scalingMaxFrequency: 1200000,
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
};

export const profileImageMap = new Map<string, string>();
profileImageMap.set(defaultProfiles[0].name, 'icon_profile_default.svg');
profileImageMap.set(defaultProfiles[1].name, 'icon_profile_breezy.svg');
profileImageMap.set(defaultProfiles[2].name, 'icon_profile_energysaver.svg');
profileImageMap.set('custom', 'icon_profile_custom.svg');
