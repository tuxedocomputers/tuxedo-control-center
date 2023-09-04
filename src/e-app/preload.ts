import { ITccProfile } from "src/common/models/TccProfile";
import { ITccSettings } from "src/common/models/TccSettings";
import { WebcamPreset } from "src/common/models/TccWebcamSettings";
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
    
        displayBrightnessNotSupportedGnome: () => {ipcRenderer.sendSync('get-display-brightness-not-supported-sync').data},
        setDisplayBrightnessGnome: (valuePercent: number) => {ipcRenderer.invoke('set-display-brightness-gnome',valuePercent)},
        
    
    }
);

contextBridge.exposeInMainWorld(
    'webcam',
    {     
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
    }
);
contextBridge.exposeInMainWorld(
    'fs',
    {
        writeTextFile: (filePath: string, fileData: string | Buffer, writeFileOptions?) => ipcRenderer.invoke('fs-write-text-file',filePath,fileData,writeFileOptions),
        readTextFile: (filePath: string) => ipcRenderer.invoke('fs-read-text-file',filePath),
        existsSync: (filePath: string) => ipcRenderer.sendSync('fs-file-exists-sync', filePath),
    }
);

contextBridge.exposeInMainWorld(
    'path',
    {

    }
);

contextBridge.exposeInMainWorld(
    'https',
    {
        getSystemInfos: () => ipcRenderer.invoke('utils-get-systeminfos'),
        getSystemInfosURL: () => ipcRenderer.sendSync('utils-get-systeminfos-url-sync')
    }
);

contextBridge.exposeInMainWorld(
    'os',
    {

    }
);

contextBridge.exposeInMainWorld(
    'config',
    {
        // TODO switch send for invoke where it sends promises around (everything called async), do that also in main.ts
        setActiveProfile: (profileId: string, stateId: string,settings: ITccSettings) => ipcRenderer.send('config-set-active-profile',profileId,stateId,settings),
        copyProfile: (sourceProfileId: string, newProfileName: string) => ipcRenderer.invoke('config-copy-profile',sourceProfileId,newProfileName),
        pkexecWriteCustomProfiles: (customProfiles: ITccProfile[]) => ipcRenderer.send('config-pkexec-write-custom-profiles',customProfiles),
        writeCurrentEditingProfile: ()  => ipcRenderer.send('config-write-current-editing-profile'),
        pkexecWriteCustomProfilesAsync: (customProfiles: ITccProfile[]) => ipcRenderer.invoke('config-pkexec-write-custom-profiles-async',customProfiles),
        writeProfile: (currentProfileId: string, profile: ITccProfile, states?: string[])  => ipcRenderer.invoke('config-write-profile',currentProfileId,profile),
        saveSettings: () => ipcRenderer.invoke('config-save-settings'),
        pkexecWriteWebcamConfigAsync: (settings: WebcamPreset[])  => ipcRenderer.invoke('config-pkexec-write-webcam-config-async', settings),
        pkexecWriteConfigAsync: (settings: ITccSettings, customProfiles: ITccProfile[])  => ipcRenderer.invoke('config-pkexec-write-config-async',settings,customProfiles),
        getProfileByName: (searchedProfileName: string) => ipcRenderer.send('config-get-profile-by-name',searchedProfileName),
        getProfileById: (searchedProfileId: string) => ipcRenderer.send('config-get-profile-by-id',searchedProfileId),
        getCustomProfileByName: (searchedProfileName: string) => ipcRenderer.send('config-get-custom-profile-by-name', searchedProfileName),
        getCustomProfileById: (searchedProfileId: string) => ipcRenderer.send('config-get-custom-profile-by-id',searchedProfileId),
        setCurrentEditingProfile: (customProfileId: string) => ipcRenderer.send('config-set-current-editing-profile',customProfileId),
        getDefaultFanProfiles: () => ipcRenderer.send('config-get-default-fan-profiles'),
        updateConfigData: () => ipcRenderer.send('config-update-config-data'),
        getSettings: () => ipcRenderer.send('config-get-settings'),
        getCustomProfiles: () => ipcRenderer.send('config-get-custom-profiles'),
        getDefaultProfiles: () => ipcRenderer.send('config-get-default-profiles'),
        getDefaultValuesProfile: () => ipcRenderer.send('config-get-default-values-profile'),
        importProfiles: () => ipcRenderer.send('config-import-profiles'),
        deleteCustomProfile: () => ipcRenderer.send('config-delete-custom-profile'),
        getCurrentEditingProfile: () => ipcRenderer.send('config-get-current-editing-profile'),
        editProfileChanges: () => ipcRenderer.send('config-edit-profile-changes'),
        readWebcamSettings: () => ipcRenderer.send('config-read-webcam-settings'),
        readV4l2Names: () => ipcRenderer.send('config-read-v4l2-names'),
    }
);

contextBridge.exposeInMainWorld(
    'driveController',
    {
        getDrives: () => ipcRenderer.invoke('drive-controller-get-drives')
    }
);

contextBridge.exposeInMainWorld(
    'cpu',
    {
        getGeneralCpuInfoSync: () => ipcRenderer.send('get-general-cpu-info-sync'),
        getLogicalCoreInfoSync: () => ipcRenderer.send('get-logical-core-info-sync'),
        getIntelPstateTurboValueSync: () => ipcRenderer.send('get-intel-pstate-turbo-value-sync'),
    }
);

contextBridge.exposeInMainWorld(
    'backlight',
    {
        getDisplayBrightnessInfo: () => ipcRenderer.send('get-display-brightness-info-sync'),
    }
);


contextBridge.exposeInMainWorld('aquarisAPI', new ClientAPI(ipcRenderer, aquarisAPIHandle));