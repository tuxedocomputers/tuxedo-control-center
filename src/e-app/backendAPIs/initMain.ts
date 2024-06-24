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


import { TccTray } from '../TccTray';
import * as path from 'path';
import * as os from 'os';
import { app, globalShortcut, nativeTheme, powerSaveBlocker } from 'electron';
import { UserConfig } from '../UserConfig';
import { TccProfile } from '../../common/models/TccProfile';
import * as child_process from 'child_process';
import * as fs from 'fs';
import { tccDBus } from './dbusBackendAPI';
import { NgTranslations, profileIdToI18nId } from '../NgTranslations';
import { getBrightnessMode, loadTranslation, setBrightnessMode } from './translationAndTheme';
import { activateTccGui, quitCurrentTccSession, createPrimeWindow } from './browserWindows';
import { TUXEDODevice } from '../../common/models/DefaultProfiles';


export const tray: TccTray = new TccTray(path.join(__dirname, '../../../data/dist-data/tuxedo-control-center_256.png'));
const trayOnlyOption = process.argv.includes('--tray');
const noTccdVersionCheck = process.argv.includes('--no-tccd-version-check');
export const watchOption = process.argv.includes('--watch');
const availableLanguages = [
    'en',
    'de'
];
let powersaveBlockerId = undefined;
let startTCCAccelerator;
startTCCAccelerator = app.commandLine.getSwitchValue('startTCCAccelerator');
if (startTCCAccelerator === '') {
    startTCCAccelerator = 'Super+Alt+F6'
}
const tccConfigDir = path.join(os.homedir(), '.tcc');
const tccStandardConfigFile = path.join(tccConfigDir, 'user.conf');
// Tweak to get correct dirname for resource files outside app.asar
const appPath = __dirname.replace('app.asar/', '');
const autostartLocation = path.join(os.homedir(), '.config/autostart');
const autostartDesktopFilename = 'tuxedo-control-center-tray.desktop';
export const translation = new NgTranslations();
// Ensure that only one instance of the application is running
const applicationLock = app.requestSingleInstanceLock();
if (!applicationLock) {
    console.log('TUXEDO Control Center is already running');
    app.exit(0);
}

if (watchOption) {
    require('electron-reload')(path.join(__dirname, '..', '..', 'ng-app'));
}

if (isFirstStart()) {
    installAutostartTray();
}

export const userConfig = new UserConfig(tccStandardConfigFile);

if (!userConfigDirExists()) {
    createUserConfigDir();
}


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

        // Initialize brightness mode from user config
    getBrightnessMode().then(async (mode) => {
        await setBrightnessMode(mode);
        // Trigger initial update manually
        nativeTheme.emit('updated');
});

    startDbusAndInit();
});

export async function startDbusAndInit() {
    const dbusInitialized = await tccDBus.init();
    if(!dbusInitialized) {
        setTimeout(() => {
            startDbusAndInit()
        }, 3000);
        return;
    }
    initTray();
    initMain();
}

async function initTray() {
    tray.state.tccGUIVersion = 'v' + app.getVersion();
    tray.state.isAutostartTrayInstalled = isAutostartTrayInstalled();
    tray.state.fnLockSupported = await fnLockSupported();
    tray.state.hasAquaris = await hasAquaris();
    if (tray.state.fnLockSupported) {
        tray.state.fnLockStatus = await fnLockStatus();
    }
    [tray.state.isPrimeSupported, tray.state.primeQuery] = await checkPrimeAvailabilityStatus();

    await updateTrayProfiles();
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
}

async function initMain() {

    if (!trayOnlyOption) {
        await activateTccGui();
    }

    if (!noTccdVersionCheck) {
        // Regularly check if running tccd version is different to running gui version
        const tccdVersionCheckInterval = 5000;
        setInterval(async () => {
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
    setInterval(async () => { updateTrayProfiles(); }, profilesCheckInterval);
}

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

async function fnLockSupported() {
    return await tccDBus.getFnLockSupported();
}

async function fnLockStatus() {
    return await tccDBus.getFnLockStatus();
}

export async function updateTrayProfiles() {
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

export async function hasAquaris() {
    try {
        var device: TUXEDODevice = JSON.parse(await tccDBus.getDeviceJSON());
        if (device !== TUXEDODevice.STELLARIS1XI04 && device !== TUXEDODevice.STEPOL1XA04 && device !== TUXEDODevice.STELLARIS1XI05 && device !== TUXEDODevice.UNKNOWN ) {
            return false;
        } else {
            return true;
        }
    }
    catch (err) {
        console.log("Couldn't parse Tuxedo device");
        return true;
    }
    
}

/* 
########################################################
################ Profile Functions #####################
########################################################
*/

async function getProfiles(): Promise<TccProfile[]> {
    let result = [];
    if (!await tccDBus.dbusAvailable()) return [];
    try {
        const profiles: TccProfile[] = JSON.parse(await tccDBus.getProfilesJSON());
        result = profiles;
    } catch (err) {
        console.log('Error: ' + err);
    }
    return result;
}

async function setTempProfileById(profileId: string) {
    const result = await tccDBus.dbusAvailable() && await tccDBus.setTempProfileById(profileId);
    return result;
}

async function getActiveProfile(): Promise<TccProfile> {
    let result = undefined;
    if (!await tccDBus.dbusAvailable()) return undefined;
    try {
        result = JSON.parse(await tccDBus.getActiveProfileJSON());
    } catch {
    }
    return result; 
}