export enum ProfileStates {
    AC = 'power_ac',
    BAT = 'power_bat'
}

export interface ITccSettings {
    stateMap: any;
}

export const defaultSettings: ITccSettings = {
    stateMap: {
        power_ac: 'Default',
        power_bat: 'Default'
    }
};
