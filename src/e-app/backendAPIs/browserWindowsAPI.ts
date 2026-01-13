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

import * as path from 'node:path';
import { app, BrowserWindow, globalShortcut, ipcMain, screen } from 'electron';
import { aquarisAPIHandle } from '../../common/models/IAquarisAPI';
import { dbusAPIHandle } from '../../common/models/IDbusAPI';
import type { WebcamConstraints } from '../../common/models/TccWebcamSettings';
import { unregisterAPI } from './apiManagement';
import { aquarisCleanUp } from './aquarisAPI';
import { displayBrightnessGnomeCleanup } from './brightnessAPI';
import { tccDBus } from './dbusAPI';
import { tray, userConfig } from './initMain';
export let tccWindow: Electron.BrowserWindow;
export let webcamWindow: Electron.BrowserWindow;
let primeWindow: Electron.BrowserWindow;

app.on('second-instance', (event: Event, cmdLine: string[], workingDir: string): void => {
    // If triggered by a second instance, find/show/start GUI
    activateTccGui();
});

app.on('will-quit', async (event: Event): Promise<void> => {
    // Prevent default quit action
    event.preventDefault();
    // Close window but do not quit application unless tray is gone
    if (tccWindow) {
        tccWindow.close();
        tccWindow = null;
    }

    if (!tray.isActive()) {
        // Actually quit
        globalShortcut.unregisterAll();
        displayBrightnessGnomeCleanup();
        await aquarisCleanUp();
        unregisterAPI(ipcMain, aquarisAPIHandle);
        if (tccDBus !== undefined) {
            tccDBus.disconnect();
            unregisterAPI(ipcMain, dbusAPIHandle);
        }
        await new Promise<void>((resolve: () => void): NodeJS.Timeout => setTimeout(resolve, 1000));

        app.exit(0);
        return;
    }
});

app.on('window-all-closed', (): void => {
    if (!tray.isActive()) {
        quitCurrentTccSession();
    }
});

let tccWindowLoading: boolean = false;

export async function activateTccGui(module?: string): Promise<void> {
    if (tccWindow) {
        if (tccWindow.isMinimized()) {
            tccWindow.restore();
        }
        tccWindow.focus();
        const baseURL: string = tccWindow.webContents.getURL().split('#')[0];
        if (module !== undefined) {
            tccWindow.loadURL(`${baseURL}#${module}`);
        }
    } else {
        if (!tccWindowLoading) {
            tccWindowLoading = true;
            const langId: string = await userConfig.get('langId');
            await createTccWindow(langId, module);
            tccWindowLoading = false;
        }
    }
}

export function quitCurrentTccSession(): void {
    if (tray.isActive()) {
        tray.destroy();
    }

    app.quit();
}
export async function createPrimeWindow(langId: string, primeSelectMode: string): Promise<void> {
    if (primeWindow && !primeWindow.isDestroyed()) {
        primeWindow.focus();
        return;
    }

    const windowWidth: number = 740;
    const windowHeight: number = 230;

    primeWindow = new BrowserWindow({
        title: 'Prime Select Configuration',
        width: windowWidth,
        height: windowHeight,
        frame: true,
        resizable: false,
        minWidth: windowWidth,
        minHeight: windowHeight,
        icon: path.join(__dirname, '../../../data/dist-data/tuxedo-control-center_256.png'),
        webPreferences: {
            sandbox: false,
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, '../preload.js'),
        },
        show: false,
    });

    // Workaround to set window title
    primeWindow.on('page-title-updated', function (e: Event): void {
        e.preventDefault();
    });

    primeWindow.setMenuBarVisibility(false);

    // Workaround to menu bar appearing after full screen state
    primeWindow.on('leave-full-screen', (): void => {
        primeWindow.setMenuBarVisibility(false);
    });

    const indexPath: string = path.join(__dirname, '..', '..', '..', 'ng-app', 'browser', langId, 'index.html');
    primeWindow.loadFile(indexPath, { hash: '/prime-dialog' });

    primeWindow.webContents.once('dom-ready', (): void => {
        primeWindow.webContents.send('set-prime-select-mode', primeSelectMode);
    });

    primeWindow.on('close', async function (): Promise<void> {
        primeWindow = null;
    });
}

async function createTccWindow(langId: string, module?: string): Promise<void> {
    let windowWidth: number = 1250;
    let windowHeight: number = 770;
    if (windowWidth > screen.getPrimaryDisplay().workAreaSize.width) {
        windowWidth = screen.getPrimaryDisplay().workAreaSize.width;
    }
    if (windowHeight > screen.getPrimaryDisplay().workAreaSize.height) {
        windowHeight = screen.getPrimaryDisplay().workAreaSize.height;
    }

    tccWindow = new BrowserWindow({
        title: 'TUXEDO Control Center',
        width: windowWidth,
        height: windowHeight,
        frame: true,
        resizable: true,
        minWidth: windowWidth,
        minHeight: windowHeight,
        icon: path.join(__dirname, '../../../data/dist-data/tuxedo-control-center_256.png'),
        webPreferences: {
            sandbox: false,
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, '../preload.js'),
        },
        show: false,
    });
    // Hide menu bar
    tccWindow.setMenuBarVisibility(false);
    // Workaround to menu bar appearing after full screen state
    tccWindow.on('leave-full-screen', (): void => {
        tccWindow.setMenuBarVisibility(false);
    });

    tccWindow.on('closed', (): void => {
        tccWindow = null;
    });

    tccWindow.on('close', async function (e: Event): Promise<void> {
        await tccDBus.setSensorDataCollectionStatus(false);

        let collectionStatus: boolean = undefined;
        let retryCount: number = 0;
        const maxRetries = 5;

        while (collectionStatus !== false && retryCount < maxRetries) {
            collectionStatus = await tccDBus.getSensorDataCollectionStatus();
            retryCount++;
        }

        if (collectionStatus !== false) {
            console.error('Failed to set sensor data collection status after multiple attempts');
        }
    });
    const indexPath: string = path.join(__dirname, '..', '..', '..', 'ng-app', 'browser', langId, 'index.html');
    if (module !== undefined) {
        await tccWindow.loadFile(indexPath, { hash: '/' + module });
    } else {
        await tccWindow.loadFile(indexPath);
    }
}
export function clearWebcamWindow(): void {
    webcamWindow: Electron.BrowserWindow = null;
}

export async function createWebcamPreview(langId: string, arg: WebcamConstraints): Promise<void> {
    const windowWidth: number = 640;
    const windowHeight: number = 480;

    webcamWindow = new BrowserWindow({
        title: 'Webcam',
        width: windowWidth,
        height: windowHeight,
        frame: true,
        resizable: false,
        minWidth: windowWidth,
        minHeight: windowHeight,
        icon: path.join(__dirname, '../../../data/dist-data/tuxedo-control-center_256.png'),
        webPreferences: {
            sandbox: false,
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, '../preload.js'),
        },
        show: false,
    });

    // Workaround to set window title
    webcamWindow.on('page-title-updated', function (e: Event): void {
        e.preventDefault();
    });

    // Hide menu bar
    webcamWindow.setMenuBarVisibility(false);
    // Workaround to menu bar appearing after full screen state
    webcamWindow.on('leave-full-screen', (): void => {
        webcamWindow.setMenuBarVisibility(false);
    });
    const indexPath: string = path.join(__dirname, '..', '..', '..', 'ng-app', 'browser', langId, 'index.html');
    webcamWindow.loadFile(indexPath, { hash: '/webcam-preview' });

    webcamWindow.webContents.once('dom-ready', (): void => {
        webcamWindow.webContents.send('setting-webcam-with-loading', arg);
    });

    webcamWindow.on('close', function (): void {
        tccWindow.webContents.send('external-webcam-preview-closed');
        webcamWindow = null;
    });

    webcamWindow.once('ready-to-show', (): void => {
        webcamWindow.webContents.send('setting-webcam-with-loading', arg);
        webcamWindow.show();
    });
}

ipcMain.on('close-app', (): void => {
    app.exit();
});

ipcMain.on('close-window', (): void => {
    tccWindow.close();
});

ipcMain.on('minimize-window', (): void => {
    tccWindow.minimize();
});

ipcMain.on('prime-window-close', (): void => {
    if (primeWindow) {
        primeWindow.close();
    }
});

ipcMain.on('prime-window-show', (): void => {
    if (primeWindow) {
        primeWindow.show();
    }
});
