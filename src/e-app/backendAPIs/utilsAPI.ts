/*!
 * Copyright (c) 2019-2024 TUXEDO Computers GmbH <tux@tuxedocomputers.com>
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

import { ipcMain, app, dialog, shell } from "electron";
import type { IpcMainEvent, IpcMainInvokeEvent } from "electron";
import * as fs from "node:fs";
import * as path from "node:path";
import * as child_process from "node:child_process";
import {
    userConfig,
    updateTrayProfiles,
    watchOption,
    translation,
} from "./initMain";
import type { OpenDialogReturnValue, SaveDialogReturnValue } from "electron/main";
import { tccWindow } from "./browserWindowsAPI";
import { systeminfosURL } from "./systemInfosAPI"

export const cwd: string = process.cwd();
export let environmentIsProduction: boolean = app.isPackaged;

ipcMain.handle('fs-write-text-file', async (event: IpcMainInvokeEvent, filePath: string, fileData: string | Buffer, writeFileOptions?: fs.WriteFileOptions): Promise<void> => {
    return writeTextFile(filePath, fileData, writeFileOptions);
});

ipcMain.handle('fs-read-text-file', async (event: IpcMainInvokeEvent, filePath: string): Promise<string> => {
    return readTextFile(filePath);
});

ipcMain.on('get-cwd-sync', (event: IpcMainEvent): void => {
    event.returnValue = { data: process.cwd() }
});


ipcMain.handle('get-app-version', (event: IpcMainInvokeEvent): Promise<string> => {
    return new Promise<string>((resolve: (value: string | PromiseLike<string>) => void, reject: (reason?: unknown) => void): void => {
        let requestedInfo: string = app.getVersion();
        resolve(requestedInfo);
    });
});

ipcMain.handle('get-cwd', (event: IpcMainInvokeEvent): Promise<string> => {
    return new Promise<string>((resolve: (value: string | PromiseLike<string>) => void, reject: (reason?: unknown) => void): void => {
        let requestedInfo: string = process.cwd();
        resolve(requestedInfo);
    });
});

ipcMain.handle('get-process-versions', (event: IpcMainInvokeEvent): Promise<NodeJS.ProcessVersions> => {
    return new Promise<NodeJS.ProcessVersions>((resolve: (value: NodeJS.ProcessVersions | PromiseLike<NodeJS.ProcessVersions>) => void, reject: (reason?: unknown) => void): void => {
        let requestedInfo: NodeJS.ProcessVersions = process.versions;
        resolve(requestedInfo);
    });
});

ipcMain.handle('show-save-dialog', async (event: IpcMainInvokeEvent, arg: Electron.SaveDialogOptions): Promise<SaveDialogReturnValue> => {
    return new Promise<SaveDialogReturnValue>((resolve: (value: SaveDialogReturnValue | PromiseLike<SaveDialogReturnValue>) => void, reject: (reason?: unknown) => void): void => {
        let results: Promise<SaveDialogReturnValue> = dialog.showSaveDialog(arg);
        resolve(results);
    });
});


ipcMain.handle('show-open-dialog', async (event: IpcMainInvokeEvent, arg: Electron.OpenDialogOptions): Promise<OpenDialogReturnValue> => {
    return new Promise<OpenDialogReturnValue>(async (resolve: (value: OpenDialogReturnValue | PromiseLike<OpenDialogReturnValue>) => void, reject: (reason?: unknown) => void): Promise<void> => {
        let results: Promise<OpenDialogReturnValue> = dialog.showOpenDialog(arg);
        resolve(results);
    });
});

// todo: make cleaner
ipcMain.handle('ipc-get-path', (event: IpcMainInvokeEvent, arg: any): Promise<string>  => {
    return new Promise<string>((resolve: (value: string | PromiseLike<string>) => void, reject: (reason?: unknown) => void): void => {
        let requestedPath: string = app.getPath(arg);
        resolve(requestedPath);
    });
});


ipcMain.on('show-tcc-window', (event: IpcMainEvent,): void => {
    if(!tccWindow.isVisible()) {
        tccWindow.show();
    }
});

ipcMain.on('utils-get-systeminfos-url-sync', (event: IpcMainEvent): void => {
    event.returnValue = systeminfosURL;
});

export async function changeLanguage(newLangId: string): Promise<void> {
    if (newLangId !== await userConfig.get('langId')) {
        await userConfig.set('langId', newLangId);
        await loadTranslation(newLangId);
        await updateTrayProfiles();
        if (tccWindow) {
            const indexPath: string = path.join(__dirname, '..', '..', '..', 'ng-app', newLangId, 'index.html');
            await tccWindow.loadFile(indexPath);
        }
    }
}

ipcMain.on('ipc-open-external', (event: IpcMainEvent, url: string): void => {
    // Explanation: openExternal can theoretically pose a security risk
    // that's why we only let weblinks happen.
    // https://benjamin-altpeter.de/shell-openexternal-dangers/
    if(url.startsWith('http://') || url.startsWith('https://'))
    {
        shell.openExternal(url);
    }
    else
    {
        console.error("utilsAPI: Link violates security! Needs to be a weblink! Link: " + url);
    }
});

export async function writeTextFile(filePath: string, fileData: string | Buffer, writeFileOptions?: fs.WriteFileOptions): Promise<void>  {
    return new Promise<void>((resolve: (value: void | PromiseLike<void>) => void, reject: (reason?: unknown) => void): void => {
    try {
        if (!fs.existsSync(path.dirname(filePath))) {
            fs.mkdirSync(path.dirname(filePath), { mode: 0o755, recursive: true });
        }
        fs.writeFile(filePath, fileData, writeFileOptions, (err: unknown): void => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      } catch (err: unknown) {
        console.error("utilsAPI: writeTextFile failed =>", err)
        reject(err);
      }
    });
}

export async function readTextFile(filePath: string): Promise<string> {
    return new Promise<string>((resolve: (value: string | PromiseLike<string>) => void, reject: (reason?: unknown) => void): void => {
        try {
          fs.readFile(filePath,(err: unknown, data: Buffer): void => {
            if (err) {
              reject(err);
            } else {
              resolve(data + "");
            }
          });
        } catch (err: unknown) {
          console.error("utilsAPI: readTextFile failed =>", err)
          reject(err);
        }
      });
}

ipcMain.on('fs-file-exists-sync', (event: IpcMainEvent, filePath: string): void => {
    event.returnValue = fs.existsSync(filePath);
});


ipcMain.on('trigger-language-change', (event: IpcMainEvent, arg: string): void => {
    const langId: string = arg;
    changeLanguage(langId);
});

export async function execCmd(cmd: string): Promise<string> {
    return new Promise<string>((resolve: (value: string | PromiseLike<string>) => void, reject: (reason?: unknown) => void): void => {
    child_process.exec(cmd, (err: unknown, stdout: string, stderr: string): void => {
        if (err) {
            reject(stderr);
        } else {
            resolve(stdout);
        }
    });
});
}

export function execCmdSync(cmd: string):string {
        try {
            return child_process.execSync(cmd).toString();
        } catch (err: unknown) {
            console.error("utilsAPI: execCmdSync failed =>", err)
            return err.toString();
        }
}

// todo: rename into execFileAsync or somehow else indicate that function is async
export async function execFile(arg: string): Promise<{ data: string, error: unknown}> {
    return new Promise<{ data: string, error: unknown}>( (resolve: (value: { data: string, error: unknown} | PromiseLike<{ data: string, error: unknown}>) => void, reject: (reason?: unknown) => void): void => {
        let strArg: string = arg;
        let cmdList: string[] = strArg.split(' ');
        let cmd: string = cmdList.shift();
        child_process.execFile(cmd, cmdList, (err: unknown, stdout: string, stderr: string): void => {
                    if (err) {
                        reject({ data: stderr, error: err });
                    } else {
                        resolve({ data: stdout, error: err });
                    }
        });
    });
}

export async function execFileSync(arg: string): Promise<unknown | string> {
        let strArg: string = arg;
        let cmdList: string[] = strArg.split(' ');
        let cmd: string = cmdList.shift();
        let data: Buffer;
        try {
            data = child_process.execFileSync(cmd, cmdList);
            return data.toString();
        }
        catch (err: unknown) {
            console.error("utilsAPI: execFileSync failed =>", err)
            return err;
        }
}


export async function loadTranslation(langId: string): Promise<void> {

    // Watch mode Workaround: Waiting for translation when starting in watch mode
    let canLoadTranslation: boolean = false;
    while (watchOption && !canLoadTranslation) {
        try {
            await translation.loadLanguage(langId);
            canLoadTranslation = true;
        } catch (err: unknown) {
            console.error("translationAndTheme: loadTranslation failed =>", err)
            await new Promise<void>((resolve: () => void): NodeJS.Timeout => setTimeout(resolve, 3000));
        }
    }
    // End watch mode workaround

    try {
        await translation.loadLanguage(langId);
    } catch (err: unknown) {
        console.log('Failed loading translation => ' + err);
        const fallbackLangId = 'en';
        console.log('fallback to \'' + fallbackLangId + '\'');
        try {
            await translation.loadLanguage(fallbackLangId);
        } catch (err: unknown) {
            console.error("translationAndTheme: loadLanguage failed =>", err)
        }
    }
}