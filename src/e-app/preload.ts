import { ITccProfile } from "src/common/models/TccProfile";
import { ITccSettings } from "src/common/models/TccSettings";
import { WebcamPreset } from "src/common/models/TccWebcamSettings";
import { AquarisClientAPI } from "./preloadAPIs/AquarisClientAPI";
import { DbusClientAPI } from "./preloadAPIs/DbusClientAPI";
import { TomteClientAPI} from "./preloadAPIs/tomteClientAPI";
import { WebcamClientAPI} from "./preloadAPIs/webcamClientAPI";
const { contextBridge, ipcRenderer } = require('electron');

let callbacks = [];

contextBridge.exposeInMainWorld(
  'ipc',
  {
    getAppVersion: async () => ipcRenderer.invoke('get-app-version'),
    closeApp: () => ipcRenderer.send('close-app'),
    closeWindow: () => ipcRenderer.send('close-window'),
    minimizeWindow: () => ipcRenderer.send('minimize-window'),
    getProcessVersions: () => ipcRenderer.invoke('get-process-versions'),
    getBrightnessMode: () => ipcRenderer.invoke('get-brightness-mode'),
    setBrightnessMode: (mode: 'light' | 'dark' | 'system') => ipcRenderer.invoke('set-brightness-mode', mode),
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
    onDbusDead: (callback) => {
        var channelname = 'dbus-died';
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
    onUpdateSysteminfoLabel: (callback) => {
        var channelname = 'ipc-update-system-info-label';
        if(callbacks.indexOf(channelname) < 0)
        {
            callbacks.push(channelname);
            ipcRenderer.on(channelname, callback);
        }
    },
    // TODO
    displayBrightnessNotSupportedGnome: () => ipcRenderer.sendSync('get-display-brightness-not-supported-sync'),
    setDisplayBrightnessGnome: (valuePercent: number) => ipcRenderer.invoke('set-display-brightness-gnome',valuePercent),
    setShutdownTime: (selectedHour, selectedMinute) => ipcRenderer.invoke('ipc-set-shutdown-time', selectedHour, selectedMinute),
    cancelShutdown: () => ipcRenderer.invoke('ipc-cancel-shutdown'),
    getScheduledShutdown: () => ipcRenderer.invoke('ipc-get-scheduled-shutdown'),
    issueReboot: () => ipcRenderer.invoke('ipc-issue-reboot'),
    showTccWindow: () => ipcRenderer.send('show-tcc-window'),
    triggerLanguageChange: (languageId: string) => ipcRenderer.send('trigger-language-change', languageId),
    changeCryptPassword: (newPassword: string, oldPassword: string, confirmPassword: string) => ipcRenderer.invoke('ipc-change-crypt-password', newPassword, oldPassword, confirmPassword),
    runSysteminfo: (ticketNumber: string) => ipcRenderer.invoke('ipc-run-systeminfos',ticketNumber),
    primeSelect: (selectedState: string) => ipcRenderer.invoke('ipc-prime-select', selectedState)
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


contextBridge.exposeInMainWorld(
    'webcam',
    {     
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


contextBridge.exposeInMainWorld(
    'comp',
    {
        getHasAquaris: () => ipcRenderer.invoke('comp-get-has-aquaris'),
        // TODO
        getScalingDriverAcpiCpuFreq: () => ipcRenderer.sendSync('comp-get-scaling-driver-acpi-cpu-freq'),
    }
);

contextBridge.exposeInMainWorld(
    'stuff',
    {
        logStuff: (stuff) => ipcRenderer.send('log-stuff', stuff),
    }
);

contextBridge.exposeInMainWorld(
    'pgms',
    {
        tomteIsInstalled: () => ipcRenderer.invoke('pgms-tomte-is-installed'),
        installTomte: () => ipcRenderer.invoke('pgms-install-tomte'),
        uninstallTomte: () => ipcRenderer.invoke('pgms-uninstall-tomte'),
        startTomte: () => ipcRenderer.invoke('pgms-start-tomte'),
        anydeskIsInstalled: () => ipcRenderer.invoke('pgms-anydesk-is-installed'),
        installAnydesk: () => ipcRenderer.invoke('pgms-install-anydesk'),
        uninstallAnydesk: () => ipcRenderer.invoke('pgms-uninstall-anydesk'),
        startAnydesk: () => ipcRenderer.invoke('pgms-start-anydesk'),
        webfaiCreatorIsInstalled: () => ipcRenderer.invoke('pgms-webfaic-is-installed'),
        installWebfaicreator: () => ipcRenderer.invoke('pgms-install-webfaic'),
        uninstallWebfaicreator: () => ipcRenderer.invoke('pgms-uninstall-webfaic'),
        startWebfaicreator: () => ipcRenderer.invoke('pgms-start-webfaic'),
        isInProgress: () => ipcRenderer.invoke('pgms-is-in-progress'),
        isCheckingInstallation: () => ipcRenderer.invoke('pgms-is-checking-installation'),
    }
);




// TODO rewrite all apis to work like the aquarisapi :)
contextBridge.exposeInMainWorld('aquarisAPI', AquarisClientAPI);
contextBridge.exposeInMainWorld('dbusAPI', DbusClientAPI);
contextBridge.exposeInMainWorld('tomteAPI', TomteClientAPI);
contextBridge.exposeInMainWorld('webcamAPI', WebcamClientAPI);
