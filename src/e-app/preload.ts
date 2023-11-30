import { ITccProfile } from "src/common/models/TccProfile";
import { ITccSettings } from "src/common/models/TccSettings";
import { WebcamPreset } from "src/common/models/TccWebcamSettings";
import { aquarisAPIHandle, AquarisClientAPI } from "./AquarisAPI"
import { DeviceInfo, PumpVoltage, RGBState } from "./LCT21001";
const { contextBridge, ipcRenderer } = require('electron');

export interface AquarisState {
    deviceUUID: string,
    red: number,
    green: number,
    blue: number,
    ledMode: RGBState | number,
    fanDutyCycle: number,
    pumpDutyCycle: number,
    pumpVoltage: PumpVoltage | number,
    ledOn: boolean,
    fanOn: boolean,
    pumpOn: boolean
}


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
    onWakeupFromSuspend: (callback) => {
        var channelname = 'wakeup-from-suspend';
        if(callbacks.indexOf(channelname) < 0)
        {
            callbacks.push(channelname);
            ipcRenderer.on(channelname, callback);
        }
    },
    openExternal: (url: string) => ipcRenderer.send('ipc-open-external', url),
    getPath: (path: string) => ipcRenderer.invoke('ipc-get-path', path),
    openFileDialog: (properties) => ipcRenderer.invoke('show-open-dialog', properties),
    saveFileDialog: (properties) => ipcRenderer.invoke('show-save-dialog', properties),
  }
);

contextBridge.exposeInMainWorld(
    'power',
    {
        getDGpuPowerState: () => ipcRenderer.invoke('get-dgpu-power-state-power'),
    }
);

contextBridge.exposeInMainWorld(
    'dbus',
    {
        init: () => ipcRenderer.invoke('init-dbus'),
        disconnect: () => ipcRenderer.invoke('disconnect-dbus'),
        tuxedoWmiAvailable: () => ipcRenderer.invoke('tuxedo-wmi-available-dbus'),
        tccdVersion: () => ipcRenderer.invoke('tccd-version-dbus'),
        getFanDataCPU: () => ipcRenderer.invoke('get-fan-data-cpu-dbus'),
        getFanDataGPU1: () => ipcRenderer.invoke('get-fan-data-gpu1-dbus'),
        getFanDataGPU2: () => ipcRenderer.invoke('get-fan-data-gpu2-dbus'),
        webcamSWAvailable: () => ipcRenderer.invoke('webcam-sw-available-dbus'),
        getWebcamSWStatus: () => ipcRenderer.invoke('get-webcam-sw-status-dbus'),
        getForceYUV420OutputSwitchAvailable: () => ipcRenderer.invoke('get-force-yub420-output-switch-available-dbus'),
        consumeModeReapplyPending: () => ipcRenderer.invoke('consume-mode-reapply-pending-dbus'),
        getActiveProfileJSON: () => ipcRenderer.invoke('get-active-profile-json-dbus'),
        setTempProfile: (profileName) => ipcRenderer.invoke('set-temp-profile-dbus',profileName),
        setTempProfileById: (profileId) => ipcRenderer.invoke('set-temp-profile-by-id-dbus',profileId),
        getProfilesJSON: () => ipcRenderer.invoke('get-profiles-json-dbus'),
        getCustomProfilesJSON: () => ipcRenderer.invoke('get-custom-profiles-json-dbus'),
        getDefaultProfilesJSON: () => ipcRenderer.invoke('get-default-profiles-json-dbus'),
        getDefaultValuesProfileJSON: () => ipcRenderer.invoke('get-default-values-profile-json-dbus'),
        getSettingsJSON: () => ipcRenderer.invoke('get-json-settings-dbus'),
        odmProfilesAvailable: () => ipcRenderer.invoke('odm-profiles-available-dbus'),
        odmPowerLimitsJSON: () => ipcRenderer.invoke('odm-power-limits-json-dbus'),
        getKeyboardBacklightCapabilitiesJSON: () => ipcRenderer.invoke('get-keyboard-backlight-capabilities-json-dbus'),
        getKeyboardBacklightStatesJSON: () => ipcRenderer.invoke('get-keyboard-backlight-states-json-dbus'),
        setKeyboardBacklightStatesJSON: (keyboardBacklightStatesJSON) => ipcRenderer.invoke('set-keyboard-backlight-states-json-dbus', keyboardBacklightStatesJSON),
        getFansMinSpeed: () => ipcRenderer.invoke('get-fans-min-speed-dbus'),
        getFansOffAvailable: () => ipcRenderer.invoke('get-fans-off-available-dbus'),
        getChargingProfilesAvailable: () => ipcRenderer.invoke('get-charging-profiles-available-dbus'),
        getCurrentChargingProfile: () => ipcRenderer.invoke('get-current-charging-profile-dbus'),
        setChargingProfile: (profileDescriptor) => ipcRenderer.invoke('set-charging-profile-dbus', profileDescriptor),
        getChargingPrioritiesAvailable: () => ipcRenderer.invoke('get-charging-priorities-available-dbus'),
        getCurrentChargingPriority: () => ipcRenderer.invoke('get-current-charging-priority-dbus'),
        setChargingPriority: (priorityDescriptor) => ipcRenderer.invoke('set-charging-priority-dbus', priorityDescriptor),   
        displayBrightnessNotSupportedGnome: () => ipcRenderer.sendSync('get-display-brightness-not-supported-sync'),
        setDisplayBrightnessGnome: (valuePercent: number) => ipcRenderer.invoke('set-display-brightness-gnome',valuePercent),
        getDGpuInfoValuesJSON: () => ipcRenderer.invoke('get-dgpu-info-values-json-dbus'),
        getIGpuInfoValuesJSON: () => ipcRenderer.invoke('get-igpu-info-values-json-dbus'),
        getSensorDataCollectionStatus: () => ipcRenderer.invoke('get-sensor-data-collection-status-dbus'),
        getPrimeState: () => ipcRenderer.invoke('get-prime-state-dbus'),
        getCpuPowerValuesJSON: () => ipcRenderer.invoke('get-cpu-power-values-json-dbus'),
        getDisplayModesJSON: () => ipcRenderer.invoke('get-display-modes-json-dbus'),
        getRefreshRateSupported: () => ipcRenderer.invoke('get-refresh-rate-supported-dbus'),
        setSensorDataCollectionStatus: (status) => ipcRenderer.invoke('set-sensor-data-collection-status-dbus', status),
        setDGpuD0Metrics: (status) => ipcRenderer.invoke('set-dgpu-do-metrics-dbus', status),
        dbusAvailable: () => ipcRenderer.invoke('is-available-dbus'),
        getChargeStartAvailableThresholds: () => ipcRenderer.invoke('get-charge-start-available-thresholds-dbus'),
        getChargeEndAvailableThresholds: () => ipcRenderer.invoke('get-charge-end-available-thresholds-dbus'),
        getChargeStartThreshold: () => ipcRenderer.invoke('get-charge-start-threshold-dbus'),
        getChargeEndThreshold: () => ipcRenderer.invoke('get-charge-end-threshold-dbus'),
        getChargeType: () => ipcRenderer.invoke('get-charge-type-dbus'),
        setChargeStartThreshold: (newValue) => ipcRenderer.invoke('set-charge-start-threshold-dbus', newValue),
        setChargeEndThreshold: (newValue) => ipcRenderer.invoke('set-charge-end-threshold-dbus', newValue),
        setChargeType: (chargeType) => ipcRenderer.invoke('set-charge-type-dbus', chargeType)
    }
);

contextBridge.exposeInMainWorld(
    'vendor',
    {
        getCpuVendor: () => ipcRenderer.invoke('get-cpu-vendor'),

    }
)

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


// contextBridge.exposeInMainWorld('aquarisAPI', new AquarisClientAPI(ipcRenderer, aquarisAPIHandle));

contextBridge.exposeInMainWorld(
    'aquarisAPI', 
    {
        connect: (deviceUUID: string) => ipcRenderer.invoke(aquarisAPIHandle, [AquarisClientAPI.prototype.connect.name, deviceUUID]),
        disconnect: () => ipcRenderer.invoke(aquarisAPIHandle, [AquarisClientAPI.prototype.disconnect.name]),
        isConnected: () => ipcRenderer.invoke(aquarisAPIHandle, [AquarisClientAPI.prototype.isConnected.name]) as Promise<boolean>,
        hasBluetooth: () => ipcRenderer.invoke(aquarisAPIHandle, [AquarisClientAPI.prototype.hasBluetooth.name]) as Promise<boolean>,
        startDiscover: () => ipcRenderer.invoke(aquarisAPIHandle, [AquarisClientAPI.prototype.startDiscover.name]),
        stopDiscover: () => ipcRenderer.invoke(aquarisAPIHandle, [AquarisClientAPI.prototype.stopDiscover.name]),
        getDevices: () => ipcRenderer.invoke(aquarisAPIHandle, [AquarisClientAPI.prototype.getDevices.name]) as Promise<DeviceInfo[]>,
        getState: () => ipcRenderer.invoke(aquarisAPIHandle, [AquarisClientAPI.prototype.getState.name]) as Promise<AquarisState>,
        readFwVersion: () => ipcRenderer.invoke(aquarisAPIHandle, [AquarisClientAPI.prototype.readFwVersion.name]) as Promise<string>,
        updateLED: (red: number, green: number, blue: number, state: RGBState | number) => ipcRenderer.invoke(aquarisAPIHandle, [AquarisClientAPI.prototype.updateLED.name, red, green, blue, state]),
        writeRGBOff: () => ipcRenderer.invoke(aquarisAPIHandle, [AquarisClientAPI.prototype.writeRGBOff.name]),
        writeFanMode: (dutyCyclePercent: number) => ipcRenderer.invoke(aquarisAPIHandle, [AquarisClientAPI.prototype.writeFanMode.name, dutyCyclePercent]),
        writeFanOff: () => ipcRenderer.invoke(aquarisAPIHandle, [AquarisClientAPI.prototype.writeFanOff.name]),
        writePumpMode: (dutyCyclePercent: number, voltage: PumpVoltage | number) => ipcRenderer.invoke(aquarisAPIHandle, [AquarisClientAPI.prototype.writePumpMode.name, dutyCyclePercent, voltage]),
        writePumpOff: () => ipcRenderer.invoke(aquarisAPIHandle, [AquarisClientAPI.prototype.writePumpOff.name]),
        saveState: () => ipcRenderer.invoke(aquarisAPIHandle, [AquarisClientAPI.prototype.saveState.name]),
    }
);