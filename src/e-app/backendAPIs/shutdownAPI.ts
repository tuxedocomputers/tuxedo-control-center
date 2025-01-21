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
import type { IpcMainInvokeEvent } from "electron";
import { execCmd } from "./utilsAPI";
import * as fs from 'node:fs';

ipcMain.handle('ipc-set-shutdown-time', async (event: IpcMainInvokeEvent, selectedHour: number, selectedMinute: number): Promise<string> => {
    return new Promise<string>((resolve: (value: string | PromiseLike<string>) => void, reject: (reason?: unknown) => void): void => {
        execCmd("pkexec shutdown -h " + selectedHour + ":" + selectedMinute)
        .then((results: string) => {resolve(results)})
        .catch((): void => {resolve("")});
    });
});

ipcMain.handle('ipc-cancel-shutdown', async (event: IpcMainInvokeEvent): Promise<string> => {
    return new Promise<string>((resolve: (value: string | PromiseLike<string>) => void, reject: (reason?: unknown) => void): void => {
        execCmd("pkexec shutdown -c")
        .then((results: string): void => {resolve(results)})
        .catch((): void => {resolve("")});
    });
});

ipcMain.handle('ipc-get-scheduled-shutdown', async (event: IpcMainInvokeEvent): Promise<string> => {
    return new Promise<string>((resolve: (value: string | PromiseLike<string>) => void, reject: (reason?: unknown) => void): void => {
        const available: boolean = fs.existsSync("/run/systemd/shutdown/scheduled")
        if (available) {
            execCmd("cat /run/systemd/shutdown/scheduled")
            .then((results: string): void => {resolve(results)})
            .catch((err: unknown): void => {console.error("shutdownAPI: ipc-get-scheduled-shutdown failed =>", err); resolve("")});
        }
        resolve("")
    });
});

ipcMain.handle('ipc-issue-reboot', async (event: IpcMainInvokeEvent): Promise<string> => {
    return new Promise<string>((resolve: (value: string | PromiseLike<string>) => void, reject: (reason?: unknown) => void): void => {
        execCmd("reboot")
        .then((results: string): void => {resolve(results)})
        .catch((): void => {resolve("")});
    });
});
