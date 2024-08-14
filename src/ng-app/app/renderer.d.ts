import { IAquarisClientAPI } from "../../e-app/preloadAPIs/AquarisClientAPI";
import { EventEmitter } from 'node:events';
import { IDrive } from "../../common/models/IDrive";
import { IDisplayBrightnessInfo, IGeneralCPUInfo, ILogicalCoreInfo } from '../../common/models/ICpuInfos';
import { ITccProfile } from "../../common/models/TccProfile";
import { ITccSettings } from "../../common/models/TccSettings";
import { ITccFanProfile } from "../../common/models/TccFanTable";
import { IDbusClientAPI } from "../../e-app/preloadAPIs/DbusClientAPI";
import { ITomteClientAPI } from "src/e-app/preloadAPIs/tomteClientAPI";
import { IWebcamClientAPI } from "src/e-app/preloadAPIs/webcamClientAPI";
import { BrightnessModeString } from "src/e-app/backendAPIs/translationAndTheme";
import { WebcamConstraints } from "src/common/models/TccWebcamSettings";
import { OpenDialogReturnValue, SaveDialogReturnValue } from "electron";

// todo: variables shouldn't be uppercase in every letter
export interface IPC extends EventEmitter {
    getAppVersion: () => Promise<string>,
    closeApp: () => void,
    closeWindow: () => void,
    minimizeWindow: () => void,
    getProcessVersions: () => Promise<IProcessVersions>,
    getBrightnessMode: () => Promise<BrightnessModeString>,
    setBrightnessMode: (mode: BrightnessModeString) => void,
    getShouldUseDarkColors: () => Promise<boolean>,
    onUpdateBrightnessMode: (callback: () => void) => void,
    onWakeupFromSuspend: (callback: () => void) => void,
    onDbusDead: (callback: () => void) => void,
    openExternal: (url: string) => void,
    getPath: (path: string) => Promise<string>,
    openFileDialog: (properties: Electron.OpenDialogOptions) => Promise<OpenDialogReturnValue>,
    saveFileDialog: (properties: Electron.OpenDialogOptions) => Promise<SaveDialogReturnValue>,
    primeWindowShow: () => void,
    primeWindowClose: () => void,
    onSetPrimeSelectMode: (callback: (event: any, primeSelectMode: string) => Promise<void>) => void,
    displayBrightnessNotSupportedGnome: () => boolean,
    setDisplayBrightnessGnome: (valuePercent: number) => void,
    setShutdownTime: (selectedHour: number , selectedMinute: number) => Promise<string>,
    cancelShutdown: () => Promise<string>,
    getScheduledShutdown: () => Promise<string>,
    issueReboot: () => Promise<void>,
    showTccWindow: () => Promise<void>,
    triggerLanguageChange: (languageId: string) => void,
    changeCryptPassword: (newPassword: string, oldPassword: string, confirmPassword: string) => Promise<string>,
    runSysteminfo: (ticketNumber: string) => Promise<void>,
    onUpdateSysteminfoLabel: (callback: (event: any, text: string) => void) => void,
    primeSelect: (selectedState: string) => Promise<string>,
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
    onVideoEnded: (callback: () => void) => void,
    onExternalWebcamPreviewClosed: (callback: () => void) => void,
    onApplyControls: (callback: () => void) => void,
    onSettingWebcamWithLoading: (callback: (event: any, config: WebcamConstraints) => void) => void,
    }

// todo: remove or rename
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
    getScalingDriverAcpiCpuFreq: () => string,
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
      tomteAPI: ITomteClientAPI,
      webcamAPI: IWebcamClientAPI,
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
