import { ClientAPI } from "src/e-app/AquarisAPI";
import { EventEmitter } from 'node:events';

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
  }
  
  declare global {
    interface Window {
      ipc: IPC,
      aquarisApi: ClientAPI
    }
  }

  export interface IPCReturnValue
  {
    // TODO give matching types
    data;
    error;
  }