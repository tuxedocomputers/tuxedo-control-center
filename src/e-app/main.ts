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
import { app, BrowserWindow, ipcMain, globalShortcut, dialog, screen, powerSaveBlocker, nativeTheme } from 'electron';
import * as path from 'path';
import * as child_process from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import { TccDBusController } from '../common/classes/TccDBusController';
import { TccProfile } from '../common/models/TccProfile';
import { TccTray } from './TccTray';
import { UserConfig } from './UserConfig';
import { aquarisAPIHandle, AquarisState, ClientAPI, registerAPI } from './AquarisAPI';
import { DeviceInfo, LCT21001, PumpVoltage, RGBState } from './LCT21001';
import { NgTranslations, profileIdToI18nId } from './NgTranslations';
import { OpenDialogReturnValue, SaveDialogReturnValue } from 'electron/main';
import electron = require("electron");

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
let aquarisWindow: Electron.BrowserWindow;
let webcamWindow: Electron.BrowserWindow;
let primeWindow: Electron.BrowserWindow;

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

app.on("ready", () => {
    electron.powerMonitor.on("resume", () => {
        if (tccWindow) {
            tccWindow.webContents.send("wakeup-from-suspend");
        }
    });
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

    tccDBus = new TccDBusController();
    await tccDBus.init();

    tray.state.tccGUIVersion = 'v' + app.getVersion();
    tray.state.isAutostartTrayInstalled = isAutostartTrayInstalled();
    tray.state.fnLockSupported = await fnLockSupported(tccDBus);
    if (tray.state.fnLockSupported) {
        tray.state.fnLockStatus = await fnLockStatus(tccDBus);
    }
    [tray.state.isPrimeSupported, tray.state.primeQuery] = await checkPrimeAvailabilityStatus();

    await updateTrayProfiles(tccDBus);
    tray.events.startTCCClick = () => activateTccGui();
    tray.events.startAquarisControl = () => activateTccGui('/main-gui/aquaris-control');
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
    
    tray.events.fnLockClick = (status: boolean) => {
        tray.state.fnLockStatus = !status
        tccDBus.setFnLockStatus(tray.state.fnLockStatus);
    };

    tray.events.selectNvidiaClick = async () => {
        const langId = await userConfig.get("langId");
        createPrimeWindow(langId, "dGPU");
    };
    tray.events.selectOnDemandClick = async () => {
        const langId = await userConfig.get("langId");
        createPrimeWindow(langId, "on-demand");
    };
    tray.events.selectBuiltInClick = async () => {
        const langId = await userConfig.get("langId");
        createPrimeWindow(langId, "iGPU");
    };
    tray.events.profileClick = (profileId: string) => { setTempProfileById(tccDBus, profileId); };
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
        await activateTccGui();
    }

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

    const profilesCheckInterval = 4000;
    setInterval(async () => { updateTrayProfiles(tccDBus); }, profilesCheckInterval);
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
        await aquarisCleanUp();
        if (tccDBus !== undefined) {
            tccDBus.disconnect();
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

async function activateTccGui(module?: string) {
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
        icon: path.join(__dirname, '../../data/dist-data/tuxedo-control-center_256.png'),
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    // Hide menu bar
    aquarisWindow.setMenuBarVisibility(false);
    // Workaround to menu bar appearing after full screen state
    aquarisWindow.on('leave-full-screen', () => { aquarisWindow.setMenuBarVisibility(false); });

    aquarisWindow.on('closed', () => {
        aquarisWindow = null;
    });

    const indexPath = path.join(__dirname, '..', '..', 'ng-app', langId, 'index.html');
    aquarisWindow.loadFile(indexPath, { hash: '/main-gui/aquaris-control' });
}

function activateAquarisGui() {
    if (aquarisWindow) {
        if (aquarisWindow.isMinimized()) { aquarisWindow.restore(); }
        aquarisWindow.focus();
    } else {
        userConfig.get('langId').then(langId => {
            createAquarisControl(langId);
        });
    }
}

async function createWebcamPreview(langId: string, arg: any) {
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
            "../../data/dist-data/tuxedo-control-center_256.png"
        ),
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
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

ipcMain.on("setting-webcam-with-loading", (event, arg) => {
    if (webcamWindow != null) {
        webcamWindow.webContents.send("setting-webcam-with-loading", arg);
    }
});

ipcMain.on("create-webcam-preview", function (evt, arg) {
    if (webcamWindow) {
        if (webcamWindow.isMinimized()) {
            webcamWindow.restore();
        }
        webcamWindow.focus();
    } else {
        userConfig.get("langId").then((langId) => {
            createWebcamPreview(langId, arg);
        });
    }
});

ipcMain.on("close-webcam-preview", (event, arg) => {
    if (webcamWindow) {
        webcamWindow.close();
        webcamWindow = null;
    }
});

ipcMain.on("apply-controls", (event) => {
    tccWindow.webContents.send("apply-controls");
});

ipcMain.on("video-ended", (event) => {
    tccWindow.webContents.send("video-ended");
});

async function createPrimeWindow(langId: string, primeSelectMode: string) {
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
            "../../data/dist-data/tuxedo-control-center_256.png"
        ),
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
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

ipcMain.on("prime-window-close", () => {
    if (primeWindow) {
        primeWindow.close();
    }
});

ipcMain.on("show-prime-window", () => {
    if (primeWindow) {
        primeWindow.show();
    }
});

async function getProfiles(dbus: TccDBusController): Promise<TccProfile[]> {
    let result = [];
    if (!await dbus.dbusAvailable()) return [];
    try {
        const profiles: TccProfile[] = JSON.parse(await dbus.getProfilesJSON());
        result = profiles;
    } catch (err) {
        console.log('Error: ' + err);
    }
    return result;
}

async function setTempProfile(dbus: TccDBusController, profileName: string) {
    const result = await dbus.dbusAvailable() && await dbus.setTempProfileName(profileName);
    return result;
}

async function setTempProfileById(dbus: TccDBusController, profileId: string) {
    const result = await dbus.dbusAvailable() && await dbus.setTempProfileById(profileId);
    return result;
}

async function getActiveProfile(dbus: TccDBusController): Promise<TccProfile> {
    let result = undefined;
    if (!await dbus.dbusAvailable()) return undefined;
    try {
        result = JSON.parse(await dbus.getActiveProfileJSON());
    } catch {
    }
    return result;
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
        icon: path.join(__dirname, '../../data/dist-data/tuxedo-control-center_256.png'),
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            enableRemoteModule: true,
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

    const indexPath = path.join(__dirname, '..', '..', 'ng-app', langId, 'index.html');
    if (module !== undefined) {
        await tccWindow.loadFile(indexPath, { hash: '/' + module });
    } else {
        await tccWindow.loadFile(indexPath);
    }
    tccWindow.show();
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

ipcMain.handle('show-save-dialog', async (event, arg) => {
    return new Promise<SaveDialogReturnValue>((resolve, reject) => {
        let results = dialog.showSaveDialog(arg);
        resolve(results);
    });
});


ipcMain.handle('show-open-dialog', async (event, arg) => {
    return new Promise<OpenDialogReturnValue>((resolve, reject) => {
        let results = dialog.showOpenDialog(arg);
        resolve(results);
    });
});

ipcMain.handle('get-path', async (event, arg) => {
    return new Promise<string>((resolve, reject) => {
        let requestedPath = app.getPath(arg);
        resolve(requestedPath);
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

// Handle nativeTheme updated event, whether system triggered or from tcc
nativeTheme.on('updated', () => {
    if (tccWindow) {
        tccWindow.webContents.send('update-brightness-mode');
    }
    if (aquarisWindow) {
        aquarisWindow.webContents.send('update-brightness-mode');
    }
    if (webcamWindow) {
        webcamWindow.webContents.send('update-brightness-mode');
    }
});

type BrightnessModeString = 'light' | 'dark' | 'system';
async function setBrightnessMode(mode: BrightnessModeString) {
    // Save wish to user config
    await userConfig.set('brightnessMode', mode);
    // Update electron theme source
    nativeTheme.themeSource = mode;
}

async function getBrightnessMode(): Promise<BrightnessModeString> {
    let mode = await userConfig.get('brightnessMode') as BrightnessModeString | undefined;
    switch (mode) {
        case 'light':
        case 'dark':
            break;
        default:
            mode = 'system';
    }
    return mode;
}

// Renderer to main nativeTheme API
ipcMain.handle('set-brightness-mode', (event, mode) => setBrightnessMode(mode));
ipcMain.handle('get-brightness-mode', () => getBrightnessMode());
ipcMain.handle('get-should-use-dark-colors', () => { return nativeTheme.shouldUseDarkColors; });

// Initialize brightness mode from user config
getBrightnessMode().then(async (mode) => {
    await setBrightnessMode(mode);
    // Trigger initial update manually
    nativeTheme.emit('updated');
});

async function loadTranslation(langId) {

    // Watch mode Workaround: Waiting for translation when starting in watch mode
    let canLoadTranslation = false;
    while (watchOption && !canLoadTranslation) {
        try {
            await translation.loadLanguage(langId);
            canLoadTranslation = true;
        } catch (err) {
            console.log('Watch mode: Waiting for translation');
            await new Promise(resolve => setTimeout(resolve, 3000));
        }
    }
    // End watch mode workaround

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
        await updateTrayProfiles(tccDBus);
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

async function checkPrimeAvailabilityStatus(): Promise<[boolean, string]> {
    const primeStatus = await tccDBus.getPrimeState();
    const primeAvailable =
        primeStatus !== undefined && ["off", "-1"].indexOf(primeStatus) === -1;
    return [primeAvailable, primeStatus];
}

async function fnLockSupported(tccDBus: TccDBusController) {
    return await tccDBus.getFnLockSupported();
}

async function fnLockStatus(tccDBus: TccDBusController) {
    return await tccDBus.getFnLockStatus();
}

async function updateTrayProfiles(dbus: TccDBusController) {
    try {
        const updatedActiveProfile = await getActiveProfile(dbus);
        const updatedProfiles = await getProfiles(dbus);

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

async function updateDeviceState(dev: LCT21001, current: AquarisState, next: AquarisState, overrideCheck = false) {
    if (!aquarisIoProgress) {
        try {
            aquarisIoProgress = true;
            let updatedSomething;
            do {
                let updateLed = false;
                let updateFan = false;
                let updatePump = false;

                updateLed = overrideCheck ||
                            current.red !== next.red || current.green !== next.green || current.blue !== next.blue ||
                            current.ledMode !== next.ledMode || current.ledOn !== next.ledOn;
                if (updateLed) {
                    current.red = next.red;
                    current.green = next.green;
                    current.blue = next.blue;
                    current.ledMode = next.ledMode;
                    current.ledOn = next.ledOn;
                    if (next.deviceUUID !== 'demo') {
                        if (next.ledOn) {
                            await dev.writeRGB(next.red, next.green, next.blue, next.ledMode);
                        } else {
                            await dev.writeRGBOff();
                        }
                    }
                }

                updateFan = overrideCheck ||
                            current.fanDutyCycle !== next.fanDutyCycle || current.fanOn !== next.fanOn;
                if (updateFan) {
                    current.fanDutyCycle = next.fanDutyCycle;
                    current.fanOn = next.fanOn;
                    if (next.deviceUUID !== 'demo') {
                        if (next.fanOn) {
                            await dev.writeFanMode(next.fanDutyCycle);
                        } else {
                            await dev.writeFanOff();
                        }
                    }
                }

                updatePump = overrideCheck ||
                            current.pumpDutyCycle !== next.pumpDutyCycle || current.pumpVoltage !== next.pumpVoltage || current.pumpOn !== next.pumpOn;
                if (updatePump) {
                    current.pumpDutyCycle = next.pumpDutyCycle;
                    current.pumpVoltage = next.pumpVoltage;
                    current.pumpOn = next.pumpOn;
                    if (next.deviceUUID !== 'demo') {
                        if (next.pumpOn) {
                            await dev.writePumpMode(next.pumpDutyCycle, next.pumpVoltage);
                        } else {
                            await dev.writePumpOff();
                        }
                    }
                }
                overrideCheck = false;
                updatedSomething = updateLed || updateFan || updatePump;
            } while (updatedSomething);
            aquarisIoProgress = false;
        } catch (err) {
            console.log('updateDeviceState error => ' + err);
        } finally {
            aquarisIoProgress = false;
        }
    }
}

let aquarisStateExpected: AquarisState;
let aquarisStateCurrent: AquarisState;

let aquarisIoProgress = false;
let aquarisSearchProgress = false;
let aquarisConnectProgress = false;

let aquarisHasBluetooth = true;

let searchingTimeout: NodeJS.Timeout;
let searchingDelayMs = 1000;
let discoverTries = 0;
const discoverMaxTries = 5;
let interestTries = 0;
const interestMaxTries = 8;
let isSearching = false;

async function doSearch() {
    aquarisSearchProgress = true;
    try {
        isSearching = true;
        // Start discover if not started or restart if reached discover max tries
        if (!await aquaris.isDiscovering()  || discoverTries >= discoverMaxTries) {
            discoverTries = 0;
            await aquaris.stopDiscover();
            aquarisHasBluetooth = await aquaris.startDiscover();
            if (!aquarisHasBluetooth) {
                aquarisSearchProgress = false;
                await stopSearch();
                return;
            }
            // Wait a moment after reconnect for initial discovery to have a chance
            await new Promise(resolve => setTimeout(resolve, 500));
        } else {
            discoverTries += 1;
        }

        // Look for devices
        devicesList = await aquaris.getDeviceList();

        // Trigger another search if not timed out
        if (interestTries < interestMaxTries) {
            interestTries += 1;
            searchingTimeout = setTimeout(doSearch, searchingDelayMs);
        } else {
            aquarisSearchProgress = false;
            await stopSearch();
        }
    } finally {
        aquarisSearchProgress = false;
    }
}

async function startSearch() {
    if (!isSearching) {
        await doSearch();
    }
    interestTries = 0;
}

async function stopSearch() {
    while (aquarisSearchProgress) await new Promise(resolve => setTimeout(resolve, 100));
    devicesList = [];
    isSearching = false;
    clearTimeout(searchingTimeout);
    searchingTimeout = undefined;
    interestTries = 0;
    discoverTries = discoverMaxTries;
}

async function aquarisCleanUp() {
    if (aquaris !== undefined) {
        await aquaris.disconnect();
        await stopSearch();
        await aquaris.stopDiscover();
    }
}

async function aquarisConnectedDemo() {
    return aquarisStateCurrent !== undefined && aquarisStateCurrent.deviceUUID === 'demo';
}

let devicesList: DeviceInfo[] = [];
const aquaris = new LCT21001();
const aquarisHandlers = new Map<string, (...args: any[]) => any>()
    .set(ClientAPI.prototype.connect.name, async (deviceUUID) => {
        aquarisConnectProgress = true;
        try {
            await stopSearch();

            if (deviceUUID === 'demo') {
                await new Promise(resolve => setTimeout(resolve, 600));
            } else {
                await aquaris.connect(deviceUUID);
            }

            aquarisStateCurrent = {
                deviceUUID: deviceUUID,
                red: 255,
                green: 0,
                blue: 0,
                ledMode: RGBState.Static,
                fanDutyCycle: 50,
                pumpDutyCycle: 60,
                pumpVoltage: PumpVoltage.V8,
                ledOn: true,
                fanOn: true,
                pumpOn: true
            };
            const aquarisSavedSerialized = await userConfig.get('aquarisSaveState');
            if (aquarisSavedSerialized !== undefined) {
                aquarisStateExpected = JSON.parse(aquarisSavedSerialized) as AquarisState;
            } else {
                aquarisStateExpected = Object.assign({}, aquarisStateCurrent);
            }
            aquarisStateExpected.deviceUUID = deviceUUID;
            await updateDeviceState(aquaris, aquarisStateCurrent, aquarisStateExpected, true);
        } catch (err) {
            console.log('err => ' + err);
        } finally {
            aquarisConnectProgress = false;
        }
    })

    .set(ClientAPI.prototype.disconnect.name, async () => {
        if (await aquarisConnectedDemo()) {
            await new Promise(resolve => setTimeout(resolve, 600));
        } else {
            await aquaris.disconnect();
        }
        aquarisStateExpected.deviceUUID = undefined;
        aquarisStateCurrent.deviceUUID = undefined;
    })

    .set(ClientAPI.prototype.isConnected.name, async () => {
        if (await aquarisConnectedDemo()) return true;

        if (aquarisIoProgress) {
            return true;
        } else {
            const isConnected = await aquaris.isConnected();
            if (!isConnected && aquarisStateExpected !== undefined) {
                aquarisStateExpected.deviceUUID = undefined;
            }
            return isConnected;
        }
    })

    .set(ClientAPI.prototype.hasBluetooth.name, async () => {
        return aquarisHasBluetooth || await aquarisConnectedDemo();
    })

    .set(ClientAPI.prototype.startDiscover.name, async () => {

    })

    .set(ClientAPI.prototype.stopDiscover.name, async () => {

    })

    .set(ClientAPI.prototype.getDevices.name, async () => {
        await startSearch();
        return devicesList;
    })

    .set(ClientAPI.prototype.getState.name, async () => {
        return aquarisStateExpected;
    })

    .set(ClientAPI.prototype.readFwVersion.name, async () => {
        return (await aquaris.readFwVersion()).toString();
    })

    .set(ClientAPI.prototype.updateLED.name, async (red, green, blue, state) => {
        aquarisStateExpected.red = red;
        aquarisStateExpected.green = green;
        aquarisStateExpected.blue = blue;
        aquarisStateExpected.ledMode = state;
        aquarisStateExpected.ledOn = true;
        await updateDeviceState(aquaris, aquarisStateCurrent, aquarisStateExpected);
    })

    .set(ClientAPI.prototype.writeRGBOff.name, async () => {
        aquarisStateExpected.ledOn = false;
        await updateDeviceState(aquaris, aquarisStateCurrent, aquarisStateExpected);
    })

    .set(ClientAPI.prototype.writeFanMode.name, async (dutyCyclePercent) => {
        aquarisStateExpected.fanDutyCycle = dutyCyclePercent;
        aquarisStateExpected.fanOn = true;
        await updateDeviceState(aquaris, aquarisStateCurrent, aquarisStateExpected);
    })

    .set(ClientAPI.prototype.writeFanOff.name, async () => {
        aquarisStateExpected.fanOn = false;
        await updateDeviceState(aquaris, aquarisStateCurrent, aquarisStateExpected);
    })

    .set(ClientAPI.prototype.writePumpMode.name, async (dutyCyclePercent, voltage) => {
        aquarisStateExpected.pumpDutyCycle = dutyCyclePercent;
        aquarisStateExpected.pumpVoltage = voltage;
        aquarisStateExpected.pumpOn = true;
        await updateDeviceState(aquaris, aquarisStateCurrent, aquarisStateExpected);
    })

    .set(ClientAPI.prototype.writePumpOff.name, async () => {
        aquarisStateExpected.pumpOn = false;
        await updateDeviceState(aquaris, aquarisStateCurrent, aquarisStateExpected);
    })
    
    .set(ClientAPI.prototype.saveState.name, async () => {
        if (await aquarisConnectedDemo()) return;
        await userConfig.set('aquarisSaveState', JSON.stringify(aquarisStateCurrent));
    });

registerAPI(ipcMain, aquarisAPIHandle, aquarisHandlers);
