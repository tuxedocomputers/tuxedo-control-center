import { TUXEDODevice } from "./DefaultProfiles";

export interface SystemProfileInfo {
    pl: PowerLimit[];
}

export interface PowerLimit {
    limit: number;
    odmName: string;
    systemProfile: SystemProfile;
}

export enum SystemProfile { 
        ENERGYSAVE,
        SILENT,
        MAXPERFORMACE,
        ENTERTAINMENT
}


/*
 * Device specific ODM profile Info
 */
export const deviceSystemProfileInfo: Map<TUXEDODevice, SystemProfileInfo> = new Map();

deviceSystemProfileInfo.set(TUXEDODevice.IBP17G6,  { 
    pl:[
        { limit: 40, odmName: "performance", systemProfile: SystemProfile.MAXPERFORMACE},
        { limit: 36, odmName: "entertainment", systemProfile: SystemProfile.ENTERTAINMENT},
        { limit: 24, odmName: "powersaving", systemProfile: SystemProfile.ENERGYSAVE},
        { limit: 24, odmName: "quiet", systemProfile: SystemProfile.SILENT}
                    
    ]
});
deviceSystemProfileInfo.set(TUXEDODevice.PULSE1403,  { 
    pl:[
        { limit: 70, odmName: "performance", systemProfile: SystemProfile.MAXPERFORMACE},
        { limit: 40, odmName: "powersaving", systemProfile: SystemProfile.ENERGYSAVE},
        { limit: 30, odmName: "quiet", systemProfile: SystemProfile.SILENT}              
    ]
});
