/*!
 * Copyright (c) 2019-2022 TUXEDO Computers GmbH <tux@tuxedocomputers.com>
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

import { tomteAPIHandle, TomteAPIFunctions, ITomteInformation} from "../../common/models/ITomteAPI"
const { ipcRenderer } = require('electron');

// for preload script
export const TomteClientAPI = {
    resetToDefaults: () => ipcRenderer.invoke(tomteAPIHandle, [TomteAPIFunctions.resetToDefaults]),
    getModuleDescription: (moduleName, langId) => ipcRenderer.invoke(tomteAPIHandle, [TomteAPIFunctions.getModuleDescription, moduleName, langId]),
    getTomteInformation: () => ipcRenderer.invoke(tomteAPIHandle, [TomteAPIFunctions.getTomteInformation]),
    removeModule: (name) => ipcRenderer.invoke(tomteAPIHandle, [TomteAPIFunctions.removeModule, name]),
    installModule: (name) => ipcRenderer.invoke(tomteAPIHandle, [TomteAPIFunctions.installModule, name]),
    unBlockModule: (name) => ipcRenderer.invoke(tomteAPIHandle, [TomteAPIFunctions.unBlockModue, name]),
    blockModule: (name) => ipcRenderer.invoke(tomteAPIHandle, [TomteAPIFunctions.blockModule, name]),
    setMode: (mode) => ipcRenderer.invoke(tomteAPIHandle, [TomteAPIFunctions.setMode, mode]),
}

// for render.d.ts typescript definition
export interface ITomteClientAPI {
    resetToDefaults: () => Promise<string>,
    getModuleDescription: (moduleName: string, langId: string) => Promise<string>,
    getTomteInformation: () => Promise<ITomteInformation>,
    removeModule: (name: string) => Promise<boolean>,
    installModule: (name: string) => Promise<boolean>,
    unBlockModule: (name: string) => Promise<boolean>,
    blockModule: (name: string) => Promise<boolean>,
    setMode: (mode: string) => Promise<boolean>,
}