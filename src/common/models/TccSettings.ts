
export interface ITccSettings {
    activeProfileName: string;
    lastBrightnessDisplay: number;
}

export const defaultSettings: ITccSettings = {
    activeProfileName: 'Fast and furious',
    lastBrightnessDisplay: 100
};
