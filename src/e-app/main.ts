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
import { aquarisAPIHandle, AquarisState, ClientAPI, registerAPI } from './AquarisAPI';
import { LCT21001, PumpVoltage, RGBState } from './LCT21001';

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
let startTCCAccelerator;

startTCCAccelerator = app.commandLine.getSwitchValue('startTCCAccelerator');
if (startTCCAccelerator === '') {
    startTCCAccelerator = 'Super+Alt+F6'
}

let tccWindow: Electron.BrowserWindow;
let aquarisWindow: Electron.BrowserWindow;
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
                userConfig.set('langId', systemLanguageId);
            } else {
                userConfig.set('langId', availableLanguages[0]);
            }
        }
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
    tray.events.startAquarisControl = () => activateAquariusGui();
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
    tray.events.profileClick = (profileName: string) => { setTempProfile(profileName); };
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

app.on('will-quit', async (event) => {
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
        if (aquaris !== undefined) { await aquaris.disconnect(); }
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
    aquarisWindow.loadFile(indexPath, { hash: '/aquaris-control'});
}

function activateAquariusGui() {
    if (aquarisWindow) {
        if (aquarisWindow.isMinimized()) { aquarisWindow.restore(); }
        aquarisWindow.focus();
    } else {
        userConfig.get('langId').then(langId => {
            createAquarisControl(langId);
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
    let windowHeight = 750;
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

ipcMain.on('spawn-external-async', (event, arg) => {
    child_process.spawn(arg, { detached: true, stdio: 'ignore' }).on('error', (err) => {
        console.log("\"" + arg + "\" could not be executed.")
        dialog.showMessageBox({ title: "Notice", buttons: ["OK"], message: "\"" + arg + "\" could not be executed." })
    });
});

async function changeLanguage(newLangId: string) {
    if (newLangId !== await userConfig.get('langId')) {
        await userConfig.set('langId', newLangId);
        if (tccWindow) {
            const indexPath = path.join(__dirname, '..', '..', 'ng-app', newLangId, 'index.html');
            tccWindow.loadFile(indexPath);
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
                if (next.ledOn) {
                    console.log(`writeRGB(${next.red}, ${next.green}, ${next.blue}, ${next.ledMode})`);
                    await dev.writeRGB(next.red, next.green, next.blue, next.ledMode);
                } else {
                    console.log(`writeRGBOff()`);
                    await dev.writeRGBOff();
                }
            }

            updateFan = overrideCheck ||
                        current.fanDutyCycle !== next.fanDutyCycle || current.fanOn !== next.fanOn;
            if (updateFan) {
                current.fanDutyCycle = next.fanDutyCycle;
                current.fanOn = next.fanOn;
                if (next.fanOn) {
                    console.log(`writeFanMode(${next.fanDutyCycle})`);
                    await dev.writeFanMode(next.fanDutyCycle);
                } else {
                    console.log(`writeFanOff()`);
                    await dev.writeFanOff();
                }
            }

            updatePump = overrideCheck ||
                         current.pumpDutyCycle !== next.pumpDutyCycle || current.pumpVoltage !== next.pumpVoltage || current.pumpOn !== next.pumpOn;
            if (updatePump) {
                current.pumpDutyCycle = next.pumpDutyCycle;
                current.pumpVoltage = next.pumpVoltage;
                current.pumpOn = next.pumpOn;
                if (next.pumpOn) {
                    console.log(`writePumpMode(${next.pumpDutyCycle}, ${next.pumpVoltage})`);
                    await dev.writePumpMode(next.pumpDutyCycle, next.pumpVoltage);
                } else {
                    console.log(`writePumpOff()`);
                    await dev.writePumpOff();
                }
            }
            overrideCheck = false;
            updatedSomething = updateLed || updateFan || updatePump;
        } while (updatedSomething);
        aquarisIoProgress = false;
    }
}

let aquarisStateExpected: AquarisState;
let aquarisStateCurrent: AquarisState;

let aquarisIoProgress = false;

const aquaris = new LCT21001();
const aquarisHandlers = new Map<string, (...args: any[]) => any>()
    .set(ClientAPI.prototype.connect.name, async (deviceUUID) => {
        await aquaris.connect();
        aquarisStateCurrent = {
            red: 0,
            green: 0,
            blue: 0,
            ledMode: RGBState.Static,
            fanDutyCycle: 0,
            pumpDutyCycle: 60,
            pumpVoltage: PumpVoltage.V8,
            ledOn: false,
            fanOn: false,
            pumpOn: false
        };
        aquarisStateExpected = Object.assign({}, aquarisStateCurrent);
        await updateDeviceState(aquaris, aquarisStateCurrent, aquarisStateExpected, true);
    })

    .set(ClientAPI.prototype.disconnect.name, async () => {
        await aquaris.disconnect();
    })

    .set(ClientAPI.prototype.isConnected.name, async () => {
        return await aquaris.isConnected();
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
    });

registerAPI(ipcMain, aquarisAPIHandle, aquarisHandlers);
