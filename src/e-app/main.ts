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
import { ipcMain } from 'electron';
import { aquarisAPIHandle,} from '../common/models/IAquarisAPI';
import { dbusAPIHandle } from '../common/models/IDbusAPI';
import { aquarisHandlers } from './backendAPIs/aquarisBackendAPI';
import { dbusHandlers } from './backendAPIs/dbusBackendAPI';
import { registerAPI } from './backendAPIs/apiManagement'


// require all of the files that I have split off of main.ts
require('./backendAPIs/initMain');
require('./backendAPIs/browserWindows');
require('./backendAPIs/ipcBackendAPI');
require('./backendAPIs/miscBackendStuff');



// replace setImmediate since it seems to cause problems/not exist anymore
globalThis.setImmediate = ((fn, ...args) => global.setTimeout(fn, 0, ...args)) as unknown as typeof setImmediate;

// register AquarisAPI
registerAPI(ipcMain, aquarisAPIHandle, aquarisHandlers);
// register DbusAPI
registerAPI(ipcMain, dbusAPIHandle, dbusHandlers);