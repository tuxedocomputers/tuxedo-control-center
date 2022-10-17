import { LegacyDefaultProfileIDs } from "../DefaultProfiles";
import { ITccProfile } from "../TccProfile";

export const defaultProfiles: ITccProfile[] = [
    {
        id: LegacyDefaultProfileIDs.Default,
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
        id: LegacyDefaultProfileIDs.CoolAndBreezy,
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
        id: LegacyDefaultProfileIDs.PowersaveExtreme,
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
    id: '__default_custom_profile__',
    name: 'TUXEDO Defaults',
    description: 'Edit profile to change behaviour',
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
    id: 'Custom XP1508 UHD',
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
