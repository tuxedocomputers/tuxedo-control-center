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

import { TccTray } from '../TccTray';
import * as path from 'node:path';
import * as os from 'node:os';
import * as fs from 'node:fs';
import { app, globalShortcut, nativeTheme, powerSaveBlocker } from 'electron';
import { UserConfig } from '../UserConfig';
import type { TccProfile } from '../../common/models/TccProfile';
import * as child_process from 'node:child_process';
import { NgTranslations, profileIdToI18nId } from '../NgTranslations';
import { loadTranslation } from './utilsAPI';
import { activateTccGui, createPrimeWindow, quitCurrentTccSession } from './browserWindowsAPI';
import { getBrightnessMode, setBrightnessMode } from './brightnessAPI';
import type { BrightnessModeString } from './brightnessAPI';
import { tccDBus } from "./dbusAPI";
import type { IProfileTextMappings } from 'src/common/models/DefaultProfiles';

export const tray: TccTray = new TccTray(path.join(__dirname, '../../../data/dist-data/tuxedo-control-center_256.png'));
const trayOnlyOption: boolean = process.argv.includes('--tray');
const noTccdVersionCheck: boolean = process.argv.includes('--no-tccd-version-check');
export const watchOption: boolean = process.argv.includes('--watch');
const availableLanguages: string[] = [
    'en',
    'de'
];
let powersaveBlockerId: number = undefined;
let startTCCAccelerator: string;
startTCCAccelerator = app.commandLine.getSwitchValue('start-tcc-accelerator');
if (startTCCAccelerator === '') {
    startTCCAccelerator = 'Super+Alt+F6'
}
const tccConfigDir: string = path.join(os.homedir(), '.tcc');
const tccStandardConfigFile: string = path.join(tccConfigDir, 'user.conf');
// Tweak to get correct dirname for resource files outside app.asar
const appPath: string = __dirname.replace('app.asar/', '');
const autostartLocation: string = path.join(os.homedir(), '.config/autostart');
const autostartDesktopFilename = 'tuxedo-control-center-tray.desktop';
export const translation = new NgTranslations();
const applicationLock: boolean = app.requestSingleInstanceLock();

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


app.whenReady().then(async (): Promise<void> => {
    try {
        exitIfProcessExists();
        
        const systemLanguageId: string = app.getLocale().substring(0, 2);
        if (await userConfig.get('langId') === undefined) {
            if (availableLanguages.includes(systemLanguageId)) {
                await userConfig.set('langId', systemLanguageId);
            } else {
                await userConfig.set('langId', availableLanguages[0]);
            }
        }
        await loadTranslation(await userConfig.get('langId'));
    } catch (err: unknown) {
        console.error("initMain: Error determining user language: ", err);
        quitCurrentTccSession();
    }

    if (startTCCAccelerator !== 'none') {
        const success: boolean = globalShortcut.register(startTCCAccelerator, (): void => {
            activateTccGui();
        });
        if (!success) { console.log('Failed to register global shortcut'); }
    }

    // Initialize brightness mode from user config
    getBrightnessMode().then(async (mode: BrightnessModeString): Promise<void> => {
        await setBrightnessMode(mode);
        // Trigger initial update manually
        nativeTheme.emit('updated');
    });

    startDbusAndInit();
});

function exitIfProcessExists(): void {
    if (applicationLock) {
        let singletonLock: string = undefined;
        
        try {
            const userDataDir: string = app.commandLine.getSwitchValue('user-data-dir')
            let singletonLockPath: string = undefined
            
            if (userDataDir) {
                singletonLockPath = path.join(userDataDir, "SingletonLock")
            } else {
                singletonLockPath = "~/.config/tuxedo-control-center/SingletonLock"
            }
            
            singletonLock = child_process
                .execSync(`readlink ${singletonLockPath}`)
                .toString()
                .trim();
        } catch(err: unknown) {
            console.log("initMain: exitIfProcessExists failed =>", err)
        }
        
        if (singletonLock) {
            const singletonLockId: number = Number.parseInt(
                singletonLock.match(/(?<=-)(?!.*-).*/)[0]
            );

            if (singletonLockId !== process.pid) {
                console.log(
                    `initMain: SingletonLock check failed ("${singletonLockId}" !== "${process.pid}")`
                );
                app.exit(0);
            }
        } else {
            console.log("initMain: SingletonLock check failed");
            app.exit(0);
        }
    } else {
        console.log("TUXEDO Control Center is already running");
        app.exit(0);
    }
}

async function startDbusAndInit(): Promise<void> {
    const dbusInitialized: boolean = await tccDBus.init();
    if(!dbusInitialized) {
        setTimeout((): void => {
            startDbusAndInit()
        }, 3000);
        return;
    }
    initTray();
    initMain();
}

async function initTray(): Promise<void> {
    tray.state.tccGUIVersion = 'v' + app.getVersion();
    tray.state.isAutostartTrayInstalled = isAutostartTrayInstalled();
    tray.state.fnLockSupported = await fnLockSupported();
    tray.state.hasAquaris = await hasAquaris();
    if (tray.state.fnLockSupported) {
        tray.state.fnLockStatus = await fnLockStatus();
    }
    [tray.state.isPrimeSupported, tray.state.primeQuery] = await checkPrimeAvailabilityStatus();

    await updateTrayProfiles();
    tray.events.startTCCClick = (): Promise<void> => activateTccGui();
    tray.events.startAquarisControl = (): Promise<void> => activateTccGui('/main-gui/aquaris-control');
    tray.events.exitClick = (): void => quitCurrentTccSession();
    tray.events.autostartTrayToggle = (): void => {
        if (tray.state.isAutostartTrayInstalled) {
            removeAutostartTray();
        } else {
            installAutostartTray();
        }
        tray.state.isAutostartTrayInstalled = isAutostartTrayInstalled();
        tray.create();
    };

    tray.events.fnLockClick = (status: boolean): void => {
        tray.state.fnLockStatus = !status
        tccDBus.setFnLockStatus(tray.state.fnLockStatus);
    };

    tray.events.selectNvidiaClick = async (): Promise<void> => {
        const langId: string = await userConfig.get("langId");
        createPrimeWindow(langId, "dGPU");
    };
    tray.events.selectOnDemandClick = async (): Promise<void> => {
        const langId: string = await userConfig.get("langId");
        createPrimeWindow(langId, "on-demand");
    };
    tray.events.selectBuiltInClick = async (): Promise<void> => {
        const langId: string = await userConfig.get("langId");
        createPrimeWindow(langId, "iGPU");
    };
    tray.events.profileClick = (profileId: string): void => { setTempProfileById(profileId); };
    tray.create();

    tray.state.powersaveBlockerActive = powersaveBlockerId !== undefined && powerSaveBlocker.isStarted(powersaveBlockerId);
    tray.events.powersaveBlockerClick = (): void => {
        if (powersaveBlockerId !== undefined && powerSaveBlocker.isStarted(powersaveBlockerId)) {
            powerSaveBlocker.stop(powersaveBlockerId);
        } else {
            powersaveBlockerId = powerSaveBlocker.start('prevent-display-sleep');
        }
        tray.state.powersaveBlockerActive = powerSaveBlocker.isStarted(powersaveBlockerId);
        tray.create();
    }
}

async function initMain(): Promise<void> {

    if (!trayOnlyOption) {
        await activateTccGui();
    }

    if (!noTccdVersionCheck) {
        // Regularly check if running tccd version is different to running gui version
        const tccdVersionCheckInterval = 5000;
        // todo: refactor, too many indents
        setInterval(async (): Promise<void> => {
            const dbusAvailable: boolean = await tccDBus.dbusAvailable()
            if (dbusAvailable) {
                const tccdVersion: string = await tccDBus.tccdVersion();
                if (tccdVersion?.length > 0 && tccdVersion !== app.getVersion()) {
                    console.log('Other tccd version detected, restarting..');
                    process.on('exit', function (): void {
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
    tccDBus.consumeModeReapplyPending().then((result: boolean): void => {
        if (result) {
            child_process.exec("xset dpms force off && xset dpms force on");
        }
    });
    tccDBus.onModeReapplyPendingChanged((): void => {
        tccDBus.consumeModeReapplyPending().then((result: boolean): void => {
            if (result) {
                child_process.exec("xset dpms force off && xset dpms force on");
            }
        });
    });

    const profilesCheckInterval = 4000;
    setInterval(async (): Promise<void> => { updateTrayProfiles(); }, profilesCheckInterval);
}

function installAutostartTray(): boolean {
    try {
        fs.mkdirSync(autostartLocation, { recursive: true });
        fs.copyFileSync(
            path.join(appPath, '../../data/dist-data', autostartDesktopFilename),
            path.join(autostartLocation, autostartDesktopFilename)
        );
        return true;
    } catch (err: unknown) {
        console.error("initMain: installAutostartTray failed =>", err)
        return false;
    }
}

function removeAutostartTray(): boolean {
    try {
        if (fs.existsSync(path.join(autostartLocation, autostartDesktopFilename))) {
            fs.unlinkSync(path.join(autostartLocation, autostartDesktopFilename));
        }
        return true;
    } catch (err: unknown) {
        console.error("initMain: removeAutostartTray failed =>", err)
        return false;
    }
}

function isAutostartTrayInstalled(): boolean {
    try {
        return fs.existsSync(path.join(autostartLocation, autostartDesktopFilename));
    } catch (err: unknown) {
        console.error("initMain: isAutostartTrayInstalled failed =>", err)
        return false;
    }
}

function isFirstStart(): boolean {
    return !userConfigDirExists();
}

function userConfigDirExists(): boolean {
    try {
        return fs.existsSync(tccConfigDir);
    } catch (err: unknown) {
        console.error("initMain: userConfigDirExists failed =>", err)
        return false;
    }
}

function createUserConfigDir(): boolean {
    try {
        fs.mkdirSync(tccConfigDir);
        return true;
    } catch (err: unknown) {
        console.error("initMain: createUserConfigDir failed =>", err)
        return false;
    }
}

async function checkPrimeAvailabilityStatus(): Promise<[boolean, string]> {
    try {
        const primeStatus: string = JSON.parse(await tccDBus.getPrimeState());
        const primeAvailable: boolean = primeStatus !== undefined && primeStatus !== "off" && primeStatus !== "-1";
        return [primeAvailable, primeStatus];
    } catch (err: unknown) {
        console.error("initMain: checkPrimeAvailabilityStatus failed =>", err)
        return [false, "-1"]
    }
}

async function fnLockSupported(): Promise<boolean> {
    return await tccDBus.getFnLockSupported();
}

async function fnLockStatus(): Promise<boolean> {
    return await tccDBus.getFnLockStatus();
}

export async function updateTrayProfiles(): Promise<void> {
    try {
        const updatedActiveProfile: TccProfile = await getActiveProfile();
        const updatedProfiles: TccProfile[] = await getProfiles();

        // Replace default profile names/descriptions with translations
        for (const profile of updatedProfiles) {
            const profileId: string = profile?.id
            if (profileId) {
                const profileTranslationId: IProfileTextMappings = profileIdToI18nId.get(profile?.id);
                if (profileTranslationId !== undefined) {
                    profile.name = translation.idToString(profileTranslationId.name);
                    profile.description = translation.idToString(profileTranslationId.description);
                }
            }
            if (!profileId) {
                console.log(`initMain: updateTrayProfiles: profile value not defined, found "${profileId}" instead`)
            }
        }

        if (JSON.stringify({ activeProfile: tray.state.activeProfile, profiles: tray.state.profiles }) !==
            JSON.stringify({ activeProfile: updatedActiveProfile, profiles: updatedProfiles })
        ) {
            tray.state.activeProfile = updatedActiveProfile;
            tray.state.profiles = updatedProfiles;
            await tray.create();
        }
    } catch (err: unknown) {
        console.error("initMain: updateTrayProfiles failed =>", err)
    }
}

export async function hasAquaris(): Promise<boolean> {
    return await tccDBus.deviceHasAquaris();
}

export async function hideCTGP(): Promise<boolean> {
    return await tccDBus.getHideCTGP();
}

async function getProfiles(): Promise<TccProfile[]> {
    let result: TccProfile[] = [];
    if (!await tccDBus.dbusAvailable()) return [];
    try {
        const profiles: TccProfile[] = JSON.parse(await tccDBus.getProfilesJSON());
        result = profiles;
    } catch (err: unknown) {
        console.error("initMain: getProfiles failed =>", err)
    }
    return result;
}

async function setTempProfileById(profileId: string): Promise<boolean> {
    const result: boolean = await tccDBus.dbusAvailable() && await tccDBus.setTempProfileById(profileId);
    return result;
}

async function getActiveProfile(): Promise<TccProfile> {
    let result: TccProfile = undefined;
    if (!await tccDBus.dbusAvailable()) return undefined;
    try {
        result = JSON.parse(await tccDBus.getActiveProfileJSON());
    } catch(err: unknown) {
        console.error("initMain: getActiveProfile failed =>", err)
    }
    return result;
}