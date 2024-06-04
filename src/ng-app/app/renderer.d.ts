import { IAquarisClientAPI } from "../../e-app/preloadAPIs/AquarisClientAPI";
import { EventEmitter } from 'node:events';
import { IDrive } from "../../common/models/IDrive"; 
import { IDisplayBrightnessInfo, IGeneralCPUInfo, ILogicalCoreInfo } from '../../common/models/ICpuInfos';
import { ITccProfile } from "../../common/models/TccProfile";
import { WebcamConstraints, WebcamPreset } from "../../common/models/TccWebcamSettings";
import { ITccSettings } from "../../common/models/TccSettings";
import { ITccFanProfile } from "../../common/models/TccFanTable";
import { IDbusClientAPI } from "../../e-app/preloadAPIs/DbusClientAPI";

export interface IPC extends EventEmitter {
    send: (channel: string, args) => Promise<IPCReturnValue>,
    sendSync: (channel: string, args) => IPCReturnValue,
    invoke: (channel: string, args) => Promise<IPCReturnValue>,
    getAppVersion: () => Promise<string>,
    closeApp: () => void,
    closeWindow: () => void,
    minimizeWindow: () => void,
    getCWD: () => Promise<IPCReturnValue>,
    getProcessVersions: () => Promise<IProcessVersions>,
    getBrightnessMode: () => Promise<'light' | 'dark' | 'system'>,
    setBrightnessMode: (mode: 'light' | 'dark' | 'system') => void,
    getShouldUseDarkColors: () => Promise<boolean>,
    onUpdateBrightnessMode: (callback) => void,
    onWakeupFromSuspend: (callback) => void,
    openExternal: (url: string) => void,
    getPath: (path: string) => Promise<string>,
    openFileDialog: (properties) => Promise<any>,
    saveFileDialog: (properties) => Promise<any>,
    primeWindowShow: () => void,
    primeWindowClose: () => void,
    onSetPrimeSelectMode: (callback) => void,
    displayBrightnessNotSupportedGnome: () => boolean,
    setDisplayBrightnessGnome: (valuePercent: number) => void,
    setShutdownTime: (selectedHour: number , selectedMinute: number) => Promise<string>,
    cancelShutdown: () => Promise<string>,
    getScheduledShutdown: () => Promise<string>,
    issueReboot: () => Promise<void>,
    showTccWindow: () => Promise<void>,
    triggerLanguageChange: (languageId: string) => void,
    changeCryptPassword: (newPassword: string, oldPassword: string, confirmPassword: string) => Promise<string>,
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
    createWebcamPreview: (webcamConfig: WebcamConstraints) => void,
    closeWebcamPreview: () => void,
    setWebcamWithLoading: (webcamConfig: WebcamConstraints) => void,
    videoEnded: () => void,
    applyControls: () => void,
    onVideoEnded: (callback) => void,
    onExternalWebcamPreviewClosed: (callback) => void,
    onApplyControls: (callback) => void,
    readWebcamSettings: () => WebcamPreset[],
    pkexecWriteWebcamConfigAsync: (settings: WebcamPreset[]) => Promise<boolean>,
    readV4l2Names: (path: string) => string[][], 
    readV4l2NamesCWD: (path: string) => string[][], 
    onSettingWebcamWithLoading: (callback) => void,
    getSelectedWebcamSettings: (sWebcamPath:string) => Promise<string>,
    executeWebcamCtrls: (devicePath: string, parameter: string, value: number | string) => Promise<string>,
    executeFilteredCtrls: (devicePath: string, filteredControls: string) => Promise<string>,
    getWebcamPaths: () => Promise<string>,
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

export interface COMP 
{
    getHasAquaris: () => Promise<boolean>,
    getScalingDriverAcpiCpuFreq: () => any,
}

export interface PGMS 
{
    tomteIsInstalled: () => Promise<boolean>,
    installTomte: () => Promise<boolean>,
    uninstallTomte: () => Promise<boolean>,
    startTomte: () => Promise<void>,
    anydeskIsInstalled: () => Promise<boolean>,
    installAnydesk: () => Promise<boolean>,
    uninstallAnydesk: () => Promise<boolean>,
    startAnydesk: () => Promise<void>,
    webfaiCreatorIsInstalled: () => Promise<boolean>,
    installWebfaicreator: () => Promise<boolean>,
    uninstallWebfaicreator: () => Promise<boolean>,
    startWebfaicreator: () => Promise<void>,
    isInProgress: () => Promise<Map<string, boolean>>,
    isCheckingInstallation: () => Promise<Map<string, boolean>>,
}

  declare global {
    interface Window {
      ipc: IPC,
      aquarisAPI: IAquarisClientAPI,
      dbusAPI: IDbusClientAPI,
      https: HTTPS,
      fs: FS,
      driveController: DRIVECONTROLLER,
      webcam: WEBCAM,
      cpu: CPU,
      backlight: BACKLIGHT,
      config: CONFIG,
      comp: COMP,
      stuff: STUFF,
      vendor: VENDOR,
      power: POWER,
      pgms: PGMS,
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
