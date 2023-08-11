import { ClientAPI } from "src/e-app/AquarisAPI";
import { EventEmitter } from 'node:events';
import { FanData } from "src/service-app/classes/TccDBusInterface";

export interface IPC extends EventEmitter {
    // TODO probably have to modify this somehow
    send: (channel: string, args) => Promise<IPCReturnValue>,
    invoke: (channel: string, args) => Promise<IPCReturnValue>,
    getAppVersion: () => Promise<IPCReturnValue>,
    closeApp: () => void,
    closeWindow: () => void,
    minimizeWindow: () => void,
    getCWD: () => Promise<IPCReturnValue>,
    getCWDSync: () => string,
    getProcessVersions: () => Promise<IPCReturnValue>,
    getBrightnessMode: () => Promise<'light' | 'dark' | 'system'>,
    getShouldUseDarkColors: () => Promise<boolean>,
    tccdNewSettings: (tccdExec,tmpSettingsPath) => IPCReturnValue,
    tccdNewProfiles: (tccdExec,tmpProfilesPath) => IPCReturnValue,
    closeWebcamPreview: () => void,
    videoEnded: () => void,
    applyControls: () => void,
    onVideoEnded: (callback) => void,
    onExternalWebcamPreviewClosed: (callback) => void,
    onApplyControls: (callback) => void,
    nodeRequire: (string) => any,
  }
  

  export interface DBUS
  {
    init: () => Promise<boolean>,
    disconnect: () => Promise<boolean>,
    TuxedoWmiAvailable: () => Promise<boolean>,
    TccdVersion: () => Promise<string>,
    GetFanDataCPU: () => Promise<FanData>,
    GetFanDataGPU1: () => Promise<FanData>,
    GetFanDataGPU2: () => Promise<FanData>,
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
  }

  declare global {
    interface Window {
      ipc: IPC,
      aquarisApi: ClientAPI,
      dbus: DBUS
    }
  }

  export interface IPCReturnValue
  {
    // TODO give matching types
    data;
    error;
  }