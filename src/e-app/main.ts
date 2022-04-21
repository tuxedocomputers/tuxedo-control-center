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
import { app, BrowserWindow, ipcMain, globalShortcut, dialog, screen, powerSaveBlocker } from 'electron';
import * as path from 'path';
import * as child_process from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import { TccDBusController } from '../common/classes/TccDBusController';
import { TccProfile } from '../common/models/TccProfile';
import { TccTray } from './TccTray';
import { UserConfig } from './UserConfig';
import { NgTranslations, profileIdToI18nId } from './NgTranslations';

// Tweak to get correct dirname for resource files outside app.asar
const appPath = __dirname.replace('app.asar/', '');

const autostartLocation = path.join(os.homedir(), '.config/autostart');
const autostartDesktopFilename = 'tuxedo-control-center-tray.desktop';
const tccConfigDir = path.join(os.homedir(), '.tcc');
const tccStandardConfigFile = path.join(tccConfigDir, 'user.conf');
const availableLanguages = [
    'en',
    'de'
];
const translation = new NgTranslations();
let startTCCAccelerator;

startTCCAccelerator = app.commandLine.getSwitchValue('startTCCAccelerator');
if (startTCCAccelerator === '') {
    startTCCAccelerator = 'Super+Alt+F6'
}

let tccWindow: Electron.BrowserWindow;
const tray: TccTray = new TccTray(path.join(__dirname, '../../data/dist-data/tuxedo-control-center_256.png'));
let tccDBus: TccDBusController;

const watchOption = process.argv.includes('--watch');
const trayOnlyOption = process.argv.includes('--tray');
const noTccdVersionCheck = process.argv.includes('--no-tccd-version-check');

let profilesHash;

let powersaveBlockerId = undefined;

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

const userConfig = new UserConfig(tccStandardConfigFile);

if (!userConfigDirExists()) {
    createUserConfigDir();
}

app.on('second-instance', (event, cmdLine, workingDir) => {
    // If triggered by a second instance, find/show/start GUI
    activateTccGui();
});

app.whenReady().then( async () => {
    try {
        const systemLanguageId = app.getLocale().substring(0, 2);
        if (await userConfig.get('langId') === undefined) {
            if (availableLanguages.includes(systemLanguageId)) {
                await userConfig.set('langId', systemLanguageId);
            } else {
                await userConfig.set('langId', availableLanguages[0]);
            }
        }
        await loadTranslation(await userConfig.get('langId'));
    } catch (err) {
        console.log('Error determining user language => ' + err);
        quitCurrentTccSession();
    }

    if (startTCCAccelerator !== 'none') {
        const success = globalShortcut.register(startTCCAccelerator, () => {
            activateTccGui();
        });
        if (!success) { console.log('Failed to register global shortcut'); }
    }

    tray.state.tccGUIVersion = 'v' + app.getVersion();
    tray.state.isAutostartTrayInstalled = isAutostartTrayInstalled();
    tray.state.primeQuery = primeSelectQuery();
    tray.state.isPrimeSupported = primeSupported();
    await updateTrayProfiles();
    tray.events.startTCCClick = () => activateTccGui();
    tray.events.exitClick = () => quitCurrentTccSession();
    tray.events.autostartTrayToggle = () => {
        if (tray.state.isAutostartTrayInstalled) {
            removeAutostartTray();
        } else {
            installAutostartTray();
        }
        tray.state.isAutostartTrayInstalled = isAutostartTrayInstalled();
        tray.create();
    };
    const messageBoxprimeSelectAccept = {
        type: 'question',
        buttons: [ 'yes', 'cancel' ],
        message: 'Change graphics configuration and shutdown?'
    };
    tray.events.selectNvidiaClick = () => {
        if (dialog.showMessageBoxSync(messageBoxprimeSelectAccept) === 0) { primeSelectSet('on'); }
    };
    tray.events.selectBuiltInClick = () => {
        if (dialog.showMessageBoxSync(messageBoxprimeSelectAccept) === 0) { primeSelectSet('off'); }
    };
    tray.events.profileClick = (profileId: string) => { setTempProfileById(profileId); };
    tray.create();

    tray.state.powersaveBlockerActive = powersaveBlockerId !== undefined && powerSaveBlocker.isStarted(powersaveBlockerId);
    tray.events.powersaveBlockerClick = () => {
        if (powersaveBlockerId !== undefined && powerSaveBlocker.isStarted(powersaveBlockerId)) {
            powerSaveBlocker.stop(powersaveBlockerId);
        } else {
            powersaveBlockerId = powerSaveBlocker.start('prevent-display-sleep');
        }
        tray.state.powersaveBlockerActive = powerSaveBlocker.isStarted(powersaveBlockerId);
        tray.create();
    }

    if (!trayOnlyOption) {
        activateTccGui();
    }

    tccDBus = new TccDBusController();
    tccDBus.init().then(() => {
        if (!noTccdVersionCheck) {
            // Regularly check if running tccd version is different to running gui version
            const tccdVersionCheckInterval = 5000;
            setInterval(async () => {
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

        tccDBus.consumeModeReapplyPending().then((result) => {
            if (result) {
                child_process.exec("xset dpms force off && xset dpms force on");
            }
        });
        tccDBus.onModeReapplyPendingChanged(() => {
            tccDBus.consumeModeReapplyPending().then((result) => {
                if (result) {
                    child_process.exec("xset dpms force off && xset dpms force on");
                }
            });
        });
    });

    const profilesCheckInterval = 4000;
    setInterval(async () => { updateTrayProfiles(); }, profilesCheckInterval);
});

app.on('will-quit', (event) => {
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
        app.exit(0);
    }
});

app.on('window-all-closed', () => {
    if (!tray.isActive()) {
        quitCurrentTccSession();
    }
});

function activateTccGui() {
    if (tccWindow) {
        if (tccWindow.isMinimized()) { tccWindow.restore(); }
        tccWindow.focus();
    } else {
        userConfig.get('langId').then(langId => {
            createTccWindow(langId);
        });
    }
}

async function getProfiles(): Promise<TccProfile[]> {
    const dbus = new TccDBusController();
    await dbus.init();
    let result = [];
    if (!await dbus.dbusAvailable()) return [];
    try {
        const profiles: TccProfile[] = JSON.parse(await dbus.getProfilesJSON());
        result = profiles;
    } catch (err) {
        console.log('Error: ' + err);
    }
    dbus.disconnect();
    return result;
}

async function setTempProfile(profileName: string) {
    const dbus = new TccDBusController();
    await dbus.init();
    const result = await dbus.dbusAvailable() && await dbus.setTempProfileName(profileName);
    dbus.disconnect();
    return result;
}

async function setTempProfileById(profileId: string) {
    const dbus = new TccDBusController();
    await dbus.init();
    const result = await dbus.dbusAvailable() && await dbus.setTempProfileById(profileId);
    dbus.disconnect();
    return result;
}

async function getActiveProfile(): Promise<TccProfile> {
    const dbus = new TccDBusController();
    await dbus.init();
    let result = undefined;
    if (!await dbus.dbusAvailable()) return undefined;
    try {
        result = JSON.parse(await dbus.getActiveProfileJSON());
    } catch {
    }
    dbus.disconnect();
    return result;
}

function createTccWindow(langId: string) {
    let windowWidth = 1040;
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
        icon: path.join(__dirname, '../../data/dist-data/tuxedo-control-center_256.png'),
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            enableRemoteModule: true,
        }
    });

    // Hide menu bar
    tccWindow.setMenuBarVisibility(false);
    // Workaround to menu bar appearing after full screen state
    tccWindow.on('leave-full-screen', () => { tccWindow.setMenuBarVisibility(false); });

    tccWindow.on('closed', () => {
        tccWindow = null;
    });

    const indexPath = path.join(__dirname, '..', '..', 'ng-app', langId, 'index.html');
    tccWindow.loadFile(indexPath);
}

function quitCurrentTccSession() {
    if (tray.isActive()) {
        tray.destroy();
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

ipcMain.handle('exec-file-async', async (event, arg) => {
    return new Promise((resolve, reject) => {
        let strArg: string = arg;
        let cmdList = strArg.split(' ');
        let cmd = cmdList.shift();
        child_process.execFile(cmd, cmdList, (err, stdout, stderr) => {
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

async function loadTranslation(langId) {
    try {
        await translation.loadLanguage(langId);
    } catch (err) {
        console.log('Failed loading translation => ' + err);
        const fallbackLangId = 'en';
        console.log('fallback to \'' + fallbackLangId + '\'');
        try {
            await translation.loadLanguage(fallbackLangId);
        } catch (err) {
            console.log('Failed loading fallback translation => ' + err);
        }
    }
}

async function changeLanguage(newLangId: string) {
    if (newLangId !== await userConfig.get('langId')) {
        await userConfig.set('langId', newLangId);
        await loadTranslation(newLangId);
        await updateTrayProfiles();
        if (tccWindow) {
            const indexPath = path.join(__dirname, '..', '..', 'ng-app', newLangId, 'index.html');
            await tccWindow.loadFile(indexPath);
        }
    }
}

/**
 * Change user language IPC interface
 */
ipcMain.on('trigger-language-change', (event, arg) => {
    const langId = arg;
    changeLanguage(langId);
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
        return fs.existsSync(tccConfigDir);
    } catch (err) {
        return false;
    }
}

function createUserConfigDir(): boolean {
    try {
        fs.mkdirSync(tccConfigDir);
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

async function updateTrayProfiles() {
    try {
        const updatedActiveProfile = await getActiveProfile();
        const updatedProfiles = await getProfiles();

        // Replace default profile names/descriptions with translations
        for (const profile of updatedProfiles) {
            const profileTranslationId = profileIdToI18nId.get(profile.id);
            if (profileTranslationId !== undefined) {
                profile.name = translation.idToString(profileTranslationId.name);
                profile.description = translation.idToString(profileTranslationId.description);
            }
        }

        if (JSON.stringify({ activeProfile: tray.state.activeProfile, profiles: tray.state.profiles }) !==
            JSON.stringify({ activeProfile: updatedActiveProfile, profiles: updatedProfiles })
        ) {
            tray.state.activeProfile = updatedActiveProfile;
            tray.state.profiles = updatedProfiles;
            await tray.create();
        }
    } catch (err) {
        console.log('updateTrayProfiles() exception => ' + err);
    }
}
