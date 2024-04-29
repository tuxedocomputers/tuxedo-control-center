import { IAquarisClientAPI } from "../../e-app/preloadAPIs/AquarisClientAPI";
import { EventEmitter } from 'node:events';
import { IDrive } from "../../common/models/IDrive"; 
import { IDisplayBrightnessInfo, IGeneralCPUInfo, ILogicalCoreInfo } from '../../common/models/ICpuInfos';
import { ITccProfile } from "src/common/models/TccProfile";
import { WebcamPreset } from "src/common/models/TccWebcamSettings";
import { ITccSettings } from "src/common/models/TccSettings";
import { ITccFanProfile } from "src/common/models/TccFanTable";

export interface IPC extends EventEmitter {
    send: (channel: string, args) => Promise<IPCReturnValue>,
    sendSync: (channel: string, args) => IPCReturnValue,
    invoke: (channel: string, args) => Promise<IPCReturnValue>,
    getAppVersion: () => Promise<string>,
    closeApp: () => void,
    closeWindow: () => void,
    minimizeWindow: () => void,
    getCWD: () => Promise<IPCReturnValue>,
    getCWDSync: () => string,
    getProcessVersions: () => Promise<IProcessVersions>,
    getBrightnessMode: () => Promise<'light' | 'dark' | 'system'>,
    getShouldUseDarkColors: () => Promise<boolean>,
    tccdNewSettings: (tccdExec,tmpSettingsPath) => IPCReturnValue,
    tccdNewProfiles: (tccdExec,tmpProfilesPath) => IPCReturnValue,
    onUpdateBrightnessMode: (callback) => void,
    onWakeupFromSuspend: (callback) => void,
    openExternal: (url: string) => void,
    getPath: (path: string) => Promise<string>,
    openFileDialog: (properties) => Promise<any>,
    saveFileDialog: (properties) => Promise<any>,
    primeWindowShow: () => void,
    primeWindowClose: () => void,
    onSetPrimeSelectMode: (callback) => void,
  }

  export interface POWER 
  {
    getDGpuPowerState: (driver: string) => Promise<string>,
    getBusPath: (busPath: string) => string,
    getNvidiaDGpuCount: () => number,
    getAmdDGpuCount: () => number,
    isDGpuAvailable: () => boolean,
    isIGpuAvailable: () => boolean,
  }
  

  export interface DBUS
  {
    init: () => Promise<boolean>,
    disconnect: () => Promise<boolean>,
    tuxedoWmiAvailable: () => Promise<boolean>,
    tccdVersion: () => Promise<string>,
    getFanData: () => Promise<string>,
    webcamSWAvailable: () => Promise<boolean>,
    getWebcamSWStatus: () => Promise<boolean>,
    getForceYUV420OutputSwitchAvailable: () => Promise<boolean>,
    consumeModeReapplyPending: () => Promise<boolean>,
    getActiveProfileJSON: () => Promise<string>,
    setTempProfileByName: (profileName: string) => Promise<boolean>,
    setTempProfileById: (profileId: string) => Promise<boolean>,
    getProfilesJSON: () => Promise<string>,
    getCustomProfilesJSON: () => Promise<string>,
    getDefaultProfilesJSON: () => Promise<string>,
    getDefaultValuesProfileJSON: () => Promise<string>,
    getSettingsJSON: () => Promise<string>,
    odmProfilesAvailable: () => Promise<string[]>,
    odmPowerLimitsJSON: () => Promise<string>,
    getKeyboardBacklightCapabilitiesJSON: () => Promise<string>,
    getKeyboardBacklightStatesJSON: () => Promise<string>,
    setKeyboardBacklightStatesJSON: (keyboardBacklightStatesJSON: string) => Promise<boolean>,
    getFansMinSpeed: () => Promise<number>,
    getFansOffAvailable: () => Promise<boolean>,
    getChargingProfilesAvailable: () => Promise<string[]>,
    getCurrentChargingProfile: () => Promise<string>,
    setChargingProfile: (profileDescriptor: string) => Promise<boolean>,
    getChargingPrioritiesAvailable: () => Promise<string[]>,
    getCurrentChargingPriority: () => Promise<string>,
    setChargingPriority: (priorityDescriptor: string) => Promise<boolean>,
    displayBrightnessNotSupportedGnome: () => boolean,
    setDisplayBrightnessGnome: (valuePercent: number) => Promise<void>,
    getDGpuInfoValuesJSON: () => Promise<string>,
    getIGpuInfoValuesJSON: () => Promise<string>,
    getSensorDataCollectionStatus: () => Promise<boolean>,
    getPrimeState: () => Promise<string>,
    getCpuPowerValuesJSON: () => Promise<string>,
    getDisplayModesJSON: () => Promise<string>,
    setSensorDataCollectionStatus: (status) => Promise<boolean>,
    setDGpuD0Metrics: (status) => Promise<boolean>,
    dbusAvailable: () => Promise<boolean>,
    getChargeStartAvailableThresholds: () => Promise<number[]>,
    getChargeEndAvailableThresholds: () => Promise<number[]>,
    getChargeStartThreshold: () => Promise<number>,
    getChargeEndThreshold: () => Promise<number>,
    getChargeType: () => Promise<string>,
    setChargeStartThreshold: (newValue: number) => Promise<boolean>,
    setChargeEndThreshold: (newValue: number) => Promise<boolean>,
    setChargeType: (chargeType) => Promise<boolean>,
    fanHwmonAvailable: () => Promise<boolean>,
    getIsX11: () => Promise<boolean>,
  }

  export interface VENDOR
  {
    getCpuVendor: () => Promise<string>,

  }

  export interface HTTPS 
  {
    getSystemInfos: () => Promise<Buffer>,
    getSystemInfosURL: () => string
  }

  export interface FS 
  {
     writeTextFile: (filePath: string, fileData: string | Buffer, writeFileOptions?) => Promise<void>,
     readTextFile: (filePath: string) => Promise<string>,
     existsSync: (filePath: string) => boolean,
  }

  export interface DRIVECONTROLLER
  {
    getDrives: () => IDrive[]
  }
export interface WEBCAM 
{
    closeWebcamPreview: () => void,
    videoEnded: () => void,
    applyControls: () => void,
    onVideoEnded: (callback) => void,
    onExternalWebcamPreviewClosed: (callback) => void,
    onApplyControls: (callback) => void,
    readWebcamSettings: () => WebcamPreset[],
    pkexecWriteWebcamConfigAsync: (settings: WebcamPreset[]) => Promise<boolean>,
    readV4l2Names: (path: string) => string[][], 
    onSettingWebcamWithLoading: (callback) => void,
}
export interface STUFF
{
    logStuff: (stuff : string) => void,
}

export interface CPU 
{
    getGeneralCpuInfoAsync: () => Promise<IGeneralCPUInfo>,
    getLogicalCoreInfoAsync: () =>  Promise<ILogicalCoreInfo[]>,
    getIntelPstateTurboValueAsync: () => Promise<boolean>,
}

export interface BACKLIGHT 
{
    getDisplayBrightnessInfo: () => IDisplayBrightnessInfo[]
}

export interface CONFIG 
{ 
    pkexecWriteConfigAsync: (settings: ITccSettings, customProfiles: ITccProfile[]) => Promise<boolean>,
    getDefaultFanProfiles: () => ITccFanProfile[],     
    setActiveProfile: (profileId: string, stateId: string,settings: ITccSettings) => void,    
    pkexecWriteCustomProfilesAsync: (customProfiles: ITccProfile[]) => boolean,
    pkexecWriteCustomProfiles: (customProfiles: ITccProfile[]) => boolean,
}

export interface STATE 
{
    determineState: () => any,
}

export interface COMP 
{
    getProductSKU: () => any,
    getBoardVendor: () => any,
    getChassisVendor: () => any,
    getSysVendor: () => any,
    getScalingDriverAcpiCpuFreq: () => any,
}


  declare global {
    interface Window {
      ipc: IPC,
      aquarisAPI: IAquarisClientAPI,
      dbus: DBUS,
      https: HTTPS,
      fs: FS,
      driveController: DRIVECONTROLLER,
      webcam: WEBCAM,
      cpu: CPU,
      backlight: BACKLIGHT,
      config: CONFIG,
      state: STATE,
      comp: COMP,
      stuff: STUFF,
      vendor: VENDOR,
      power: POWER,
    }
  }
  

  export interface IPCReturnValue
  {
    data;
    error;
  }

  export interface IProcessVersions
  {
    node: string;
    electron: string;
    chrome: string;
  }
