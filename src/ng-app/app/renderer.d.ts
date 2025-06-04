/*!
 * Copyright (c) 2019-2025 TUXEDO Computers GmbH <tux@tuxedocomputers.com>
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

import type { IAquarisClientAPI } from "../../e-app/preloadAPIs/AquarisClientAPI";
import type { EventEmitter } from 'node:events';
import type { IDrive } from "../../common/models/IDrive";
import type { IDisplayBrightnessInfo, IGeneralCPUInfo, ILogicalCoreInfo } from '../../common/models/ICpuInfos';
import type { ITccProfile } from "../../common/models/TccProfile";
import type { ITccSettings } from "../../common/models/TccSettings";
import type { ITccFanProfile } from "../../common/models/TccFanTable";
import type { IDbusClientAPI } from "../../e-app/preloadAPIs/DbusClientAPI";
import type { ITomteClientAPI } from "src/e-app/preloadAPIs/tomteClientAPI";
import type { IWebcamClientAPI } from "src/e-app/preloadAPIs/webcamClientAPI";
import type { WebcamConstraints } from "../../common/models/TccWebcamSettings";
import type { OpenDialogReturnValue, SaveDialogReturnValue } from "electron";
import type { BrightnessModeString } from "src/e-app/backendAPIs/brightnessAPI";

// todo: variables shouldn't be uppercase in every letter
interface IPC extends EventEmitter {
    getAppVersion: () => Promise<string>,
    closeApp: () => void,
    closeWindow: () => void,
    minimizeWindow: () => void,
    getProcessVersions: () => Promise<IProcessVersions>,
    getBrightnessMode: () => Promise<BrightnessModeString>,
    setBrightnessMode: (mode: BrightnessModeString) => void,
    getShouldUseDarkColors: () => Promise<boolean>,
    onUpdateBrightnessMode: (callback: () => void) => void,
    onDbusDead: (callback: () => void) => void,
    openExternal: (url: string) => void,
    getPath: (path: string) => Promise<string>,
    openFileDialog: (properties: Electron.OpenDialogOptions) => Promise<OpenDialogReturnValue>,
    saveFileDialog: (properties: Electron.OpenDialogOptions) => Promise<SaveDialogReturnValue>,
    primeWindowShow: () => void,
    primeWindowClose: () => void,
    onSetPrimeSelectMode: (callback: (event: any, primeSelectMode: string) => Promise<void>) => void,
    displayBrightnessNotSupportedGnome: () => boolean,
    setDisplayBrightnessGnome: (valuePercent: number) => void,
    setShutdownTime: (selectedHour: number , selectedMinute: number) => Promise<string>,
    cancelShutdown: () => Promise<string>,
    getScheduledShutdown: () => Promise<string>,
    issueReboot: () => Promise<void>,
    showTccWindow: () => Promise<void>,
    triggerLanguageChange: (languageId: string) => void,
    changeCryptPassword: (newPassword: string, oldPassword: string, confirmPassword: string) => Promise<string>,
    runSysteminfo: (ticketNumber: string) => Promise<void>,
    onUpdateSysteminfoLabel: (callback: (event: any, text: string) => void) => void,
    primeSelect: (selectedState: string) => Promise<string>,
}

interface POWER
  {
    getDGpuPowerState: (driver: string) => Promise<string>,
    getBusPath: (busPath: string) => string,
    getNvidiaDGpuCount: () => number,
    getAmdDGpuCount: () => number,
    isDGpuAvailable: () => boolean,
    isIGpuAvailable: () => boolean,
  }


interface VENDOR
  {
    getCpuVendor: () => Promise<string>,

  }

interface FS
  {
     writeTextFile: (filePath: string, fileData: string | Buffer, writeFileOptions?) => Promise<void>,
     readTextFile: (filePath: string) => Promise<string>,
     existsSync: (filePath: string) => boolean,
  }

interface DRIVECONTROLLER
  {
    getDrives: () => IDrive[]
  }
interface WEBCAM
{
    onVideoEnded: (callback: () => void) => void,
    onExternalWebcamPreviewClosed: (callback: () => void) => void,
    onApplyControls: (callback: () => void) => void,
    onSettingWebcamWithLoading: (callback: (event: any, config: WebcamConstraints) => void) => void,
    }

interface CPU
{
    getGeneralCpuInfoAsync: () => Promise<IGeneralCPUInfo>,
    getLogicalCoreInfoAsync: () =>  Promise<ILogicalCoreInfo[]>,
    getIntelPstateTurboValueAsync: () => Promise<boolean>,
}

interface BACKLIGHT
{
    getDisplayBrightnessInfo: () => IDisplayBrightnessInfo[]
}

interface CONFIG
{
    pkexecWriteConfigAsync: (settings: ITccSettings, customProfiles: ITccProfile[]) => Promise<boolean>,
    getDefaultFanProfiles: () => ITccFanProfile[],
    setActiveProfile: (profileId: string, stateId: string,settings: ITccSettings) => void,
    pkexecWriteCustomProfilesAsync: (customProfiles: ITccProfile[]) => Promise<boolean>,
    pkexecWriteCustomProfiles: (customProfiles: ITccProfile[]) => boolean,
}

interface COMP
{
    getHasAquaris: () => Promise<boolean>,
    getScalingDriverAcpiCpuFreq: () => string,
}

interface PGMS
{
    aptInstalled: () => Promise<boolean>,
    tomteInstalled: () => Promise<boolean>,
    installTomte: () => Promise<boolean>,
    uninstallTomte: () => Promise<boolean>,
    startTomte: () => Promise<void>,
    anydeskInstalled: () => Promise<boolean>,
    installAnydesk: () => Promise<boolean>,
    uninstallAnydesk: () => Promise<boolean>,
    startAnydesk: () => Promise<void>,
    webfaiCreatorInstalled: () => Promise<boolean>,
    installWebfaiCreator: () => Promise<boolean>,
    uninstallWebfaiCreator: () => Promise<boolean>,
    startWebfaiCreator: () => Promise<void>,
    isInProgress: () => Promise<Map<string, boolean>>,
    isCheckingInstallation: () => Promise<Map<string, boolean>>,
}

  declare global {
    interface Window {
      ipc: IPC,
      aquarisAPI: IAquarisClientAPI,
      dbusAPI: IDbusClientAPI,
      tomteAPI: ITomteClientAPI,
      webcamAPI: IWebcamClientAPI,
      fs: FS,
      driveController: DRIVECONTROLLER,
      webcam: WEBCAM,
      cpu: CPU,
      backlight: BACKLIGHT,
      config: CONFIG,
      comp: COMP,
      vendor: VENDOR,
      power: POWER,
      pgms: PGMS,
    }
  }


interface IPCReturnValue
  {
    data;
    error;
  }

interface IProcessVersions
  {
    node: string;
    electron: string;
    chrome: string;
  }
