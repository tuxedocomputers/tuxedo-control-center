export interface ITccProfile {
    name: string;
    display: ITccProfileDisplay;
    cpu: ITccProfileCpu;
    webcam: ITccProfileWebCam;
    fan: ITccProfileFanControl;
}

export class TccProfile implements ITccProfile {
    name: string;
    display: ITccProfileDisplay;
    cpu: ITccProfileCpu;
    webcam: ITccProfileWebCam;
    fan: ITccProfileFanControl;
    public constructor(init: ITccProfile) {
        this.name = init.name;
        this.display = JSON.parse(JSON.stringify(init.display));
        this.cpu = JSON.parse(JSON.stringify(init.cpu));
        this.webcam = JSON.parse(JSON.stringify(init.webcam));
        this.fan.fanProfile = init.fan.fanProfile;
    }
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
    noTurbo: boolean;
}

interface ITccProfileWebCam {
    status: boolean;
    useStatus: boolean;
}

interface ITccProfileFanControl {
    fanProfile: string;
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
            energyPerformancePreference: 'default',
            noTurbo: false
        },
        webcam: {
            status: true,
            useStatus: false
        },
        fan: {
            fanProfile: 'Balanced'
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
            energyPerformancePreference: 'performance',
            noTurbo: false
        },
        webcam: {
            status: true,
            useStatus: false
        },
        fan: {
            fanProfile: 'Cool'
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
            energyPerformancePreference: 'power',
            noTurbo: true
        },
        webcam: {
            status: true,
            useStatus: false
        },
        fan: {
            fanProfile: 'Cool'
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
            energyPerformancePreference: 'power',
            noTurbo: true
        },
        webcam: {
            status: true,
            useStatus: false
        },
        fan: {
            fanProfile: 'Quiet'
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
        energyPerformancePreference: 'default',
        noTurbo: false
    },
    webcam: {
        status: true,
        useStatus: false
    },
    fan: {
        fanProfile: 'Balanced'
    }
};
