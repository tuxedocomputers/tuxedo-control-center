/*!
 * Copyright (c) 2019-2026 TUXEDO Computers GmbH <tux@tuxedocomputers.com>
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

import { WebcamAPIFunctions, webcamAPIHandle } from '../../common/models/IWebcamAPI';
import type { WebcamConstraints, WebcamPreset } from '../../common/models/TccWebcamSettings';

const { ipcRenderer } = require('electron');

// for preload script
export const WebcamClientAPI = {
    createWebcamPreview: (webcamConfig: WebcamConstraints): Promise<void> =>
        ipcRenderer.invoke(webcamAPIHandle, [WebcamAPIFunctions.createWebcamPreview, webcamConfig]),
    closeWebcamPreview: (): Promise<void> =>
        ipcRenderer.invoke(webcamAPIHandle, [WebcamAPIFunctions.closeWebcamPreview]),
    setWebcamWithLoading: (webcamConfig: WebcamConstraints): Promise<void> =>
        ipcRenderer.invoke(webcamAPIHandle, [WebcamAPIFunctions.settingWebcamWithLoading, webcamConfig]),
    videoEnded: (): Promise<void> => ipcRenderer.invoke(webcamAPIHandle, [WebcamAPIFunctions.videoEnded]),
    applyControls: (): Promise<void> => ipcRenderer.invoke(webcamAPIHandle, [WebcamAPIFunctions.applyControls]),
    readWebcamSettings: (): Promise<WebcamPreset[]> =>
        ipcRenderer.invoke(webcamAPIHandle, [WebcamAPIFunctions.readWebcamSettings]),
    pkexecWriteWebcamConfigAsync: (settings: WebcamPreset[]): Promise<boolean> =>
        ipcRenderer.invoke(webcamAPIHandle, [WebcamAPIFunctions.writeConfig, settings]),
    readV4l2Names: (path: string): Promise<string[][]> =>
        ipcRenderer.invoke(webcamAPIHandle, [WebcamAPIFunctions.readv4l2Values, path]),
    readV4l2NamesCWD: (path: string): Promise<string[][]> =>
        ipcRenderer.invoke(webcamAPIHandle, [WebcamAPIFunctions.readv4l2ValuesCwd, path]),
    getSelectedWebcamSettings: (sWebcamPath: string): Promise<string> =>
        ipcRenderer.invoke(webcamAPIHandle, [WebcamAPIFunctions.getSelectedWebcamSettings, sWebcamPath]),
    executeWebcamCtrls: (devicePath: string, parameter: string, value: number | string): Promise<string> =>
        ipcRenderer.invoke(webcamAPIHandle, [WebcamAPIFunctions.executeWebcamCtrls, devicePath, parameter, value]),
    executeFilteredCtrls: (devicePath: string, filteredControls: string): Promise<string> =>
        ipcRenderer.invoke(webcamAPIHandle, [
            WebcamAPIFunctions.executeFilteredWebcamCtrls,
            devicePath,
            filteredControls,
        ]),
    getWebcamPaths: (): Promise<string> => ipcRenderer.invoke(webcamAPIHandle, [WebcamAPIFunctions.getWebcamPaths]),
};

// for render.d.ts typescript definition
export interface IWebcamClientAPI {
    createWebcamPreview: (webcamConfig: WebcamConstraints) => void;
    closeWebcamPreview: () => void;
    setWebcamWithLoading: (webcamConfig: WebcamConstraints) => void;
    videoEnded: () => void;
    applyControls: () => void;
    readWebcamSettings: () => Promise<WebcamPreset[]>;
    pkexecWriteWebcamConfigAsync: (settings: WebcamPreset[]) => Promise<boolean>;
    readV4l2Names: (path: string) => Promise<string[][]>;
    readV4l2NamesCWD: (path: string) => Promise<string[][]>;
    getSelectedWebcamSettings: (sWebcamPath: string) => Promise<string>;
    executeWebcamCtrls: (devicePath: string, parameter: string, value: number | string) => Promise<string>;
    executeFilteredCtrls: (devicePath: string, filteredControls: string) => Promise<string>;
    getWebcamPaths: () => Promise<string>;
}
