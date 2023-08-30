export interface IGeneralCPUInfo {
    availableCores: number;
    minFreq: number;
    maxFreq: number;
    scalingAvailableFrequencies: number[];
    scalingAvailableGovernors: string[];
    energyPerformanceAvailablePreferences: string[];
    reducedAvailableFreq: number;
    boost: boolean;
  }
  
  export interface ILogicalCoreInfo {
    index: number;
    online: boolean;
    scalingCurFreq: number;
    scalingMinFreq: number;
    scalingMaxFreq: number;
    scalingDriver: string;
    energyPerformanceAvailablePreferences: string[];
    energyPerformancePreference: string;
    scalingAvailableGovernors: string[];
    scalingGovernor: string;
    cpuInfoMinFreq: number;
    cpuInfoMaxFreq: number;
    coreId: number;
    coreSiblingsList: number[];
    physicalPackageId: number;
    threadSiblingsList: number[];
  }
  
  export interface IDisplayBrightnessInfo {
    driver: string;
    brightness: number;
    maxBrightness: number;
  }
  
  export interface IPstateInfo {
    noTurbo: boolean;
  }