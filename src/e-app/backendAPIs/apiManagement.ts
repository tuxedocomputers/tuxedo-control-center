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

import { IpcMain, IpcMainInvokeEvent } from "electron";

const debugAPICalls = false;

export function registerAPI (ipcMain: IpcMain, apiHandle: string, mainsideHandlers: Map<string, (...args: any[]) => any>): void {

    ipcMain.handle(apiHandle, async (event: IpcMainInvokeEvent, args: any[]): Promise<any> => {
        const mainsideFunction: (...args: any[]) => any = mainsideHandlers.get(args[0]);
        if (mainsideFunction === undefined) {
            throw Error(apiHandle + ': Undefined API function');
        } else {
            if (debugAPICalls) {
                console.log(`${apiHandle}: ${args[0]}(${args.slice(1)})`);
            }
            try {
                return await mainsideFunction.call(this, ...args.slice(1));
            } catch (err: unknown) {
                console.error(`Error in [${apiHandle}: ${args[0]}(${args.slice(1)})] => ${err}`);
            }
        }
    });
}

export function unregisterAPI(ipcMain: IpcMain, apiHandle: string): void {
    ipcMain.removeHandler(apiHandle);
}