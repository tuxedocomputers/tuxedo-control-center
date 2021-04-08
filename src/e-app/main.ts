/*!
 * Copyright (c) 2019-2021 TUXEDO Computers GmbH <tux@tuxedocomputers.com>
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
import { app, BrowserWindow, ipcMain, Tray, Menu, globalShortcut, dialog } from 'electron';
import * as path from 'path';
import * as child_process from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import { TccDBusController } from '../common/classes/TccDBusController';
import { TccProfile } from '../common/models/TccProfile';

// Tweak to get correct dirname for resource files outside app.asar
const appPath = __dirname.replace('app.asar/', '');

const autostartLocation = path.join(os.homedir(), '.config/autostart');
const autostartDesktopFilename = 'tuxedo-control-center-tray.desktop';
const tccConfigDir = '.tcc';
const startTCCAccelerator = 'Super+Alt+F6';

let tccWindow: Electron.BrowserWindow;
let tray: Electron.Tray;
let tccDBus: TccDBusController;

const watchOption = process.argv.includes('--watch');
const trayOnlyOption = process.argv.includes('--tray');
const noTccdVersionCheck = process.argv.includes('--no-tccd-version-check');

// Ensure that only one instance of the application is running
const applicationLock = app.requestSingleInstanceLock();
if (!applicationLock) {
    console.log('TUXEDO Control Center is already running');
    app.exit(0);
}

if (watchOption) {
    require('electron-reload')(path.join(__dirname, '..', 'ng-app'));
}

if (isFirstStart()) {
    installAutostartTray();
}

if (!userConfigDirExists()) {
    createUserConfigDir();
}

app.on('second-instance', (event, cmdLine, workingDir) => {
    // If triggered by a second instance, find/show/start GUI
    activateTccGui();
});

app.whenReady().then( async () => {
    const success = globalShortcut.register(startTCCAccelerator, () => {
        activateTccGui();
    });
    if (!success) { console.log('Failed to register global shortcut'); }

    createTccTray();
    if (!trayOnlyOption) {
        activateTccGui();
    }

    if (!noTccdVersionCheck) {
        // Regularly check if running tccd version is different to running gui version
        const tccdVersionCheckInterval = 5000;
        setInterval(async () => {
            if (tccDBus === undefined) {
                tccDBus = new TccDBusController();
                await tccDBus.init();
            } else if (!await tccDBus.dbusAvailable()) {
                await tccDBus.init();
            }

            if (await tccDBus.tuxedoWmiAvailable()) {
                const tccdVersion = await tccDBus.tccdVersion();
                if (tccdVersion.length > 0 && tccdVersion !== app.getVersion()) {
                    console.log('Other tccd version detected, restarting..');
                    process.on('exit', function () {
                        child_process.spawn(
                            process.argv[0],
                            process.argv.slice(1).concat(['--tray']),
                            {
                                cwd: process.cwd(),
                                detached : true,
                                stdio: "inherit"
                            }
                        );
                    });
                    process.exit();
                }
            }

        }, tccdVersionCheckInterval);
    }
});

app.on('will-quit', (event) => {
    // Prevent default quit action
    event.preventDefault();

    // Close window but do not quit application unless tray is gone
    if (tccWindow) {
        tccWindow.close();
        tccWindow = null;
    }
    if (!tray || tray.isDestroyed()) {
        // Actually quit
        globalShortcut.unregisterAll();
        app.exit(0);
    }
});

app.on('window-all-closed', () => {
    if (!tray || tray.isDestroyed()) {
        quitCurrentTccSession();
    }
});

function activateTccGui() {
    if (tccWindow) {
        if (tccWindow.isMinimized()) { tccWindow.restore(); }
        tccWindow.focus();
    } else {
        createTccWindow();
    }
}

async function getProfiles(): Promise<TccProfile[]> {
    const dbus = new TccDBusController();
    await dbus.init();
    if (!await dbus.dbusAvailable()) return [];
    try {
        const profiles: TccProfile[] = JSON.parse(await dbus.getProfilesJSON());
        return profiles;
    } catch (err) {
        console.log('Error: ' + err);
        return [];
    }
}

async function setTempProfile(profileName: string) {
    const dbus = new TccDBusController();
    await dbus.init();
    if (!await dbus.dbusAvailable()) return false;
    const result = await dbus.setTempProfileName(profileName);
    return result;
}

async function getActiveProfile(): Promise<TccProfile> {
    const dbus = new TccDBusController();
    await dbus.init();
    if (!await dbus.dbusAvailable()) return undefined;
    try {
        return JSON.parse(await dbus.getActiveProfileJSON());
    } catch {
        return undefined;
    }
}

async function createTccTray() {
    const trayInstalled = isAutostartTrayInstalled();
    const trayIcon =  path.join(__dirname, '../../data/dist-data/tuxedo-control-center_256.png');
    if (!tray) {
        tray = new Tray(trayIcon);
        tray.setTitle('TUXEDO Control Center');
        tray.setToolTip('TUXEDO Control Center');
    }
    const primeQuery = primeSelectQuery();
    const isPrimeSupported = primeSupported();
    const messageBoxprimeSelectAccept = {
        type: 'question',
        buttons: ['yes', 'cancel' ],
        message: 'Change graphics configuration and shutdown?'
    };

    const activeProfile = await getActiveProfile();
    const profiles: TccProfile[] = await getProfiles();
    const profilesSubmenu: Object[] = profiles.map(profile => {
        // Creation of each profile selection submenu item
        return {
            label: profile.name,
            click: () => { setTempProfile(profile.name) }
        };
    });
    // Add profiles submenu "header"
    profilesSubmenu.unshift(
        { label: 'Select temp profile', enabled: false },
        { type: 'separator' }
    );

    const contextMenu = Menu.buildFromTemplate([
        { label: 'TUXEDO Control Center', type: 'normal', click: () => { activateTccGui(); }, },
        {
            label: 'Profiles',
            submenu: profilesSubmenu,
            visible: profilesSubmenu.length > 0
        },
        {
                label: 'Tray autostart', type: 'checkbox', checked: trayInstalled,
                click: () => trayInstalled ? menuRemoveAutostartTray() : menuInstallAutostartTray()
        },
        { type: 'separator', visible: isPrimeSupported },
        {
            label: 'Graphics',
            visible: isPrimeSupported,
            submenu: [
                {
                    label: 'Select NVIDIA',
                    type: 'normal',
                    click: () => { if (dialog.showMessageBoxSync(messageBoxprimeSelectAccept) === 0) { primeSelectSet('on'); } },
                    visible: primeQuery !== 'on'
                },
                {
                    label: 'Select built-in',
                    type: 'normal',
                    click: () => { if (dialog.showMessageBoxSync(messageBoxprimeSelectAccept) === 0) { primeSelectSet('off'); } },
                    visible: primeQuery !== 'off'
                }
            ]
        },
        { type: 'separator' },
        { label: 'v' + app.getVersion(), type: 'normal', enabled: false },
        { type: 'separator' },
        { label: 'Exit', type: 'normal', click: () => { quitCurrentTccSession(); } }
    ]);
    tray.setContextMenu(contextMenu);
}

function menuInstallAutostartTray() {
    installAutostartTray();
    createTccTray();
}

function menuRemoveAutostartTray() {
    removeAutostartTray();
    createTccTray();
}

function createTccWindow() {
    tccWindow = new BrowserWindow({
        title: 'TUXEDO Control Center',
        width: 1040,
        height: 750,
        frame: false,
        resizable: true,
        minWidth: 1040,
        minHeight: 750,
        icon: path.join(__dirname, '../../data/dist-data/tuxedo-control-center_256.png'),
        webPreferences: {
            nodeIntegration: true
        }
    });

    const indexPath = path.join(__dirname, '..', '..', 'ng-app', 'index.html');
    tccWindow.loadFile(indexPath);
    tccWindow.on('closed', () => {
        tccWindow = null;
    });
}

function quitCurrentTccSession() {
    if (tray) {
        tray.destroy();
        tray = null;
    }

    app.quit();
}

ipcMain.on('exec-cmd-sync', (event, arg) => {
    try {
        event.returnValue = { data: child_process.execSync(arg), error: undefined };
    } catch (err) {
        event.returnValue = { data: undefined, error: err };
    }
});

ipcMain.handle('exec-cmd-async', async (event, arg) => {
    return new Promise((resolve, reject) => {
        child_process.exec(arg, (err, stdout, stderr) => {
            if (err) {
                resolve({ data: stderr, error: err });
            } else {
                resolve({ data: stdout, error: err });
            }
        });
    });
});

ipcMain.on('spawn-external-async', (event, arg) => {
    child_process.spawn(arg, { detached: true, stdio: 'ignore' }).on('error', (err) => {
        console.log("\"" + arg + "\" could not be executed.")
        dialog.showMessageBox({ title: "Notice", buttons: ["OK"], message: "\"" + arg + "\" could not be executed." })
    });
});

function installAutostartTray(): boolean {
    try {
        fs.mkdirSync(autostartLocation, { recursive: true });
        fs.copyFileSync(
            path.join(appPath, '../../data/dist-data', autostartDesktopFilename),
            path.join(autostartLocation, autostartDesktopFilename)
        );
        return true;
    } catch (err) {
        console.log('Failed to install autostart tray -> ' + err);
        return false;
    }
}

function removeAutostartTray(): boolean {
    try {
        if (fs.existsSync(path.join(autostartLocation, autostartDesktopFilename))) {
            fs.unlinkSync(path.join(autostartLocation, autostartDesktopFilename));
        }
        return true;
    } catch (err) {
        console.log('Failed to remove autostart tray -> ' + err);
        return false;
    }
}

function isAutostartTrayInstalled(): boolean {
    try {
        return fs.existsSync(path.join(autostartLocation, autostartDesktopFilename));
    } catch (err) {
        console.log('Failed to check if autostart tray is installed -> ' + err);
        return false;
    }
}

function isFirstStart(): boolean {
    return !userConfigDirExists();
}

function userConfigDirExists(): boolean {
    try {
        return fs.existsSync(path.join(os.homedir(), '.tcc'));
    } catch (err) {
        return false;
    }
}

function createUserConfigDir(): boolean {
    try {
        fs.mkdirSync(path.join(os.homedir(), '.tcc'));
        return true;
    } catch (err) {
        return false;
    }
}

function primeSupported(): boolean {
    let query: string;
    let result: boolean;
    try {
        query = child_process.execSync('prime-supported /dev/null').toString();
        result = query.trim() === 'yes';
    } catch (err) {
        result = false;
    }
    return result;
}

function primeSelectQuery(): string {
    let query: string;
    let result: string;
    try {
        query = child_process.execSync('prime-select query').toString();
        if (query.includes('nvidia')) {
            result = 'on';
        } else if (query.includes('intel')) {
            result = 'off';
        } else {
            // Not supported, result undefined
            result = undefined;
        }
    } catch (err) {
        // Doesn't exist, result undefined
        result = undefined;
    }

    return result;
}

function primeSelectSet(status: string): boolean {
    let result: boolean;
    try {
        if (status === 'on') {
            child_process.execSync('pkexec bash -c "prime-select nvidia; shutdown -h now"');
        } else if (status === 'off') {
            child_process.execSync('pkexec bash -c "prime-select intel; shutdown -h now"');
        }
        result = true;
    } catch (err) {
        // Can't set, return undefined
    }

    return result;
}
