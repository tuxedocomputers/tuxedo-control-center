/*!
 * Copyright (c) 2019-2024 TUXEDO Computers GmbH <tux@tuxedocomputers.com>
 *
 * This file is part of TUXEDO Control Center.
 *
 * TUXEDO Control Center is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * TUXEDO Control Center is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with TUXEDO Control Center.  If not, see <https://www.gnu.org/licenses/>.
 */

import type { ITccProfile } from "../common/models/TccProfile";
import type { ITccSettings } from "../common/models/TccSettings";
import type { WebcamConstraints } from "../common/models/TccWebcamSettings";
import { AquarisClientAPI } from "./preloadAPIs/AquarisClientAPI";
import { DbusClientAPI } from "./preloadAPIs/DbusClientAPI";
import { TomteClientAPI} from "./preloadAPIs/tomteClientAPI";
import { WebcamClientAPI} from "./preloadAPIs/webcamClientAPI";
import type * as fs from 'node:fs';
import type { ITccFanProfile } from "../common/models/TccFanTable";
import type { IDrive } from "../common/models/IDrive";
import type { OpenDialogReturnValue, SaveDialogReturnValue } from "electron";
import type { BrightnessModeString } from "./backendAPIs/brightnessAPI";
import type { IDisplayBrightnessInfo, IGeneralCPUInfo, ILogicalCoreInfo } from "../common/models/ICpuInfos";
const { contextBridge, ipcRenderer } = require('electron');

let callbacks: string[] = [];

// todo: duplicate code, move into another file
interface IProcessVersions
  {
    node: string;
    electron: string;
    chrome: string;
  }

contextBridge.exposeInMainWorld(
  'ipc',
  {
    getAppVersion: async (): Promise<any> => ipcRenderer.invoke('get-app-version'),
    closeApp: (): void => ipcRenderer.send('close-app'),
    closeWindow: (): void => ipcRenderer.send('close-window'),
    minimizeWindow: (): void => ipcRenderer.send('minimize-window'),
    getProcessVersions: (): Promise<IProcessVersions> => ipcRenderer.invoke('get-process-versions'),
    getBrightnessMode: (): Promise<BrightnessModeString> => ipcRenderer.invoke('get-brightness-mode'),
    setBrightnessMode: (mode: BrightnessModeString): Promise<void> => ipcRenderer.invoke('set-brightness-mode', mode),
    getShouldUseDarkColors: (): Promise<boolean> => ipcRenderer.invoke('get-should-use-dark-colors'),
    onUpdateBrightnessMode: (callback: () => void): void => {
        var channelname: string = 'update-brightness-mode';
        if(callbacks.indexOf(channelname) < 0)
        {
            callbacks.push(channelname);
            ipcRenderer.on(channelname, callback);
        }
    },
    onWakeupFromSuspend: (callback: () => void): void => {
        var channelname: string = 'wakeup-from-suspend';
        if(callbacks.indexOf(channelname) < 0)
        {
            callbacks.push(channelname);
            ipcRenderer.on(channelname, callback);
        }
    },
    onDbusDead: (callback: () => void): void => {
        var channelname: string = 'dbus-died';
        if(callbacks.indexOf(channelname) < 0)
        {
            callbacks.push(channelname);
            ipcRenderer.on(channelname, callback);
        }
    },
    openExternal: (url: string): void => ipcRenderer.send('ipc-open-external', url),
    getPath: (path: string): Promise<string> => ipcRenderer.invoke('ipc-get-path', path),
    openFileDialog: (properties: Electron.OpenDialogOptions): Promise<OpenDialogReturnValue> => ipcRenderer.invoke('show-open-dialog', properties),
    saveFileDialog: (properties: Electron.OpenDialogOptions): Promise<SaveDialogReturnValue> => ipcRenderer.invoke('show-save-dialog', properties),
    primeWindowClose: (): void => ipcRenderer.send("prime-window-close"),
    primeWindowShow: (): void => ipcRenderer.send("prime-window-show"),
    onSetPrimeSelectMode: (callback: () => void): void => {
        var channelname: string = "set-prime-select-mode";
        if(callbacks.indexOf(channelname) < 0)
        {
            callbacks.push(channelname);
            ipcRenderer.on(channelname, callback);
        }
    },
    onUpdateSysteminfoLabel: (callback: (event: any, text: any) => void): void => {
        var channelname: string = 'ipc-update-system-info-label';
        if(callbacks.indexOf(channelname) < 0)
        {
            callbacks.push(channelname);
            ipcRenderer.on(channelname, callback);
        }
    },
    // todo: make async
    displayBrightnessNotSupportedGnome: (): boolean => ipcRenderer.sendSync('get-display-brightness-not-supported-sync'),
    setDisplayBrightnessGnome: (valuePercent: number): Promise<void> => ipcRenderer.invoke('set-display-brightness-gnome',valuePercent),
    setShutdownTime: (selectedHour: number, selectedMinute: number): Promise<string> => ipcRenderer.invoke('ipc-set-shutdown-time', selectedHour, selectedMinute),
    cancelShutdown: (): Promise<string> => ipcRenderer.invoke('ipc-cancel-shutdown'),
    getScheduledShutdown: (): Promise<string> => ipcRenderer.invoke('ipc-get-scheduled-shutdown'),
    issueReboot: (): Promise<void> => ipcRenderer.invoke('ipc-issue-reboot'),
    showTccWindow: (): void => ipcRenderer.send('show-tcc-window'),
    triggerLanguageChange: (languageId: string): void => ipcRenderer.send('trigger-language-change', languageId),
    changeCryptPassword: (newPassword: string, oldPassword: string, confirmPassword: string): Promise<void> => ipcRenderer.invoke('ipc-change-crypt-password', newPassword, oldPassword, confirmPassword),
    runSysteminfo: (ticketNumber: string): Promise<void> => ipcRenderer.invoke('ipc-run-systeminfos',ticketNumber),
    primeSelect: (selectedState: string): Promise<string> => ipcRenderer.invoke('ipc-prime-select', selectedState)
}

);

contextBridge.exposeInMainWorld(
    'power',
    {
        // todo: make async
        getDGpuPowerState: (driver: string): Promise<string> => ipcRenderer.invoke('get-dgpu-power-state-power', driver),
        getBusPath: (busPath: string): string => ipcRenderer.sendSync('get-bus-path-power', busPath),
        getNvidiaDGpuCount: (): number => ipcRenderer.sendSync('get-nvidia-dgpu-count-power'),
        getAmdDGpuCount: (): number => ipcRenderer.sendSync('get-amd-dgpu-count-power'),
        isDGpuAvailable: (): boolean => ipcRenderer.sendSync('get-is-dgpu-available-power'),
        isIGpuAvailable: (): boolean => ipcRenderer.sendSync('get-is-igpu-available-power'),
    }
);

contextBridge.exposeInMainWorld(
    'vendor',
    {
        getCpuVendor: (): Promise<string> => ipcRenderer.invoke('get-cpu-vendor'),

    }
)


contextBridge.exposeInMainWorld(
    'webcam',
    {
    // https://github.com/electron/electron/issues/21437
    onApplyControls: (callback: () => void): void => {
        var channelname: string = 'apply-controls';
        if(callbacks.indexOf(channelname) < 0)
        {
            callbacks.push(channelname);
            ipcRenderer.on(channelname, callback);
        }
    },
    onExternalWebcamPreviewClosed: (callback: () => void): void => {
        var channelname: string = 'external-webcam-preview-closed';
        if(callbacks.indexOf(channelname) < 0)
        {
            callbacks.push(channelname);
            ipcRenderer.on(channelname, callback);
        }
    },
    onVideoEnded: (callback: () => void): void => {
        var channelname: string = 'video-ended';
        if(callbacks.indexOf(channelname) < 0)
        {
            callbacks.push(channelname);
            ipcRenderer.on(channelname, callback);
        }
    },
    onSettingWebcamWithLoading: (callback: (event: any, config: WebcamConstraints) => void): void => {
        var channelname: string = "setting-webcam-with-loading";
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
        // todo: make async
        writeTextFile: (filePath: string, fileData: string | Buffer, writeFileOptions?: fs.WriteFileOptions): Promise<void> => ipcRenderer.invoke('fs-write-text-file',filePath,fileData,writeFileOptions),
        readTextFile: (filePath: string): Promise<string> => ipcRenderer.invoke('fs-read-text-file',filePath),
        existsSync: (filePath: string): boolean => ipcRenderer.sendSync('fs-file-exists-sync', filePath),
    }
);

contextBridge.exposeInMainWorld(
    'config',
    {
        setActiveProfile: (profileId: string, stateId: string,settings: ITccSettings): void => ipcRenderer.send('config-set-active-profile',profileId,stateId,settings),
        pkexecWriteCustomProfiles: (customProfiles: ITccProfile[]): void => ipcRenderer.send('config-pkexec-write-custom-profiles',customProfiles),
        pkexecWriteCustomProfilesAsync: (customProfiles: ITccProfile[]): Promise<boolean> => ipcRenderer.invoke('config-pkexec-write-custom-profiles-async',customProfiles),
        pkexecWriteConfigAsync: (settings: ITccSettings, customProfiles: ITccProfile[]): Promise<boolean>  => ipcRenderer.invoke('config-pkexec-write-config-async',settings,customProfiles),
        // todo: make async
        getDefaultFanProfiles: (): ITccFanProfile[] => ipcRenderer.sendSync('config-get-default-fan-profiles'),
    }
);

contextBridge.exposeInMainWorld(
    'driveController',
    {
        getDrives: (): Promise<IDrive> => ipcRenderer.invoke('drive-controller-get-drives')
    }
);

contextBridge.exposeInMainWorld(
    'cpu',
    {
        getGeneralCpuInfoAsync: (): Promise<IGeneralCPUInfo> => ipcRenderer.invoke('get-general-cpu-info-async'),
        getLogicalCoreInfoAsync: (): Promise<ILogicalCoreInfo[]> => ipcRenderer.invoke('get-logical-core-info-async'),
        getIntelPstateTurboValueAsync: (): Promise<boolean> => ipcRenderer.invoke('get-intel-pstate-turbo-value-async'),
    }
);

contextBridge.exposeInMainWorld(
    'backlight',
    {
        // todo: make async
        getDisplayBrightnessInfo: (): IDisplayBrightnessInfo[] => ipcRenderer.sendSync('get-display-brightness-info-sync'),
    }
);


contextBridge.exposeInMainWorld(
    'comp',
    {
        getHasAquaris: (): Promise<boolean> => ipcRenderer.invoke('comp-get-has-aquaris'),
        // todo: make async
        getScalingDriverAcpiCpuFreq: (): string => ipcRenderer.sendSync('comp-get-scaling-driver-acpi-cpu-freq-sync'),
    }
);

// todo: rename or remove
contextBridge.exposeInMainWorld(
    'stuff',
    {
        logStuff: (stuff: string): void => ipcRenderer.send('log-stuff', stuff),
    }
);

contextBridge.exposeInMainWorld(
    'pgms',
    {
        tomteIsInstalled: (): Promise<boolean> => ipcRenderer.invoke('pgms-tomte-is-installed'),
        installTomte: (): Promise<boolean> => ipcRenderer.invoke('pgms-install-tomte'),
        uninstallTomte: (): Promise<boolean> => ipcRenderer.invoke('pgms-uninstall-tomte'),
        startTomte: (): Promise<void> => ipcRenderer.invoke('pgms-start-tomte'),
        anydeskIsInstalled: (): Promise<boolean> => ipcRenderer.invoke('pgms-anydesk-is-installed'),
        installAnydesk: (): Promise<boolean> => ipcRenderer.invoke('pgms-install-anydesk'),
        uninstallAnydesk: (): Promise<boolean> => ipcRenderer.invoke('pgms-uninstall-anydesk'),
        startAnydesk: (): Promise<void> => ipcRenderer.invoke('pgms-start-anydesk'),
        webfaiCreatorIsInstalled: (): Promise<boolean> => ipcRenderer.invoke('pgms-webfaic-is-installed'),
        installWebfaicreator: (): Promise<boolean> => ipcRenderer.invoke('pgms-install-webfaic'),
        uninstallWebfaicreator: (): Promise<boolean> => ipcRenderer.invoke('pgms-uninstall-webfaic'),
        startWebfaicreator: (): Promise<void> => ipcRenderer.invoke('pgms-start-webfaic'),
        isInProgress: (): Promise<Map<string, boolean>> => ipcRenderer.invoke('pgms-is-in-progress'),
        isCheckingInstallation: (): Promise<Map<string, boolean>> => ipcRenderer.invoke('pgms-is-checking-installation'),
    }
);

// todo: rewrite all apis to work like the aquarisapi
contextBridge.exposeInMainWorld('aquarisAPI', AquarisClientAPI);
contextBridge.exposeInMainWorld('dbusAPI', DbusClientAPI);
contextBridge.exposeInMainWorld('tomteAPI', TomteClientAPI);
contextBridge.exposeInMainWorld('webcamAPI', WebcamClientAPI);
