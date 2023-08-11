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

/*

*/

  }
);

contextBridge.exposeInMainWorld(
    'dbus',
    {
        init: () => {ipcRenderer.invoke('init-dbus');},
        disconnect: () => {ipcRenderer.invoke('disconnect-dbus');},
        TuxedoWmiAvailable: () => {ipcRenderer.invoke('tuxedo-wmi-available-dbus');},
        TccdVersion: () => {ipcRenderer.invoke('tccd-version-dbus');},
        GetFanDataCPU: () => {ipcRenderer.invoke('get-fan-data-cpu-dbus');},
        GetFanDataGPU1: () => {ipcRenderer.invoke('get-fan-data-gpu1-dbus');},
        GetFanDataGPU2: () => {ipcRenderer.invoke('get-fan-data-gpu2-dbus');},
        WebcamSWAvailable: () => {ipcRenderer.invoke('webcam-sw-available-dbus');},
        GetWebcamSWStatus: () => {ipcRenderer.invoke('get-webcam-sw-status-dbus');},
        GetForceYUV420OutputSwitchAvailable: () => {ipcRenderer.invoke('get-force-yub420-output-switch-available-dbus');},
        ConsumeModeReapplyPending: () => {ipcRenderer.invoke('consume-mode-reapply-pending-dbus');},
        GetActiveProfileJSON: () => {ipcRenderer.invoke('get-active-profile-json-dbus');},
        SetTempProfile: (profileName) => {ipcRenderer.invoke('set-temp-profile-dbus',profileName);},
        SetTempProfileById: (profileId) => {ipcRenderer.invoke('set-temp-profile-by-id-dbus',profileId);},
        GetProfilesJSON: () => {ipcRenderer.invoke('get-profiles-json-dbus');},
        GetCustomProfilesJSON: () => {ipcRenderer.invoke('get-custom-profiles-json-dbus');},
        GetDefaultProfilesJSON: () => {ipcRenderer.invoke('get-default-profiles-json-dbus');},
        GetDefaultValuesProfileJSON: () => {ipcRenderer.invoke('get-default-values-profile-json-dbus');},
        GetSettingsJSON: () => {ipcRenderer.invoke('get-json-settings-dbus');},
        ODMProfilesAvailable: () => {ipcRenderer.invoke('odm-profiles-available-dbus');},
        ODMPowerLimitsJSON: () => {ipcRenderer.invoke('odm-power-limits-available-dbus');},
        GetKeyboardBacklightCapabilitiesJSON: () => {ipcRenderer.invoke('get-keyboard-backlight-capabilities-json-dbus');},
        GetKeyboardBacklightStatesJSON: () => {ipcRenderer.invoke('get-keyboard-backlight-states-json-dbus');},
        SetKeyboardBacklightStatesJSON: (keyboardBacklightStatesJSON) => {ipcRenderer.invoke('set-keyboard-backlight-states-json-dbus', keyboardBacklightStatesJSON);},
        GetFansMinSpeed: () => {ipcRenderer.invoke('get-fans-min-speed-dbus');},
        GetFansOffAvailable: () => {ipcRenderer.invoke('get-fans-off-available-dbus');},
        GetChargingProfilesAvailable: () => {ipcRenderer.invoke('get-charging-profiles-available-dbus');},
        GetCurrentChargingProfile: () => {ipcRenderer.invoke('get-current-charging-profile-dbus');},
        SetChargingProfile: (profileDescriptor) => {ipcRenderer.invoke('set-charging-profile-dbus', profileDescriptor);},
        GetChargingPrioritiesAvailable: () => {ipcRenderer.invoke('get-charging-priorities-available-dbus');},
        GetCurrentChargingPriority: () => {ipcRenderer.invoke('get-current-charging-priority-dbus');},
        SetChargingPriority: (priorityDescriptor) => {ipcRenderer.invoke('set-charging-priority-dbus', priorityDescriptor);},
    }
);

contextBridge.exposeInMainWorld('aquarisAPI', new ClientAPI(ipcRenderer, aquarisAPIHandle));