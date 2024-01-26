import { TUXEDODevice } from "./DefaultProfiles";

export interface SystemProfileInfo {
    pl: PowerLimit[];
}

export interface PowerLimit {
    id: number;
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

deviceSystemProfileInfo.set(TUXEDODevice.IBP14G6_TUX,  { pl:[{ id: 1, odmName: "blubb", systemProfile: SystemProfile.ENERGYSAVE}]});
deviceSystemProfileInfo.set(TUXEDODevice.IBP14G6_TRX, { pl:[{ id: 1, odmName: "blubb", systemProfile: SystemProfile.ENERGYSAVE}]});
deviceSystemProfileInfo.set(TUXEDODevice.IBP14G6_TQF,{ pl:[{ id: 1, odmName: "blubb", systemProfile: SystemProfile.ENERGYSAVE}]});
deviceSystemProfileInfo.set(TUXEDODevice.IBP14G7_AQF_ARX, { pl:[{ id: 1, odmName: "blubb", systemProfile: SystemProfile.ENERGYSAVE}]});
deviceSystemProfileInfo.set(TUXEDODevice.IBPG8, { pl:[{ id: 1, odmName: "blubb", systemProfile: SystemProfile.ENERGYSAVE}]});

deviceSystemProfileInfo.set(TUXEDODevice.PULSE1502, { pl:[{ id: 1, odmName: "blubb", systemProfile: SystemProfile.ENERGYSAVE}]});

deviceSystemProfileInfo.set(TUXEDODevice.POLARIS1XI02,{ pl:[{ id: 1, odmName: "blubb", systemProfile: SystemProfile.ENERGYSAVE}]});
deviceSystemProfileInfo.set(TUXEDODevice.POLARIS1XI03, { pl:[{ id: 1, odmName: "blubb", systemProfile: SystemProfile.ENERGYSAVE}]});
deviceSystemProfileInfo.set(TUXEDODevice.POLARIS1XA02, { pl:[{ id: 1, odmName: "blubb", systemProfile: SystemProfile.ENERGYSAVE}]});
deviceSystemProfileInfo.set(TUXEDODevice.POLARIS1XA03, { pl:[{ id: 1, odmName: "blubb", systemProfile: SystemProfile.ENERGYSAVE}]});
deviceSystemProfileInfo.set(TUXEDODevice.POLARIS1XA05, { pl:[{ id: 1, odmName: "blubb", systemProfile: SystemProfile.ENERGYSAVE}]});

deviceSystemProfileInfo.set(TUXEDODevice.STELLARIS1XI03, { pl:[{ id: 1, odmName: "blubb", systemProfile: SystemProfile.ENERGYSAVE}]});
deviceSystemProfileInfo.set(TUXEDODevice.STELLARIS1XI04, { pl:[{ id: 1, odmName: "blubb", systemProfile: SystemProfile.ENERGYSAVE}]});
deviceSystemProfileInfo.set(TUXEDODevice.STELLARIS1XI05, { pl:[{ id: 1, odmName: "blubb", systemProfile: SystemProfile.ENERGYSAVE}]});

deviceSystemProfileInfo.set(TUXEDODevice.STELLARIS1XA03, { pl:[{ id: 1, odmName: "blubb", systemProfile: SystemProfile.ENERGYSAVE}]});
deviceSystemProfileInfo.set(TUXEDODevice.STEPOL1XA04, { pl:[{ id: 1, odmName: "blubb", systemProfile: SystemProfile.ENERGYSAVE}]});
deviceSystemProfileInfo.set(TUXEDODevice.STELLARIS1XA05, { pl:[{ id: 1, odmName: "blubb", systemProfile: SystemProfile.ENERGYSAVE}]});
