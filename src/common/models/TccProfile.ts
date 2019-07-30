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
    frequency: number;
    governor: string;
    energyPerformancePreference: string;
}

export const defaultProfiles: ITccProfile[] = [
    {
        name: 'Fast and furious',
        display: {
            brightness: 100,
            useBrightness: false
        },
        cpu: {
            onlineCores: undefined,
            frequency: undefined,
            governor: undefined,
            energyPerformancePreference: undefined
        }
    },
    {
        name: 'Cool and breezy',
        display: {
            brightness: 100,
            useBrightness: false
        },
        cpu: {
            onlineCores: undefined,
            frequency: 1000000,
            governor: undefined,
            energyPerformancePreference: undefined
        }
    }
];
