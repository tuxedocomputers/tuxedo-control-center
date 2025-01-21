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
import * as https from "node:https";
import { tccWindow } from "./browserWindowsAPI";
import { execCmd, writeTextFile } from "./utilsAPI";
import type { ClientRequest, IncomingMessage } from "node:http";

export const systeminfosURL: string = 'https://mytuxedo.de/index.php/s/DcAeZk4TbBTTjRq/download';

async function getSystemInfos(): Promise<Buffer> {
    return new Promise<Buffer>(async (resolve: (value: Buffer | PromiseLike<Buffer>) => void, reject: (reason?: unknown) => void): Promise<void> => {
        try {
          const dataArray: Buffer[] = [];
          const req: ClientRequest = https.get(systeminfosURL, (response: IncomingMessage): void => {

            response.on('data', (data: any): void => {
              dataArray.push(data);
            });

            response.once('end', (): void => {
              resolve(Buffer.concat(dataArray));
            });

            response.once('error', (err: Error): void => {
              reject(err);
            });

          });

          req.once('error', (err: Error): void => {
       reject(err);
          });
        } catch (err: unknown) {
          console.error("systemInfosAPI: getSystemInfos failed =>", err)
          reject(err);
        }
      });
}

  let systeminfoFilePath: string = '/tmp/tcc/systeminfos.sh';
    function updateSystemInfoLabel(text: string): void
    {
        tccWindow.webContents.send('ipc-update-system-info-label', text);
    }

    async function runSysteminfo(ticketNumber: string): Promise<void> {
        return new Promise<void>(async (resolve: (value: void | PromiseLike<void>) => void, reject: (reason?: unknown) => void): Promise<void> => {
          let fileData: string;
          // Download file
          try {
            updateSystemInfoLabel('Fetching: ' + systeminfosURL);
            const data: Buffer = await getSystemInfos();
            fileData = data.toString();
          } catch (err: unknown) {
            console.error("systemInfosAPI: runSysteminfo download failed =>", err)
            reject('Download failed'); return;
          }

          // Write file
          try {
            updateSystemInfoLabel('Writing file: ' + systeminfoFilePath);
            await writeTextFile(systeminfoFilePath, fileData, { mode: 0o755 });
          } catch (err: unknown) {
            console.error("systemInfosAPI: runSysteminfo write failed =>", err)
            reject('Failed to write file ' + systeminfoFilePath); return;
          }

          // Run
          try {
            updateSystemInfoLabel('Running systeminfos.sh');
            await execCmd('pkexec env DISPLAY=$DISPLAY XAUTHORITY=$XAUTHORITY XDG_SESSION_TYPE=$XDG_SESSION_TYPE XDG_CURRENT_DESKTOP=$XDG_CURRENT_DESKTOP sh ' + systeminfoFilePath + ' ' + ticketNumber);
          } catch (err: unknown) {
            console.error("systemInfosAPI: runSysteminfo run failed =>", err)
            reject('Failed to execute script');
          }
          resolve();
        });
      }

ipcMain.handle('ipc-run-systeminfos', async (event: IpcMainInvokeEvent, ticketNumber: string): Promise<void> => {
    return new Promise<void>(async (resolve: (value: void | PromiseLike<void>) => void, reject: (reason?: unknown) => void): Promise<void> => {
        resolve(runSysteminfo(ticketNumber));
    });
});