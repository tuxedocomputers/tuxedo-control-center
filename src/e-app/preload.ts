import { ITccProfile } from "src/common/models/TccProfile";
import { ITccSettings } from "src/common/models/TccSettings";
import { WebcamPreset } from "src/common/models/TccWebcamSettings";
import { AquarisClientAPI } from "./preloadAPIs/AquarisClientAPI";
import { DbusClientAPI } from "./preloadAPIs/DbusClientAPI";
const { contextBridge, ipcRenderer } = require('electron');

let callbacks = [];

contextBridge.exposeInMainWorld(
  'ipc',
  {
    send: async (channel: string, args) => ipcRenderer.send(channel, args),
    // TODO
    sendSync: async (channel: string, args) => ipcRenderer.sendSync(channel, args),
    invoke: async (channel: string, args) => ipcRenderer.invoke(channel, args),
    getAppVersion: async () => ipcRenderer.invoke('get-app-version'),
    closeApp: () => ipcRenderer.send('close-app'),
    closeWindow: () => ipcRenderer.send('close-window'),
    minimizeWindow: () => ipcRenderer.send('minimize-window'),
    getCWD: () => ipcRenderer.invoke('get-cwd'),
    getProcessVersions: () => ipcRenderer.invoke('get-process-versions'),
    getBrightnessMode: () => ipcRenderer.invoke('get-brightness-mode'),
    getShouldUseDarkColors: () => ipcRenderer.invoke('get-should-use-dark-colors'),
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
    primeWindowClose: () => ipcRenderer.send("prime-window-close"),
    primeWindowShow: () => ipcRenderer.send("prime-window-show"),
    onSetPrimeSelectMode: (callback) => {
        var channelname = "set-prime-select-mode";
        if(callbacks.indexOf(channelname) < 0)
        {
            callbacks.push(channelname);
            ipcRenderer.on(channelname, callback);
        }
    },
    // TODO
    displayBrightnessNotSupportedGnome: () => ipcRenderer.sendSync('get-display-brightness-not-supported-sync'),
    setDisplayBrightnessGnome: (valuePercent: number) => ipcRenderer.invoke('set-display-brightness-gnome',valuePercent),
  }
  
);

contextBridge.exposeInMainWorld(
    'power',
    {
        // TODO
        getDGpuPowerState: (driver) => ipcRenderer.invoke('get-dgpu-power-state-power', driver),
        getBusPath: (busPath) => ipcRenderer.sendSync('get-bus-path-power', busPath),
        getNvidiaDGpuCount: () => ipcRenderer.sendSync('get-nvidia-dgpu-count-power'),
        getAmdDGpuCount: () => ipcRenderer.sendSync('get-amd-dgpu-count-power'),
        isDGpuAvailable: () => ipcRenderer.sendSync('get-is-dgpu-available-power'),
        isIGpuAvailable: () => ipcRenderer.sendSync('get-is-igpu-available-power'),
    }
);

contextBridge.exposeInMainWorld(
    'vendor',
    {
        getCpuVendor: () => ipcRenderer.invoke('get-cpu-vendor'),

    }
)


// TODO move to it's own file like aquaris API and new DBUS API
contextBridge.exposeInMainWorld(
    'webcam',
    {     
    createWebcamPreview: (webcamConfig) => ipcRenderer.send("create-webcam-preview", webcamConfig),
    closeWebcamPreview: () => ipcRenderer.send("close-webcam-preview"),
    setWebcamWithLoading: (webcamConfig) => ipcRenderer.send("setting-webcam-with-loading", webcamConfig),
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
    readV4l2NamesCWD: (path: string) => ipcRenderer.sendSync('webcam-read-v4l2-names-cwd',path),
    getSelectedWebcamSettings: (sWebcamPath) => ipcRenderer.invoke('webcam-get-selected-webcam-settings',sWebcamPath),
    executeWebcamCtrls: (devicePath, parameter, value) => ipcRenderer.invoke('webcam-execute-ctrls',devicePath, parameter, value),
    executeFilteredCtrls: (devicePath, filteredControls) => ipcRenderer.invoke('webcam-execute-filtered-ctrls',devicePath, filteredControls),    
    getWebcamPaths: () => ipcRenderer.invoke('webcam-get-webcam-paths'),
}
);
contextBridge.exposeInMainWorld(
    'fs',
    {
        // TODO
        writeTextFile: (filePath: string, fileData: string | Buffer, writeFileOptions?) => ipcRenderer.invoke('fs-write-text-file',filePath,fileData,writeFileOptions),
        readTextFile: (filePath: string) => ipcRenderer.invoke('fs-read-text-file',filePath),
        existsSync: (filePath: string) => ipcRenderer.sendSync('fs-file-exists-sync', filePath),
    }
);

contextBridge.exposeInMainWorld(
    'https',
    {
        // TODO
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
        // TODO
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
        getGeneralCpuInfoAsync: () => ipcRenderer.invoke('get-general-cpu-info-async'),
        getLogicalCoreInfoAsync: () => ipcRenderer.invoke('get-logical-core-info-async'),
        getIntelPstateTurboValueAsync: () => ipcRenderer.invoke('get-intel-pstate-turbo-value-async'),
    }
);

contextBridge.exposeInMainWorld(
    'backlight',
    {
        // TODO
        getDisplayBrightnessInfo: () => ipcRenderer.sendSync('get-display-brightness-info-sync'),
    }
);

// contextBridge.exposeInMainWorld(
//     'state',
//     {
//         // is used nowhere
//         //determineState: () => ipcRenderer.sendSync("state-determine-state"),
//     }
// );

contextBridge.exposeInMainWorld(
    'comp',
    {
        getHasAquaris: () => ipcRenderer.invoke('comp-get-has-aquaris'),
        // getProductSKU: () => ipcRenderer.sendSync('comp-get-product-sku'),
        // getBoardVendor: () => ipcRenderer.sendSync('comp-get-board-vendor'),
        // getChassisVendor: () => ipcRenderer.sendSync('comp-get-chassis-vendor'),
        // getSysVendor: () => ipcRenderer.sendSync('comp-get-sys-vendor'),
        // TODO
        getScalingDriverAcpiCpuFreq: () => ipcRenderer.sendSync('comp-get-scaling-driver-acpi-cpu-freq'),
    }
);

// contextBridge.exposeInMainWorld(
//     'tomteGUI',
//     {
        
//     }
// );

contextBridge.exposeInMainWorld(
    'stuff',
    {
        logStuff: (stuff) => ipcRenderer.send('log-stuff', stuff),
    }
);


// TODO rewrite all apis to work like the aquarisapi :)
contextBridge.exposeInMainWorld('aquarisAPI', AquarisClientAPI);
contextBridge.exposeInMainWorld('dbusAPI', DbusClientAPI);
