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

import { ipcMain } from "electron";
import { aquarisAPIHandle } from "../common/models/IAquarisAPI";
import { dbusAPIHandle } from "../common/models/IDbusAPI";
import { aquarisHandlers } from "./backendAPIs/aquarisAPI";
import { dbusHandlers } from "./backendAPIs/dbusAPI";
import { registerAPI } from "./backendAPIs/apiManagement";
import { tomteAPIHandle } from "../common/models/ITomteAPI";
import { webcamAPIHandle } from "../common/models/IWebcamAPI";
import { webcamHandlers } from "./backendAPIs/webcamAPI";
import { tomteHandlers } from "./backendAPIs/tomteAPI";

require("./backendAPIs/initMain");
require("./backendAPIs/browserWindowsAPI");
require("./backendAPIs/ipcBackendAPI");
require("./backendAPIs/webcamAPI");

// replace setImmediate since it seems to cause problems/not exist anymore
globalThis.setImmediate = ((fn: any, ...args: any[]): NodeJS.Timeout =>
    global.setTimeout(fn, 0, ...args)) as unknown as typeof setImmediate;

registerAPI(ipcMain, aquarisAPIHandle, aquarisHandlers);
registerAPI(ipcMain, dbusAPIHandle, dbusHandlers);
registerAPI(ipcMain, tomteAPIHandle, tomteHandlers);
registerAPI(ipcMain, webcamAPIHandle, webcamHandlers);
