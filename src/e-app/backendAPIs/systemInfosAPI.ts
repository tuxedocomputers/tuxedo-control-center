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
import * as fs from 'fs';

export const systemInfosURL: string = 'https://mytuxedo.de/public.php/dav/files/DcAeZk4TbBTTjRq/?accept=zip';
const systemInfosFilePath: string = '/tmp/tcc/systeminfos.sh';

async function getSystemInfos(): Promise<Buffer> {
    return new Promise<Buffer>(async (resolve: (value: Buffer | PromiseLike<Buffer>) => void, reject: (reason?: unknown) => void): Promise<void> => {
        try {
          const dataArray: Buffer[] = [];
          const request: ClientRequest = https.get(systemInfosURL, (response: IncomingMessage): void => {

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

          request.once('error', (err: Error): void => {
       reject(err);
          });
        } catch (err: unknown) {
          console.error("systemInfosAPI: getSystemInfos failed =>", err)
          reject(err);
        }
      });
}

function updateSystemInfosLabel(text: string): void {
    tccWindow.webContents.send('update-systeminfos-label', text);
}

async function runSystemInfos(ticketNumber: string): Promise<void> {
        return new Promise<void>(async (resolve: (value: void | PromiseLike<void>) => void, reject: (reason?: unknown) => void): Promise<void> => {
          let fileData: string;
          // Download
          try {
            updateSystemInfosLabel(`Downloading ${systemInfosURL}`);
            const data: Buffer = await getSystemInfos();
            fileData = data.toString();
          } catch (err: unknown) {
            console.error("systemInfosAPI: runSystemInfos: Download failed =>", err)
            reject('Failed to download systeminfos.sh');
            return;
          }

          // Write
          try {
            updateSystemInfosLabel(`Writing ${systemInfosFilePath}`);
            await writeTextFile(systemInfosFilePath, fileData, { mode: 0o755 });
          } catch (err: unknown) {
            console.error("systemInfosAPI: runSystemInfos: Write failed =>", err)
            reject(`Failed to write ${systemInfosFilePath}`);
            return;
          }
          
          try {
            const systemInfosAvailable: boolean = fs.existsSync(systemInfosFilePath);
            
            if (systemInfosAvailable) {
              const systemInfosFileSize: number = fs.statSync(systemInfosFilePath)?.size
            
              if (systemInfosFileSize === undefined || systemInfosFileSize === 0) {
                console.error("systemInfosAPI: runSystemInfos: Download failed")
                reject('Failed to download systeminfos.sh');
              }
            } else {
              console.error(`systemInfosAPI: ${systemInfosFilePath} does not exist`)
              reject(`${systemInfosFilePath} does not exist`);
            }
          } catch (err: unknown) {
            console.error("systemInfosAPI: runSystemInfos: Check failed =>", err)
            reject("Failed to check systeminfos.sh");
            return;
          }
          
          // Run
          try {
            updateSystemInfosLabel(`Running ${systemInfosFilePath}`);
            await execCmd('pkexec env DISPLAY=$DISPLAY XAUTHORITY=$XAUTHORITY XDG_SESSION_TYPE=$XDG_SESSION_TYPE XDG_CURRENT_DESKTOP=$XDG_CURRENT_DESKTOP sh ' + systemInfosFilePath + ' ' + ticketNumber);
          } catch (err: unknown) {
            console.error("systemInfosAPI: runSystemInfos failed =>", err)
            reject('systeminfos.sh failed');
          }
          resolve();
        });
      }

ipcMain.handle('run-systeminfos', async (event: IpcMainInvokeEvent, ticketNumber: string): Promise<void> => {
    return new Promise<void>(async (resolve: (value: void | PromiseLike<void>) => void, reject: (reason?: unknown) => void): Promise<void> => {
        resolve(runSystemInfos(ticketNumber));
    });
});