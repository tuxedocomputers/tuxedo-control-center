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
        { limit: 24, odmName: "quiet", systemProfile: SystemProfile.SILENT},
        { limit: 26, odmName: "power_saving", systemProfile: SystemProfile.ENERGYSAVE},
        { limit: 36, odmName: "entertainment", systemProfile: SystemProfile.ENTERTAINMENT},
        { limit: 40, odmName: "performance", systemProfile: SystemProfile.MAXPERFORMACE}                   
    ]
});

/*
 * Power limits (W) Pulse Gen3
 *
 * Battery mode:
 *   low-power  pl1: 28, pl2: 28
 *   balanced   pl1: 30, pl2: 30
 *   performace pl1: 35, pl2: 35
 *
 * USB-C mode:
 *   low-power  pl1: 35, pl2: 35
 *   balanced   pl1: 45, pl2: 54
 *   performace pl1: 54, pl2: 54
 */
deviceSystemProfileInfo.set(TUXEDODevice.PULSE1403,  { 
    pl:[
        { limit: 15, odmName: "low-power", systemProfile: SystemProfile.SILENT},
        { limit: 35, odmName: "balanced", systemProfile: SystemProfile.ENERGYSAVE},
        { limit: 54, odmName: "performance", systemProfile: SystemProfile.MAXPERFORMACE}
    ]
});

deviceSystemProfileInfo.set(TUXEDODevice.PULSE1404,  { 
    pl:[
        { limit: 15, odmName: "low-power", systemProfile: SystemProfile.SILENT},
        { limit: 35, odmName: "balanced", systemProfile: SystemProfile.ENERGYSAVE},
        { limit: 54, odmName: "performance", systemProfile: SystemProfile.MAXPERFORMACE}
    ]
});
