export interface ITccProfile {
    name: string;
    display: ITccProfileDisplay;
    cpu: ITccProfileCpu;
}

interface ITccProfileDisplay {
    brightness: number;
    useBrightness: boolean;
}

interface ITccProfileCpu {
    onlineCores: number;
    scalingMinFrequency: number;
    scalingMaxFrequency: number;
    governor: string;
    energyPerformancePreference: string;
}

export const defaultProfiles: ITccProfile[] = [
    {
        name: 'Default',
        display: {
            brightness: 100,
            useBrightness: false
        },
        cpu: {
            onlineCores: undefined,
            scalingMinFrequency: undefined,
            scalingMaxFrequency: undefined,
            governor: 'powersave',
            energyPerformancePreference: 'default'
        }
    },
    {
        name: 'Fast and furious',
        display: {
            brightness: 100,
            useBrightness: true
        },
        cpu: {
            onlineCores: undefined,
            scalingMinFrequency: 2000000,
            scalingMaxFrequency: undefined,
            governor: 'performance',
            energyPerformancePreference: 'performance'
        }
    },
    {
        name: 'Cool and breezy',
        display: {
            brightness: 50,
            useBrightness: true
        },
        cpu: {
            onlineCores: 2,
            scalingMinFrequency: 800000,
            scalingMaxFrequency: 1000000,
            governor: 'powersave',
            energyPerformancePreference: 'power'
        }
    },
    {
        name: 'All cores powersave',
        display: {
            brightness: 100,
            useBrightness: false
        },
        cpu: {
            onlineCores: undefined,
            scalingMinFrequency: undefined,
            scalingMaxFrequency: undefined,
            governor: 'powersave',
            energyPerformancePreference: 'power'
        }
    }
];

export const defaultCustomProfile: ITccProfile = {
    name: 'Default custom profile',
    display: {
        brightness: 100,
        useBrightness: false
    },
    cpu: {
        onlineCores: undefined,
        scalingMinFrequency: undefined,
        scalingMaxFrequency: undefined,
        governor: 'powersave',
        energyPerformancePreference: 'default'
    }
};
