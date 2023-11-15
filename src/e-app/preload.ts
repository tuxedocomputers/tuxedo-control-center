import { ITccProfile } from "src/common/models/TccProfile";
import { ITccSettings } from "src/common/models/TccSettings";
import { WebcamPreset } from "src/common/models/TccWebcamSettings";
//import { aquarisAPIHandle, AquarisClientAPI } from "./AquarisAPI"

const { contextBridge, ipcRenderer } = require('electron');

let callbacks = [];

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
    getCWDSync: () => ipcRenderer.sendSync('get-cwd-sync').data,
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
    onUpdateBrightnessMode: (callback) => {
        var channelname = 'update-brightness-mode';
        if(callbacks.indexOf(channelname) < 0)
        {
            callbacks.push(channelname);
            ipcRenderer.on(channelname, callback);
        }
    },
    openExternal: (url: string) => { ipcRenderer.send('ipc-open-external', url) }
  }
);

contextBridge.exposeInMainWorld(
    'dbus',
    {
        init: () => ipcRenderer.invoke('init-dbus'),
        disconnect: () => ipcRenderer.invoke('disconnect-dbus'),
        TuxedoWmiAvailable: () => ipcRenderer.invoke('tuxedo-wmi-available-dbus'),
        TccdVersion: () => ipcRenderer.invoke('tccd-version-dbus'),
        GetFanDataCPU: () => ipcRenderer.invoke('get-fan-data-cpu-dbus'),
        GetFanDataGPU1: () => ipcRenderer.invoke('get-fan-data-gpu1-dbus'),
        GetFanDataGPU2: () => ipcRenderer.invoke('get-fan-data-gpu2-dbus'),
        WebcamSWAvailable: () => ipcRenderer.invoke('webcam-sw-available-dbus'),
        GetWebcamSWStatus: () => ipcRenderer.invoke('get-webcam-sw-status-dbus'),
        GetForceYUV420OutputSwitchAvailable: () => ipcRenderer.invoke('get-force-yub420-output-switch-available-dbus'),
        ConsumeModeReapplyPending: () => ipcRenderer.invoke('consume-mode-reapply-pending-dbus'),
        GetActiveProfileJSON: () => ipcRenderer.invoke('get-active-profile-json-dbus'),
        SetTempProfile: (profileName) => ipcRenderer.invoke('set-temp-profile-dbus',profileName),
        SetTempProfileById: (profileId) => ipcRenderer.invoke('set-temp-profile-by-id-dbus',profileId),
        GetProfilesJSON: () => ipcRenderer.invoke('get-profiles-json-dbus'),
        GetCustomProfilesJSON: () => ipcRenderer.invoke('get-custom-profiles-json-dbus'),
        GetDefaultProfilesJSON: () => ipcRenderer.invoke('get-default-profiles-json-dbus'),
        GetDefaultValuesProfileJSON: () => ipcRenderer.invoke('get-default-values-profile-json-dbus'),
        GetSettingsJSON: () => ipcRenderer.invoke('get-json-settings-dbus'),
        ODMProfilesAvailable: () => ipcRenderer.invoke('odm-profiles-available-dbus'),
        ODMPowerLimitsJSON: () => ipcRenderer.invoke('odm-power-limits-available-dbus'),
        GetKeyboardBacklightCapabilitiesJSON: () => ipcRenderer.invoke('get-keyboard-backlight-capabilities-json-dbus'),
        GetKeyboardBacklightStatesJSON: () => ipcRenderer.invoke('get-keyboard-backlight-states-json-dbus'),
        SetKeyboardBacklightStatesJSON: (keyboardBacklightStatesJSON) => ipcRenderer.invoke('set-keyboard-backlight-states-json-dbus', keyboardBacklightStatesJSON),
        GetFansMinSpeed: () => ipcRenderer.invoke('get-fans-min-speed-dbus'),
        GetFansOffAvailable: () => ipcRenderer.invoke('get-fans-off-available-dbus'),
        GetChargingProfilesAvailable: () => ipcRenderer.invoke('get-charging-profiles-available-dbus'),
        GetCurrentChargingProfile: () => ipcRenderer.invoke('get-current-charging-profile-dbus'),
        SetChargingProfile: (profileDescriptor) => ipcRenderer.invoke('set-charging-profile-dbus', profileDescriptor),
        GetChargingPrioritiesAvailable: () => ipcRenderer.invoke('get-charging-priorities-available-dbus'),
        GetCurrentChargingPriority: () => ipcRenderer.invoke('get-current-charging-priority-dbus'),
        SetChargingPriority: (priorityDescriptor) => ipcRenderer.invoke('set-charging-priority-dbus', priorityDescriptor),   
        displayBrightnessNotSupportedGnome: () => ipcRenderer.sendSync('get-display-brightness-not-supported-sync'),
        setDisplayBrightnessGnome: (valuePercent: number) => ipcRenderer.invoke('set-display-brightness-gnome',valuePercent),
    }
);

contextBridge.exposeInMainWorld(
    'webcam',
    {     
    closeWebcamPreview: () => ipcRenderer.send("close-webcam-preview"),
    // https://github.com/electron/electron/issues/21437
    onApplyControls: (callback) => {
        var channelname = 'apply-controls';
        if(callbacks.indexOf(channelname) < 0)
        {
            callbacks.push(channelname);
            ipcRenderer.on(channelname, callback);
        }
    },
    onExternalWebcamPreviewClosed: (callback) => {
        var channelname = 'external-webcam-preview-closed';
        if(callbacks.indexOf(channelname) < 0)
        {
            callbacks.push(channelname);
            ipcRenderer.on(channelname, callback);
        }
    },
    onVideoEnded: (callback) => {
        var channelname = 'video-ended';
        if(callbacks.indexOf(channelname) < 0)
        {
            callbacks.push(channelname);
            ipcRenderer.on(channelname, callback);
        }
    },
    onSettingWebcamWithLoading: (callback) => {
        var channelname = "setting-webcam-with-loading";
        if(callbacks.indexOf(channelname) < 0)
        {
            callbacks.push(channelname);
            ipcRenderer.on(channelname, callback);
        }
    },
    videoEnded: () => ipcRenderer.send('video-ended'),
    applyControls: () => ipcRenderer.send('apply-controls'),
    readWebcamSettings: () => ipcRenderer.sendSync('webcam-read-settings'),
    pkexecWriteWebcamConfigAsync: (settings: WebcamPreset[])  => ipcRenderer.invoke('webcam-pkexec-write-config-async', settings),
    readV4l2Names: (path: string) => ipcRenderer.sendSync('webcam-read-v4l2-names',path),
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
    'https',
    {
        getSystemInfos: () => ipcRenderer.invoke('utils-get-systeminfos'),
        getSystemInfosURL: () => ipcRenderer.sendSync('utils-get-systeminfos-url-sync'),
    }
);

contextBridge.exposeInMainWorld(
    'config',
    {
        setActiveProfile: (profileId: string, stateId: string,settings: ITccSettings) => ipcRenderer.send('config-set-active-profile',profileId,stateId,settings),
        pkexecWriteCustomProfiles: (customProfiles: ITccProfile[]) => ipcRenderer.send('config-pkexec-write-custom-profiles',customProfiles),
        pkexecWriteCustomProfilesAsync: (customProfiles: ITccProfile[]) => ipcRenderer.invoke('config-pkexec-write-custom-profiles-async',customProfiles),
        pkexecWriteConfigAsync: (settings: ITccSettings, customProfiles: ITccProfile[])  => ipcRenderer.invoke('config-pkexec-write-config-async',settings,customProfiles),
        getDefaultFanProfiles: () => ipcRenderer.sendSync('config-get-default-fan-profiles'),
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
        getGeneralCpuInfoSync: () => ipcRenderer.sendSync('get-general-cpu-info-sync'),
        getLogicalCoreInfoSync: () => ipcRenderer.sendSync('get-logical-core-info-sync'),
        getIntelPstateTurboValueSync: () => ipcRenderer.sendSync('get-intel-pstate-turbo-value-sync'),
    }
);

contextBridge.exposeInMainWorld(
    'backlight',
    {
        getDisplayBrightnessInfo: () => ipcRenderer.sendSync('get-display-brightness-info-sync'),
    }
);

contextBridge.exposeInMainWorld(
    'state',
    {
        determineState: () => ipcRenderer.sendSync("state-determine-state"),
    }
);

contextBridge.exposeInMainWorld(
    'comp',
    {
        getProductSKU: () => ipcRenderer.sendSync('comp-get-product-sku'),
        getBoardVendor: () => ipcRenderer.sendSync('comp-get-board-vendor'),
        getChassisVendor: () => ipcRenderer.sendSync('comp-get-chassis-vendor'),
        getSysVendor: () => ipcRenderer.sendSync('comp-get-sys-vendor'),
        getScalingDriverAcpiCpuFreq: () => ipcRenderer.sendSync('comp-get-scaling-driver-acpi-cpu-freq'),
    }
);

contextBridge.exposeInMainWorld(
    'stuff',
    {
        logStuff: (stuff) => ipcRenderer.send('log-stuff', stuff),
    }
);


//contextBridge.exposeInMainWorld('aquarisAPI', new AquarisClientAPI(ipcRenderer, aquarisAPIHandle));
