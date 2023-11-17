import { AquarisClientAPI } from "src/e-app/AquarisAPI";
import { EventEmitter } from 'node:events';
import { IDrive } from "../../common/models/IDrive"; 
import { IDisplayBrightnessInfo, IGeneralCPUInfo, ILogicalCoreInfo } from '../../common/models/ICpuInfos';
import { ITccProfile } from "src/common/models/TccProfile";
import { WebcamPreset } from "src/common/models/TccWebcamSettings";
import { ITccSettings } from "src/common/models/TccSettings";
import { ITccFanProfile } from "src/common/models/TccFanTable";

export interface IPC extends EventEmitter {
    // TODO probably have to modify this somehow
    send: (channel: string, args) => Promise<IPCReturnValue>,
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
    openExternal: (url: string) => void,
    getPath: (path: string) => Promise<string>,
    openFileDialog: (properties) => Promise<any>,
    saveFileDialog: (properties) => Promise<any>,
  }
  

  export interface DBUS
  {
    init: () => Promise<boolean>,
    disconnect: () => Promise<boolean>,
    TuxedoWmiAvailable: () => Promise<boolean>,
    TccdVersion: () => Promise<string>,
    GetFanDataCPU: () => Promise<string>,
    GetFanDataGPU1: () => Promise<string>,
    GetFanDataGPU2: () => Promise<string>,
    WebcamSWAvailable: () => Promise<boolean>,
    GetWebcamSWStatus: () => Promise<boolean>,
    GetForceYUV420OutputSwitchAvailable: () => Promise<boolean>,
    ConsumeModeReapplyPending: () => Promise<boolean>,
    GetActiveProfileJSON: () => Promise<string>,
    SetTempProfile: (profileName: string) => Promise<boolean>,
    SetTempProfileById: (profileId: string) => Promise<boolean>,
    GetProfilesJSON: () => Promise<string>,
    GetCustomProfilesJSON: () => Promise<string>,
    GetDefaultProfilesJSON: () => Promise<string>,
    GetDefaultValuesProfileJSON: () => Promise<string>,
    GetSettingsJSON: () => Promise<string>,
    ODMProfilesAvailable: () => Promise<string[]>,
    ODMPowerLimitsJSON: () => Promise<string>,
    GetKeyboardBacklightCapabilitiesJSON: () => Promise<string>,
    GetKeyboardBacklightStatesJSON: () => Promise<string>,
    SetKeyboardBacklightStatesJSON: (keyboardBacklightStatesJSON: string) => Promise<boolean>,
    GetFansMinSpeed: () => Promise<number>,
    GetFansOffAvailable: () => Promise<boolean>,
    GetChargingProfilesAvailable: () => Promise<string>,
    GetCurrentChargingProfile: () => Promise<string>,
    SetChargingProfile: (profileDescriptor: string) => Promise<boolean>,
    GetChargingPrioritiesAvailable: () => Promise<string>,
    GetCurrentChargingPriority: () => Promise<string>,
    SetChargingPriority: (priorityDescriptor: string) => Promise<boolean>,
    displayBrightnessNotSupportedGnome: () => boolean,
    setDisplayBrightnessGnome: (valuePercent: number) => Promise<void>,
    
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
    getGeneralCpuInfoSync: () => IGeneralCPUInfo,
    getLogicalCoreInfoSync: () =>  ILogicalCoreInfo[],
    getIntelPstateTurboValueSync: () => boolean,
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
      aquarisAPI: AquarisClientAPI,
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
    }
  }
  

  export interface IPCReturnValue
  {
    // TODO give matching types
    data;
    error;
  }

  export interface IProcessVersions
  {
    node: string;
    electron: string;
    chrome: string;
  }
