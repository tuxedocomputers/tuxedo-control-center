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
        MAXPERFORMACE
}


/*
 * Device specific ODM profile Info
 */
export const deviceSystemProfileInfo: Map<TUXEDODevice, SystemProfileInfo> = new Map();

deviceSystemProfileInfo.set(TUXEDODevice.IBP14G6_TUX,  { pl:[{ limit: 1, odmName: "blubb", systemProfile: SystemProfile.ENERGYSAVE}]});
deviceSystemProfileInfo.set(TUXEDODevice.IBP14G6_TRX, { pl:[{ limit: 1, odmName: "blubb", systemProfile: SystemProfile.ENERGYSAVE}]});
deviceSystemProfileInfo.set(TUXEDODevice.IBP14G6_TQF,{ pl:[{ limit: 1, odmName: "blubb", systemProfile: SystemProfile.ENERGYSAVE}]});
deviceSystemProfileInfo.set(TUXEDODevice.IBP14G7_AQF_ARX, { pl:[{ limit: 1, odmName: "blubb", systemProfile: SystemProfile.ENERGYSAVE}]});
deviceSystemProfileInfo.set(TUXEDODevice.IBPG8, { pl:[{ limit: 1, odmName: "blubb", systemProfile: SystemProfile.ENERGYSAVE}]});

deviceSystemProfileInfo.set(TUXEDODevice.PULSE1502, { pl:[{ limit: 1, odmName: "blubb", systemProfile: SystemProfile.ENERGYSAVE}]});

deviceSystemProfileInfo.set(TUXEDODevice.POLARIS1XI02,{ pl:[{ limit: 1, odmName: "blubb", systemProfile: SystemProfile.ENERGYSAVE}]});
deviceSystemProfileInfo.set(TUXEDODevice.POLARIS1XI03, { pl:[{ limit: 1, odmName: "blubb", systemProfile: SystemProfile.ENERGYSAVE}]});
deviceSystemProfileInfo.set(TUXEDODevice.POLARIS1XA02, { pl:[{ limit: 1, odmName: "blubb", systemProfile: SystemProfile.ENERGYSAVE}]});
deviceSystemProfileInfo.set(TUXEDODevice.POLARIS1XA03, { pl:[{ limit: 1, odmName: "blubb", systemProfile: SystemProfile.ENERGYSAVE}]});
deviceSystemProfileInfo.set(TUXEDODevice.POLARIS1XA05, { pl:[{ limit: 1, odmName: "blubb", systemProfile: SystemProfile.ENERGYSAVE}]});

deviceSystemProfileInfo.set(TUXEDODevice.STELLARIS1XI03, { pl:[{ limit: 1, odmName: "blubb", systemProfile: SystemProfile.ENERGYSAVE}]});
deviceSystemProfileInfo.set(TUXEDODevice.STELLARIS1XI04, { pl:[{ limit: 1, odmName: "blubb", systemProfile: SystemProfile.ENERGYSAVE}]});
deviceSystemProfileInfo.set(TUXEDODevice.STELLARIS1XI05, { pl:[{ limit: 1, odmName: "blubb", systemProfile: SystemProfile.ENERGYSAVE}]});

deviceSystemProfileInfo.set(TUXEDODevice.STELLARIS1XA03, { pl:[{ limit: 1, odmName: "blubb", systemProfile: SystemProfile.ENERGYSAVE}]});
deviceSystemProfileInfo.set(TUXEDODevice.STEPOL1XA04, { pl:[{ limit: 1, odmName: "blubb", systemProfile: SystemProfile.ENERGYSAVE}]});
deviceSystemProfileInfo.set(TUXEDODevice.STELLARIS1XA05, { pl:[{ limit: 1, odmName: "blubb", systemProfile: SystemProfile.ENERGYSAVE}]});
