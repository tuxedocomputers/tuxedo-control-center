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

/* 
#############################################################
############## Window and Session Management ################
#############################################################
*/

import { aquarisCleanUp } from './aquarisBackendAPI';
import * as path from 'path';
import { tccDBus } from './dbusBackendAPI';
import { app, BrowserWindow, globalShortcut, ipcMain, powerMonitor, screen } from 'electron'
import { tray, userConfig } from './initMain';
import { displayBrightnessGnomeCleanup } from './miscBackendStuff';
import { unregisterAPI } from './apiManagement';
import { aquarisAPIHandle } from '../../common/models/IAquarisAPI';
import { dbusAPIHandle } from '../../common/models/IDbusAPI';
import { loadTranslation } from './translationAndTheme';
export let tccWindow: Electron.BrowserWindow;
export let aquarisWindow: Electron.BrowserWindow;
export let webcamWindow: Electron.BrowserWindow;
export let primeWindow: Electron.BrowserWindow;

app.on('second-instance', (event, cmdLine, workingDir) => {
    // If triggered by a second instance, find/show/start GUI
    activateTccGui();
});

app.on("ready", () => {
    powerMonitor.on("resume", () => {
        if (tccWindow) {
            tccWindow.webContents.send("wakeup-from-suspend");
        }
    });
});

app.on('will-quit', async (event) => {
    // Prevent default quit action
    event.preventDefault();
    // Close window but do not quit application unless tray is gone
    if (tccWindow) {
        tccWindow.close();
        tccWindow = null;
    }
    if (aquarisWindow) {
        aquarisWindow.close();
        aquarisWindow = null;
    }
    if (!tray.isActive()) {
        // Actually quit
        globalShortcut.unregisterAll();
        displayBrightnessGnomeCleanup();
        await aquarisCleanUp();
        unregisterAPI(ipcMain, aquarisAPIHandle);
        if (tccDBus !== undefined) {
            tccDBus.disconnect();
            unregisterAPI(ipcMain, dbusAPIHandle)
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
        app.exit(0);
        return;
    }
});

app.on('window-all-closed', () => {
    if (!tray.isActive()) {
        quitCurrentTccSession();
    }
});



let tccWindowLoading = false;

export async function activateTccGui(module?: string) {
    if (tccWindow) {
        if (tccWindow.isMinimized()) { tccWindow.restore(); }
        tccWindow.focus();
        const baseURL = tccWindow.webContents.getURL().split("#")[0];
        if (module !== undefined) {
            tccWindow.loadURL(baseURL + '#' + module);
        }
    } else {
        if (!tccWindowLoading) {
            tccWindowLoading = true;
            const langId = await userConfig.get('langId');
            await createTccWindow(langId, module);
            tccWindowLoading = false;
        }
    }
}

// function seems to be unused :)
// function activateAquarisGui() {
//     if (aquarisWindow) {
//         if (aquarisWindow.isMinimized()) { aquarisWindow.restore(); }
//         aquarisWindow.focus();
//     } else {
//         userConfig.get('langId').then(langId => {
//             createAquarisControl(langId);
//         });
//     }
// }

export function quitCurrentTccSession() {
    if (tray.isActive()) {
        tray.destroy();
    }

    app.quit();
}

/* 
########################################################
################ Browser Windows #######################
########################################################
*/

export async function createPrimeWindow(langId: string, primeSelectMode: string) {
    if (primeWindow && !primeWindow.isDestroyed()) {
        primeWindow.focus();
        return;
    }

    let windowWidth = 740;
    let windowHeight = 230;

    primeWindow = new BrowserWindow({
        title: "Prime Select Configuration",
        width: windowWidth,
        height: windowHeight,
        frame: true,
        resizable: false,
        minWidth: windowWidth,
        minHeight: windowHeight,
        icon: path.join(
            __dirname,
            "../../../data/dist-data/tuxedo-control-center_256.png"
        ),
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, '../preload.js')
        },
        show: false,
    });

    // Workaround to set window title
    primeWindow.on("page-title-updated", function (e) {
        e.preventDefault();
    });

    primeWindow.setMenuBarVisibility(false);

    // Workaround to menu bar appearing after full screen state
    primeWindow.on("leave-full-screen", () => {
        primeWindow.setMenuBarVisibility(false);
    });

    const indexPath = path.join(
        __dirname,
        "..",
        "..",
        "..",
        "ng-app",
        langId,
        "index.html"
    );
    primeWindow.loadFile(indexPath, { hash: "/prime-dialog" });

    primeWindow.webContents.once("dom-ready", () => {
        primeWindow.webContents.send("set-prime-select-mode", primeSelectMode);
    });

    primeWindow.on("close", async function () {
        primeWindow = null;
    });
}

async function createTccWindow(langId: string, module?: string) {
    let windowWidth = 1250;
    let windowHeight = 770;
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
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, '../preload.js')
        },
        show: false
    });
    // Hide menu bar
    tccWindow.setMenuBarVisibility(false);
    // Workaround to menu bar appearing after full screen state
    tccWindow.on('leave-full-screen', () => { tccWindow.setMenuBarVisibility(false); });

    tccWindow.on('closed', () => {
        tccWindow = null;
    });

    tccWindow.on('close', async function (e) {
        await tccDBus.setSensorDataCollectionStatus(false)
    
        let collectionStatus = undefined
        let retryCount = 0
        const maxRetries = 5
        
        while (collectionStatus !== false && retryCount < maxRetries) {
            collectionStatus = await tccDBus.getSensorDataCollectionStatus()
            retryCount++
        }
    
        if (collectionStatus !== false) {
            console.error('Failed to set sensor data collection status after multiple attempts')
        }
    });
    const indexPath = path.join(__dirname, '..', '..', '..', 'ng-app', langId, 'index.html');
    if (module !== undefined) {
        await tccWindow.loadFile(indexPath, { hash: '/' + module });
    } else {
        await tccWindow.loadFile(indexPath);
    }
    tccWindow.show();
}

function createAquarisControl(langId: string) {
    let windowWidth = 700;
    let windowHeight = 400;

    aquarisWindow = new BrowserWindow({
        title: 'Aquaris control',
        width: windowWidth,
        height: windowHeight,
        frame: true,
        resizable: true,
        minWidth: windowWidth,
        minHeight: windowHeight,
        icon: path.join(__dirname, '../../../data/dist-data/tuxedo-control-center_256.png'),
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, '../preload.js')
        }
    });

    // Hide menu bar
    aquarisWindow.setMenuBarVisibility(false);
    // Workaround to menu bar appearing after full screen state
    aquarisWindow.on('leave-full-screen', () => { aquarisWindow.setMenuBarVisibility(false); });

    aquarisWindow.on('closed', () => {
        aquarisWindow = null;
    });

    const indexPath = path.join(__dirname, '..', '..', '..', 'ng-app', langId, 'index.html');
    aquarisWindow.loadFile(indexPath, { hash: '/main-gui/aquaris-control' });
}

export function clearWebcamWindow()
{
    webcamWindow = null;
}

export async function createWebcamPreview(langId: string, arg: any) {
    let windowWidth = 640;
    let windowHeight = 480;

    webcamWindow = new BrowserWindow({
        title: "Webcam",
        width: windowWidth,
        height: windowHeight,
        frame: true,
        resizable: false,
        minWidth: windowWidth,
        minHeight: windowHeight,
        icon: path.join(
            __dirname,
            "../../../data/dist-data/tuxedo-control-center_256.png"
        ),
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, '../preload.js')
        },
        show: false
    });

    // Workaround to set window title
    webcamWindow.on("page-title-updated", function (e) {
        e.preventDefault();
    });

    // Hide menu bar
    webcamWindow.setMenuBarVisibility(false);
    // Workaround to menu bar appearing after full screen state
    webcamWindow.on("leave-full-screen", () => {
        webcamWindow.setMenuBarVisibility(false);
    });
    const indexPath = path.join(
        __dirname,
        "..",
        "..",
        "..",
        "ng-app",
        langId,
        "index.html"
    );
    webcamWindow.loadFile(indexPath, { hash: "/webcam-preview" });

    webcamWindow.webContents.once("dom-ready", () => {
        webcamWindow.webContents.send("setting-webcam-with-loading", arg);
    });

    webcamWindow.on("close", async function () {
        tccWindow.webContents.send("external-webcam-preview-closed");
        webcamWindow = null;
    });

    webcamWindow.once('ready-to-show', () => {
        webcamWindow.webContents.send("setting-webcam-with-loading", arg);
        webcamWindow.show()
    })
}

ipcMain.on('close-app', () => {
    app.exit();
})

ipcMain.on('close-window', () => {
    tccWindow.close();
})

ipcMain.on('minimize-window', () => {
    tccWindow.minimize();
})