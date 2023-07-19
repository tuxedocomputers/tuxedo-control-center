export interface IiGpuInfo {
    temp: number;
    coreFrequency: number;
    maxCoreFrequency: number;
    powerDraw: number;
    vendor: string;
}

export interface IdGpuInfo {
    coreFrequency: number;
    maxCoreFrequency: number;
    powerDraw: number;
    maxPowerLimit: number;
    enforcedPowerLimit: number;
}

export interface IDefaultDGPUValues {
    coreFrequency: number;
    gaugeCoreFrequency: number;
    powerDraw: number;
    gaugePower: number;
}

export interface IDefaultIGPUValues {
    temp: number;
    coreFrequency: number;
    gaugeCoreFrequency: number;
    powerDraw: number;
    vendor: string;
}
