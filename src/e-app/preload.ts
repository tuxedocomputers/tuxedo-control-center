import { aquarisAPIHandle, ClientAPI } from "./AquarisAPI"

const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld(
  'ipc',
  {
    send: async (channel: string, args) => ipcRenderer.send(channel, args),
    invoke: async (channel: string, args) => ipcRenderer.invoke(channel, args),
    getAppVersion: async () => ipcRenderer.invoke('get-app-version'),
    closeApp: () => ipcRenderer.send('close-app'),
    closeWindow: () => ipcRenderer.send('close-window'),
    minimizeWindow: () => ipcRenderer.send('minimize-window'),
    getCWD: () => ipcRenderer.invoke('get-cwd'),
    getCWDSync: () => ipcRenderer.sendSync('get-cwd-sync'),
    getProcessVersions: () => ipcRenderer.invoke('get-process-versions'),
    getBrightnessMode: () => ipcRenderer.invoke('get-brightness-mode'),
    getShouldUseDarkColors: () => ipcRenderer.invoke('get-should-use-dark-colors'),
    // TODO pretty sure it should not have to give it either of those parameters, they should be
    // saved in main, apart from us having to remove exec-cmd completely anyway
    tccdNewSettings: (tccdExec,tmpSettingsPath) => ipcRenderer.sendSync(
        'exec-cmd-sync', 'pkexec ' + tccdExec + ' --new_settings ' + tmpSettingsPath
    ),
    tccdNewProfiles: (tccdExec,tmpProfilesPath) => ipcRenderer.sendSync(
        'exec-cmd-sync', 'pkexec ' + tccdExec + ' --new_profiles ' + tmpProfilesPath
    ),
    closeWebcamPreview: () => ipcRenderer.send("close-webcam-preview"),
    // https://github.com/electron/electron/issues/21437
    onApplyControls: (callback) => {
        ipcRenderer.on('apply-controls', callback);
    },
    onExternalWebcamPreviewClosed: (callback) => {
        ipcRenderer.on('external-webcam-preview-closed', callback);
    },
    onVideoEnded: (callback) => {
        ipcRenderer.on('video-ended', callback);
    },
    videoEnded: () => ipcRenderer.send('video-ended'),
    applyControls: () => ipcRenderer.send('apply-controls'),
    nodeRequire: (requiree: string) => ipcRenderer.sendSync('node-require',requiree).data,

/*

*/

  }
);
contextBridge.exposeInMainWorld('aquarisAPI', new ClientAPI(ipcRenderer, aquarisAPIHandle));