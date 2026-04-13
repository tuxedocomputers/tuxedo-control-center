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

import * as fs from 'node:fs';
import type { ClientRequest, IncomingMessage } from 'node:http';
import * as https from 'node:https';
import { type IpcMainInvokeEvent, ipcMain } from 'electron';
import { execCommandAsync } from '../../common/classes/Utils';
import { tccWindow } from './browserWindowsAPI';
import { execCmd, writeTextFile } from './utilsAPI';

export const systemInfosURL: string =
    'https://raw.githubusercontent.com/tuxedocomputers/tuxedo-systeminfos/refs/heads/main/files/usr/bin/systeminfos.sh';
const systemInfosTmpFilePath: string = '/tmp/tcc/systeminfos.sh';

async function getSystemInfos(): Promise<Buffer> {
    return new Promise<Buffer>(
        (resolve: (value: Buffer | PromiseLike<Buffer>) => void, reject: (reason?: unknown) => void) => {
            const dataChunks: Buffer[] = [];

            const request: ClientRequest = https.get(systemInfosURL, (response: IncomingMessage): void => {
                response.on('data', (chunk: Buffer): void => {
                    dataChunks.push(chunk);
                });

                response.once('end', (): void => {
                    resolve(Buffer.concat(dataChunks));
                });

                response.once('error', (err: unknown): void => {
                    reject(err);
                });
            });

            request.once('error', (err: unknown): void => {
                reject(err);
            });
        },
    );
}

function updateSystemInfosLabel(text: string): void {
    tccWindow.webContents.send('update-systeminfos-label', text);
}

async function runSystemInfos(ticketNumber: string): Promise<void> {
    try {
        const systemInfosPackagePath: string = (await execCommandAsync('which tuxedo-systeminfo')).toString().trim();
        const systeminfoPackageAvailable: boolean = !!systemInfosPackagePath;

        let systemInfosPath: string = '';

        if (!systeminfoPackageAvailable) {
            if (!fs.existsSync(systemInfosTmpFilePath)) {
                console.log(
                    `systemInfosAPI: runSystemInfos: tuxedo-systeminfo does not exist, downloading ${systemInfosTmpFilePath}`,
                );

                const fileData: string = await downloadSystemInfos();
                await writeSystemInfosFile(fileData, systemInfosTmpFilePath);
            } else {
                console.log(
                    `systemInfosAPI: runSystemInfos: tuxedo-systeminfo does not exist, but ${systemInfosTmpFilePath} does`,
                );
            }

            systemInfosPath = systemInfosTmpFilePath;
        } else {
            console.log(`systemInfosAPI: runSystemInfos: Using tuxedo-systeminfo`);
            systemInfosPath = systemInfosPackagePath;
        }

        await verifySystemInfosFile(systemInfosPath);
        await executeSystemInfosScript(ticketNumber, systemInfosPath);
    } catch (err: unknown) {
        throw new Error(`systemInfosAPI: runSystemInfos failed => ${err}`);
    }
}

async function downloadSystemInfos(): Promise<string> {
    updateSystemInfosLabel(`Downloading ${systemInfosURL}`);

    try {
        const data: Buffer = await getSystemInfos();
        return data.toString();
    } catch (err: unknown) {
        throw new Error(`systemInfosAPI: downloadSystemInfos failed => ${err}`);
    }
}

async function writeSystemInfosFile(fileData: string, systemInfosFilePath: string): Promise<void> {
    updateSystemInfosLabel(`Writing ${systemInfosFilePath}`);

    try {
        await writeTextFile(systemInfosFilePath, fileData, { mode: 0o755 });
    } catch (_err: unknown) {
        throw new Error(`systemInfosAPI: writeSystemInfosFile: Failed to write ${systemInfosFilePath}`);
    }
}

async function verifySystemInfosFile(systemInfosFilePath: string): Promise<void> {
    try {
        const exists: boolean = fs.existsSync(systemInfosFilePath);

        if (!exists) {
            throw new Error(`${systemInfosFilePath} does not exist`);
        }

        const stats: fs.Stats = fs.statSync(systemInfosFilePath);

        if (stats?.size === 0) {
            throw new Error(`systemInfosAPI: verifySystemInfosFile: ${systemInfosFilePath} file is empty`);
        }
    } catch (err: unknown) {
        throw new Error(`systemInfosAPI: verifySystemInfosFile: Failed to verify ${systemInfosFilePath} => ${err}`);
    }
}

async function executeSystemInfosScript(ticketNumber: string, systemInfosFilePath: string): Promise<void> {
    updateSystemInfosLabel(`Running ${systemInfosFilePath}`);

    try {
        await execCmd(
            `pkexec env DISPLAY=$DISPLAY XAUTHORITY=$XAUTHORITY XDG_SESSION_TYPE=$XDG_SESSION_TYPE XDG_CURRENT_DESKTOP=$XDG_CURRENT_DESKTOP sh ${systemInfosFilePath} ${ticketNumber}`,
        );
    } catch (err: unknown) {
        throw new Error(`systemInfosAPI: executeSystemInfosScript: systeminfos.sh failed => ${err}`);
    }
}

ipcMain.handle('run-systeminfos', async (_event: IpcMainInvokeEvent, ticketNumber: string): Promise<void> => {
    return runSystemInfos(ticketNumber);
});
