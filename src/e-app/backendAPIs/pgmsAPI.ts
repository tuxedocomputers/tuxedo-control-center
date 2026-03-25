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

import type { IpcMainInvokeEvent } from 'electron';
import { ipcMain } from 'electron';
import { ProgramManagementService } from './pgmsService';

const pgms = new ProgramManagementService();
const aptName = 'apt';
const tomteName = 'tuxedo-tomte';
const webfaiCreatorProgramName = 'tuxedo-webfai-creator';

ipcMain.handle('pgms-is-in-progress', (_event: IpcMainInvokeEvent): Promise<Map<string, boolean>> => {
    return new Promise<Map<string, boolean>>(
        (
            resolve: (value: Map<string, boolean> | PromiseLike<Map<string, boolean>>) => void,
            _reject: (reason?: unknown) => void,
        ): void => {
            resolve(pgms.isInProgress);
        },
    );
});

ipcMain.handle('pgms-apt-installed', (_event: IpcMainInvokeEvent): Promise<boolean> => {
    return new Promise<boolean>(
        (resolve: (value: boolean | PromiseLike<boolean>) => void, _reject: (reason?: unknown) => void): void => {
            resolve(pgms.isInstalled(aptName));
        },
    );
});

ipcMain.handle('pgms-is-checking-installation', (_event: IpcMainInvokeEvent): Promise<Map<string, boolean>> => {
    return new Promise<Map<string, boolean>>(
        (
            resolve: (value: Map<string, boolean> | PromiseLike<Map<string, boolean>>) => void,
            _reject: (reason?: unknown) => void,
        ): void => {
            resolve(pgms.isCheckingInstallation);
        },
    );
});

ipcMain.handle('pgms-tomte-installed', (_event: IpcMainInvokeEvent): Promise<boolean> => {
    return new Promise<boolean>(
        (resolve: (value: boolean | PromiseLike<boolean>) => void, _reject: (reason?: unknown) => void): void => {
            resolve(pgms.isInstalled(tomteName));
        },
    );
});

ipcMain.handle('pgms-install-tomte', (_event: IpcMainInvokeEvent): Promise<boolean> => {
    return new Promise<boolean>(
        (resolve: (value: boolean | PromiseLike<boolean>) => void, _reject: (reason?: unknown) => void): void => {
            resolve(pgms.install(tomteName));
        },
    );
});

ipcMain.handle('pgms-uninstall-tomte', (_event: IpcMainInvokeEvent): Promise<boolean> => {
    return new Promise<boolean>(
        (resolve: (value: boolean | PromiseLike<boolean>) => void, _reject: (reason?: unknown) => void): void => {
            resolve(pgms.remove(tomteName));
        },
    );
});

ipcMain.handle('pgms-start-tomte', (_event: IpcMainInvokeEvent): Promise<void> => {
    return new Promise<void>(
        (resolve: (value: void | PromiseLike<void>) => void, _reject: (reason?: unknown) => void): void => {
            resolve(pgms.run(tomteName));
        },
    );
});

ipcMain.handle('pgms-webfai-creator-installed', (_event: IpcMainInvokeEvent): Promise<boolean> => {
    return new Promise<boolean>(
        (resolve: (value: boolean | PromiseLike<boolean>) => void, _reject: (reason?: unknown) => void): void => {
            resolve(pgms.isInstalled(webfaiCreatorProgramName));
        },
    );
});

ipcMain.handle('pgms-install-webfai-creator', (_event: IpcMainInvokeEvent): Promise<boolean> => {
    return new Promise<boolean>(
        (resolve: (value: boolean | PromiseLike<boolean>) => void, _reject: (reason?: unknown) => void): void => {
            resolve(pgms.install(webfaiCreatorProgramName));
        },
    );
});

ipcMain.handle('pgms-uninstall-webfai-creator', (_event: IpcMainInvokeEvent): Promise<boolean> => {
    return new Promise<boolean>(
        (resolve: (value: boolean | PromiseLike<boolean>) => void, _reject: (reason?: unknown) => void): void => {
            resolve(pgms.remove(webfaiCreatorProgramName));
        },
    );
});

ipcMain.handle('pgms-start-webfai-creator', (_event: IpcMainInvokeEvent): Promise<void> => {
    return new Promise<void>(
        (resolve: (value: void | PromiseLike<void>) => void, _reject: (reason?: unknown) => void): void => {
            resolve(pgms.run(webfaiCreatorProgramName));
        },
    );
});
