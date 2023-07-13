
export interface IPC {
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
  }
  
  declare global {
    interface Window {
      ipc: IPC
    }
  }

  export interface IPCReturnValue
  {
    // TODO give matching types
    data;
    error;
  }