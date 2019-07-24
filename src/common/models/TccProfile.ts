export interface ITccProfile {
    name: string;
    screenBrightness: number;
    keyboardBrightness: number;
}

export const defaultProfiles: ITccProfile[] = [
    {
        name: 'Fast and furious',
        screenBrightness: 100,
        keyboardBrightness: 100
    },
    {
        name: 'Cool and breezy',
        screenBrightness: 50,
        keyboardBrightness: 0
    }
];
