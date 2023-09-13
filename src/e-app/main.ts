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
import * as https from 'https';
import { TccDBusController } from '../common/classes/TccDBusController';
import { ITccProfile, TccProfile, generateProfileId } from '../common/models/TccProfile';
import { TccTray } from './TccTray';
import { UserConfig } from './UserConfig';
import { aquarisAPIHandle, AquarisState, ClientAPI, registerAPI } from './AquarisAPI';
import { DeviceInfo, LCT21001, PumpVoltage, RGBState } from './LCT21001';
import { NgTranslations, profileIdToI18nId } from './NgTranslations';
import { resolve } from 'path';
import { OpenDialogReturnValue, SaveDialogOptions, SaveDialogReturnValue } from 'electron/main';
import { FanData } from 'src/service-app/classes/TccDBusInterface';
import { TDPInfo } from 'src/native-lib/TuxedoIOAPI';
import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable, Subject, Subscription } from 'rxjs';
import { DBusDisplayBrightnessGnome } from '../common/classes/DBusDisplayBrightnessGnome';
import { DriveController } from '../common/classes/DriveController';
import { IDrive } from 'src/common/models/IDrive';
import { ConfigHandler } from 'src/common/classes/ConfigHandler';
import { TccPaths } from 'src/common/classes/TccPaths';
import { WebcamPreset } from 'src/common/models/TccWebcamSettings';
import { environment } from '../ng-app/environments/environment';
import { CpuController } from '../common/classes/CpuController';
import { IDisplayBrightnessInfo, IGeneralCPUInfo, ILogicalCoreInfo } from '../common/models/ICpuInfos';
import { ScalingDriver } from 'src/common/classes/LogicalCpuController';
import { DisplayBacklightController } from '../common/classes/DisplayBacklightController';
import { ITccSettings } from 'src/common/models/TccSettings';


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
const cwd: string = process.cwd();
let startTCCAccelerator;

startTCCAccelerator = app.commandLine.getSwitchValue('startTCCAccelerator');
if (startTCCAccelerator === '') {
    startTCCAccelerator = 'Super+Alt+F6'
}

let tccWindow: Electron.BrowserWindow;
let aquarisWindow: Electron.BrowserWindow;
let webcamWindow: Electron.BrowserWindow;

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

// ############### Initilization ##################
globalThis.setImmediate = ((fn, ...args) => global.setTimeout(fn, 0, ...args)) as unknown as typeof setImmediate;

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
    tray.state.primeQuery = primeSelectQuery();
    tray.state.isPrimeSupported = primeSupported();
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

/* 
#############################################################
############## Window and Session Management ################
#############################################################
*/

app.on('second-instance', (event, cmdLine, workingDir) => {
    // If triggered by a second instance, find/show/start GUI
    activateTccGui();
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
        displayBrightnessGnome.cleanUp();
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

function quitCurrentTccSession() {
    if (tray.isActive()) {
        tray.destroy();
    }

    app.quit();
}

/* 
########################################################
################ Profile Functions #####################
########################################################
*/

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

/* 
########################################################
################ Browser Windows #######################
########################################################
*/

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
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
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
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
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
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
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


/*
##################################################################
################# IPC Backend for TCC API ########################
##################################################################
*/

/*
###############   Webcam Settings API ####################
*/


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


let webcamConfigHandler: ConfigHandler = new ConfigHandler(
            TccPaths.SETTINGS_FILE,
            TccPaths.PROFILES_FILE,
            TccPaths.WEBCAM_FILE,
            TccPaths.V4L2_NAMES_FILE,
            TccPaths.AUTOSAVE_FILE,
            TccPaths.FANTABLES_FILE
        );

        
        ipcMain.on('webcam-read-v4l2-names', (event, path: string) => {
            if (path)
            {
                return webcamConfigHandler.readV4l2Names(path);
            }
            else
            {
                return webcamConfigHandler.readV4l2Names();
            }
        });

        
        ipcMain.on('webcam-read-settings', (event ) => {
            return webcamConfigHandler.readWebcamSettings()
        });


        ipcMain.on('webcam-pkexec-write-config-async', (event, webcamSettings: WebcamPreset[]) => {
            return new Promise<boolean>(resolve => {
                const tmpWebcamPath = '/tmp/tmptccwebcam';
                webcamConfigHandler.writeWebcamSettings(webcamSettings, tmpWebcamPath);
                let tccdExec: string;
                if (environment.production) {
                    tccdExec = TccPaths.TCCD_EXEC_FILE;
                } else {
                    tccdExec = cwd + '/dist/tuxedo-control-center/data/service/tccd';
                }
        
                child_process.execFile(
                    'pkexec ' + tccdExec + ' --new_webcam ' + tmpWebcamPath,
                (err, stdout, stderr) => {
                    if (err) {
                        resolve(false);
                    } else {
                        resolve(true);
                    }
                });
            });
        });

/* 
################ Utils API #######################
*/


// TODO sepparate all APIs into their own files like explained here:
// https://stackoverflow.com/questions/56523293/how-do-i-seperate-ipcmain-on-functions-in-different-file-from-main-js

let systeminfosURL = 'https://mytuxedo.de/index.php/s/DcAeZk4TbBTTjRq/download';

ipcMain.on('utils-get-systeminfos-url-sync', (event) => {
    return systeminfosURL;
});

ipcMain.handle('utils-get-systeminfos', async (event, arg) => {
    return new Promise<Buffer>((resolve, reject) => {
        try {
          const dataArray: Buffer[] = [];
          const req = https.get(systeminfosURL, response => {
  
            response.on('data', (data) => {
              dataArray.push(data);
            });
  
            response.once('end', () => {
              resolve(Buffer.concat(dataArray));
            });
  
            response.once('error', (err) => {
              reject(err);
            });
  
          });
  
          req.once('error', (err) => {
       reject(err);
          });
        } catch (err) {
          reject(err);
        }
      });
});

ipcMain.handle('fs-write-text-file', async (event, filePath: string, fileData: string | Buffer, writeFileOptions?) => {   
return new Promise<void>((resolve, reject) => {
    try {
      if (!fs.existsSync(path.dirname(filePath))) {
          fs.mkdirSync(path.dirname(filePath), { mode: 0o755, recursive: true });
      }
      fs.writeFile(filePath, fileData, writeFileOptions, err => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    } catch (err) {
      reject(err);
    }
  });
});

ipcMain.handle('fs-read-text-file', async (event, filePath) => {
    return new Promise<string>((resolve, reject) => {
      try {
        fs.readFile(filePath,(err, data) => {
          if (err) {
            reject(err);
          } else {
            resolve(data + "");
          }
        });
      } catch (err) {
        reject(err);
      }
    });
});

ipcMain.on('fs-file-exists-sync', (event, filePath) => {
    return fs.existsSync(filePath);
});


ipcMain.handle('drive-controller-get-drives', (event) => {
    return new Promise<IDrive[]>((resolve, reject) => {
        try {
            resolve( DriveController.getDrives());
        } catch (err) {
          reject(err);
        }
      });
  });


  // ####### CPU Backend for sys-fs service ####



  let cpu = new CpuController('/sys/devices/system/cpu');

ipcMain.on('get-general-cpu-info-sync', (event) => {
    let cpuInfo: IGeneralCPUInfo;
    const scalingDriver = cpu.cores[0].scalingDriver.readValueNT();
    try {
      cpuInfo = {
        availableCores: cpu.cores.length,
        minFreq: cpu.cores[0].cpuinfoMinFreq.readValueNT(),
        maxFreq: cpu.cores[0].cpuinfoMaxFreq.readValueNT(),
        scalingAvailableFrequencies: cpu.cores[0].scalingAvailableFrequencies.readValueNT(),
        scalingAvailableGovernors: cpu.cores[0].scalingAvailableGovernors.readValueNT(),
        energyPerformanceAvailablePreferences: cpu.cores[0].energyPerformanceAvailablePreferences.readValueNT(),
        reducedAvailableFreq: cpu.cores[0].getReducedAvailableFreqNT(),
        boost: cpu.boost.readValueNT()
      };
      if (cpuInfo.scalingAvailableFrequencies !== undefined) {
        cpuInfo.maxFreq = cpuInfo.scalingAvailableFrequencies[0];
      }
      if (cpuInfo.boost !== undefined && scalingDriver === ScalingDriver.acpi_cpufreq) {
        // FIXME: Use actual max boost frequency
        cpuInfo.maxFreq += 1000000;
        cpuInfo.scalingAvailableFrequencies = [cpuInfo.maxFreq].concat(cpuInfo.scalingAvailableFrequencies);
      }
    } catch (err) {
      console.log(err);
    }

    return cpuInfo;
  });


  ipcMain.on('get-logical-core-info-sync', (event) => {
    const coreInfoList: ILogicalCoreInfo[] = [];
    for (const core of cpu.cores) {
      try {
        let onlineStatus = true;
        if (core.coreIndex !== 0) { onlineStatus = core.online.readValue(); }
        // Skip core if offline
        if (!onlineStatus) { continue; }
        const coreInfo: ILogicalCoreInfo = {
          index: core.coreIndex,
          online: onlineStatus,
          scalingCurFreq: core.scalingCurFreq.readValueNT(),
          scalingMinFreq: core.scalingMinFreq.readValueNT(),
          scalingMaxFreq: core.scalingMaxFreq.readValueNT(),
          scalingDriver: core.scalingDriver.readValueNT(),
          energyPerformanceAvailablePreferences: core.energyPerformanceAvailablePreferences.readValueNT(),
          energyPerformancePreference: core.energyPerformancePreference.readValueNT(),
          scalingAvailableGovernors: core.scalingAvailableGovernors.readValueNT(),
          scalingGovernor: core.scalingGovernor.readValueNT(),
          cpuInfoMaxFreq: core.cpuinfoMaxFreq.readValueNT(),
          cpuInfoMinFreq: core.cpuinfoMinFreq.readValueNT(),
          coreId: core.coreId.readValueNT(),
          coreSiblingsList: core.coreSiblingsList.readValueNT(),
          physicalPackageId: core.physicalPackageId.readValueNT(),
          threadSiblingsList: core.threadSiblingsList.readValueNT()
        };
        coreInfoList.push(coreInfo);
      } catch (err) {
        console.log(err);
      }
    }
    return coreInfoList;
  });

  ipcMain.on('get-intel-pstate-turbo-value-sync', (event) => {
    return cpu.intelPstate.noTurbo.readValueNT()
  });

  // #####   Backend for sys-fs service backlight stuff ########

  let displayBacklightControllers: DisplayBacklightController[];
  const displayBacklightControllerBasepath = '/sys/class/backlight';
  const displayBacklightControllerNames = DisplayBacklightController.getDeviceList(displayBacklightControllerBasepath);
  displayBacklightControllers = [];
  for (const driverName of displayBacklightControllerNames) {
    displayBacklightControllers.push(new DisplayBacklightController(displayBacklightControllerBasepath, driverName));
  }

  
  ipcMain.on('get-display-brightness-info-sync', (event) => {
    const infoArray: IDisplayBrightnessInfo[] = [];
    for (const controller of displayBacklightControllers) {
      try {
        const info: IDisplayBrightnessInfo = {
          driver: controller.driver,
          brightness: controller.brightness.readValue(),
          maxBrightness: controller.maxBrightness.readValue()
        };
        infoArray.push(info);
      } catch (err) {
        console.log(err);
      }
    }
    return infoArray;
  });

//########################
// #### Backend for config service ####

// TODO I want to change the observables in the config service to something else
// I want to buffer some of the nessesary variables in here, also so that they can be used by the functions
// do all the dbus stuff here too
// then inform the renderer process config service, that the variables have changed
// then fill them again
// just gotta find out how to do that... uggh

let config = new ConfigHandler(
    TccPaths.SETTINGS_FILE,
    TccPaths.PROFILES_FILE,
    TccPaths.WEBCAM_FILE,
    TccPaths.V4L2_NAMES_FILE,
    TccPaths.AUTOSAVE_FILE,
    TccPaths.FANTABLES_FILE
);

ipcMain.on('config-update-config-data', (event) => {
    updateConfig();
});
function updateConfig()
{
    this.customProfiles = this.dbus.customProfiles.value;
    this.settings = this.dbus.settings.value;
}

// TODO maybe instead of buffering variables just build getter functions that fetch them directly from the dbus
// the other side (config service) should then buffer them by using the getter functions
// gotta google how to do that with observables, hmm
// worst case I make observables into main functions and when they change I send a signal from main to renderer process?
// notify it of the change and have a callback there that then pulls the current progress?

function getCustomProfiles()
{
    // TODO returns private variable which get's filled via dbus 
    return customProfiles;
}
async function pkexecWriteCustomProfilesAsync(newProfileList)
{
    return new Promise<boolean>(resolve => {
        const tmpProfilesPath = '/tmp/tmptccprofiles';
        config.writeProfiles(customProfiles, tmpProfilesPath);
        let tccdExec: string;
        if (environment.production) {
            tccdExec = TccPaths.TCCD_EXEC_FILE;
        } else {
            tccdExec = cwd + '/dist/tuxedo-control-center/data/service/tccd';
        }
        child_process.execFile('pkexec ' + tccdExec + ' --new_profiles ' + tmpProfilesPath, (err, stdout, stderr) => {
                if (err) {
                    resolve(false);
                } else {
                    resolve(true);
                }
            });
        });
}
function updateConfigData()
{
    // TODO
}

function pkexecWriteCustomProfiles(profiles: ITccProfile[])
{
    const tmpProfilesPath = '/tmp/tmptccprofiles';
    config.writeProfiles(customProfiles, tmpProfilesPath);
    let tccdExec: string;
    if (environment.production) {
        tccdExec = TccPaths.TCCD_EXEC_FILE;
    } else {
        tccdExec = cwd + '/dist/tuxedo-control-center/data/service/tccd';
    }
    // https://stackoverflow.com/questions/57484453/how-to-get-err-stderr-from-execsync
    try
    {
        child_process.execSync('pkexec ' + tccdExec + ' --new_profiles ' + tmpProfilesPath);
        return true;
    }
    catch(err)
    {
        return false;
    }
}

function getSettings()
{
    // TODO
}

async function pkexecWriteConfigAsync(settings: ITccSettings, profiles: ITccProfile[])
{
    return new Promise<boolean>(resolve => {
        const tmpProfilesPath = '/tmp/tmptccprofiles';
        const tmpSettingsPath = '/tmp/tmptccsettings';
        config.writeProfiles(customProfiles, tmpProfilesPath);
        config.writeSettings(settings, tmpSettingsPath);
        let tccdExec: string;
        if (environment.production) {
            tccdExec = TccPaths.TCCD_EXEC_FILE;
        } else {
            tccdExec = cwd + '/dist/tuxedo-control-center/data/service/tccd';
        }
        child_process.execFile(
            'pkexec ' + tccdExec + ' --new_profiles ' + tmpProfilesPath + ' --new_settings ' + tmpSettingsPath, (err, stdout, stderr) => {
            if (err) {
                resolve(false);
            } else {
                resolve(true);
            }
        });
    });
}

function getAllProfiles()
{
    // TODO
}

function getCurrentEditingProfile()
{
    // TODO
}

ipcMain.on('config-set-active-profile', (event, profileId: string, stateId: string, settings) => {
    // Copy existing current settings and set id of new profile
    const newSettings: ITccSettings = config.copyConfig<ITccSettings>(settings);

    newSettings.stateMap[stateId] = profileId;
    const tmpSettingsPath = '/tmp/tmptccsettings';
    config.writeSettings(newSettings, tmpSettingsPath);
    let tccdExec: string;

    if (environment.production) {
        tccdExec = TccPaths.TCCD_EXEC_FILE;
    } else {
        tccdExec = cwd + '/dist/tuxedo-control-center/data/service/tccd';
    }
    child_process.exec('pkexec ' + tccdExec + ' --new_settings ' + tmpSettingsPath);

});


function getProfileById(searchedProfileId: string): ITccProfile
{
    const foundProfile: ITccProfile = this.getAllProfiles().find(profile => profile.id === searchedProfileId);
    if (foundProfile !== undefined) {
        return config.copyConfig<ITccProfile>(foundProfile);
    } else {
        return undefined;
    }
}

ipcMain.handle('config-copy-profile-async', (event, sourceProfileId: string, newProfileName: string) => {
   return configCopyProfile(sourceProfileId,newProfileName);
});

async function configCopyProfile(sourceProfileId: string, newProfileName: string)
{
    let profileToCopy: ITccProfile;

    if (sourceProfileId === undefined) {
        profileToCopy = this.dbus.defaultValuesProfile.value;
    } else {
        profileToCopy = getProfileById(sourceProfileId);
    }

    if (profileToCopy === undefined) {
        return undefined;
    }

    const newProfile: ITccProfile = config.copyConfig<ITccProfile>(profileToCopy);
    newProfile.name = newProfileName;
    newProfile.id = generateProfileId();
    const newProfileList = getCustomProfiles().concat(newProfile);
    const success = await pkexecWriteCustomProfilesAsync(newProfileList);
    if (success) {
        updateConfigData();
        await this.dbus.triggerUpdate();
        return newProfile.id;
    } else {
        return undefined;
    }
}




ipcMain.on('config-pkexec-write-custom-profiles', (event, customProfiles: ITccProfile[]) => {
    return pkexecWriteCustomProfiles(customProfiles);
    
});



ipcMain.on('config-write-current-editing-profile', (event) => {
    if (editProfileChanges) {
        const changedCustomProfiles: ITccProfile[] = config.copyConfig<ITccProfile[]>(customProfiles);
        changedCustomProfiles[currentProfileEditIndex] = getCurrentEditingProfile();

        const result = pkexecWriteCustomProfiles(changedCustomProfiles);
        if (result) { updateConfigData(); }

        return result;
    } else {
        return false;
    }
});


ipcMain.handle('config-pkexec-write-custom-profiles-async', (event, customProfiles: ITccProfile[]) => {
   return pkexecWriteCustomProfilesAsync(customProfiles);
});

ipcMain.handle('config-write-profile', (event, currentProfileId: string, profile: ITccProfile, states?: string[]) => {
    return configWriteProfile(currentProfileId,profile,states);
});

async function configWriteProfile(currentProfileId: string, profile: ITccProfile, states?: string[])
{
    return new Promise<boolean>(resolve => {
        const profileIndex = customProfiles.findIndex(p => p.id === currentProfileId);
        profile.id = currentProfileId;

        // Copy custom profiles and if provided profile is one of them, overwrite with
        // provided profile
        const customProfilesCopy = config.copyConfig<ITccProfile[]>(customProfiles);
        const willOverwriteProfile =
            // Is custom profile
            profileIndex !== -1;

        if (willOverwriteProfile) {
            customProfilesCopy[profileIndex] = profile;
        }

        // Copy config and if states are provided, assign the chosen profile to these states
        const newSettings: ITccSettings = config.copyConfig<ITccSettings>(getSettings());
        if (states !== undefined) {
            for (const stateId of states) {
                newSettings.stateMap[stateId] = profile.id;
            }
        }

        pkexecWriteConfigAsync(newSettings, customProfilesCopy).then(success => {
            if (success) {
                updateConfigData();
            }
            resolve(success);
        });
    });
}


ipcMain.on('config-save-settings', (event) => {
    return configSaveSettings();
});

async function configSaveSettings()
{
    return new Promise<boolean>(resolve => {
        const customProfilesCopy = config.copyConfig<ITccProfile[]>(this.customProfiles);
        const newSettings: ITccSettings = config.copyConfig<ITccSettings>(this.getSettings());

        pkexecWriteConfigAsync(newSettings, customProfilesCopy).then(success => {
            if (success) {
                updateConfigData();
            }
            resolve(success);
        });
    });
}



ipcMain.on('config-pkexec-write-config-async', (event, settings: ITccSettings, customProfiles: ITccProfile[]) => {
    return pkexecWriteConfigAsync(settings,customProfiles);
});


ipcMain.on('config-get-profile-by-name', (event, searchedProfileName: string) => {
    const foundProfile: ITccProfile = getAllProfiles().find(profile => profile.name === searchedProfileName);
    if (foundProfile !== undefined) {
        return config.copyConfig<ITccProfile>(foundProfile);
    } else {
        return undefined;
    }
});


ipcMain.on('config-get-profile-by-id', (event, searchedProfileId: string) => {
    return getProfileById(searchedProfileId);
}); 


ipcMain.on('config-get-custom-profile-by-name', (event, searchedProfileName: string) => {
    const foundProfile: ITccProfile = getCustomProfiles().find(profile => profile.name === searchedProfileName);
    if (foundProfile !== undefined) {
        return config.copyConfig<ITccProfile>(foundProfile);
    } else {
        return undefined;
    }
});


ipcMain.on('config-get-custom-profile-by-id', (event, searchedProfileId: string) => {
    const foundProfile: ITccProfile = getCustomProfiles().find(profile => profile.id === searchedProfileId);
    if (foundProfile !== undefined) {
        return config.copyConfig<ITccProfile>(foundProfile);
    } else {
        return undefined;
    }
});


ipcMain.on('config-edit-profile-changes', (event) => {
    if (currentProfileEdit === undefined) { return false; }
    const currentSavedProfile: ITccProfile = customProfiles[currentProfileEditIndex];
    // Compare the two profiles
    return JSON.stringify(currentProfileEdit) !== JSON.stringify(currentSavedProfile);
});


ipcMain.handle('config-delete-custom-profile', (event, profileIdToDelete) => {
    return configDeleteCustomProfile(profileIdToDelete);
});

async function configDeleteCustomProfile(profileIdToDelete)
{
    const newProfileList: ITccProfile[] = getCustomProfiles().filter(profile => profile.id !== profileIdToDelete);
    if (newProfileList.length === getCustomProfiles().length) {
        return false;
    }
    const success = await pkexecWriteCustomProfilesAsync(newProfileList);
    if (success) {
        updateConfigData();
        await dbus.triggerUpdate();
    }
    return success;
}

ipcMain.on('config-import-profiles', (event, newProfiles) => {
    configImportProfiles(newProfiles);
});

async function configImportProfiles(newProfiles)
{
    let newProfileList = getCustomProfiles();
    for (let i = 0; i < newProfiles.length; i++)
    {
        // https://stackoverflow.com/questions/7364150/find-object-by-id-in-an-array-of-javascript-objects
        let oldProfileIndex = newProfileList.findIndex(x => x.id === newProfiles[i].id);
        if(oldProfileIndex !== -1)
        {
            newProfileList[oldProfileIndex] = newProfiles[i];
        }
        else
        {
            // when we want to override the old profile or there is no conflict we want to keep the
            // original ID
            let newProfile = newProfiles[i];
            if (newProfile.id === "generateNewID")
            {
                newProfile.id = generateProfileId();
            }
            newProfileList = newProfileList.concat(newProfile);
        }
    }
    const success = await pkexecWriteCustomProfilesAsync(newProfileList);
    if (success) {
        updateConfigData();
        await dbus.triggerUpdate();
        return true;
    } else {
        return false;
    }
}

ipcMain.on('config-copy-config-profiles', (event, profileToCopy: ITccProfile) => {
    return config.copyConfig<ITccProfile>(profileToCopy);
});


ipcMain.on('config-get-default-fan-profiles', (event) => {
return config.getDefaultFanProfiles();
});


// TODO do we even need them, since we moved the variables?
ipcMain.on('config-get-custom-profiles', (event) => {
    return customProfiles;
    });


ipcMain.on('config-get-default-profiles', (event) => {
    return defaultProfiles;
    });


ipcMain.on('config-get-default-values-profile', (event) => {
    return defaultValuesProfile;
    });


ipcMain.on('config-get-current-editing-profile', (event) => {
    return currentProfileEdit;
    });


ipcMain.on('config-get-settings', (event) => {
    return settings;
    });



// ########################################################


ipcMain.on('utils-get-systeminfos-url-sync', (event) => {
    return systeminfosURL;
});

// TODO exec cmd has to be replaced completely by specific commands.###########
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

// ######################################################################

ipcMain.on('get-cwd-sync', (event) => {
    event.returnValue = { data: process.cwd() }
});


ipcMain.on('close-app', () => {
    app.exit();
})

ipcMain.on('close-window', () => {
    tccWindow.close();
})

ipcMain.on('minimize-window', () => {
    tccWindow.minimize();
})

// TODO might not be needed anymore, I think it was just a hacky fix for something that I resolved differently
ipcMain.on('node-require', (event, requiree) => {
    try {
        event.returnValue = { data: require(requiree), error: undefined };
    } catch (err) {
        event.returnValue = { data: undefined, error: err };
    }
});

ipcMain.handle('get-app-version', async (event, arg) => {
    return new Promise<string>((resolve, reject) => {
        let requestedInfo = app.getVersion();
        resolve(requestedInfo);
    });
});

ipcMain.handle('get-cwd', async (event, arg) => {
    return new Promise<string>((resolve, reject) => {
        let requestedInfo = process.cwd();
        resolve(requestedInfo);
    });
});

ipcMain.handle('get-process-versions', async (event, arg) => {
    return new Promise<NodeJS.ProcessVersions>((resolve, reject) => {
        let requestedInfo = process.versions;
        resolve(requestedInfo);
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

// Renderer to main nativeTheme API
ipcMain.handle('set-brightness-mode', (event, mode) => setBrightnessMode(mode));
ipcMain.handle('get-brightness-mode', () => getBrightnessMode());
ipcMain.handle('get-should-use-dark-colors', () => { return nativeTheme.shouldUseDarkColors; });

/**
 * Change user language IPC interface
 */
ipcMain.on('trigger-language-change', (event, arg) => {
    const langId = arg;
    changeLanguage(langId);
});

/*
###############   Dbus Communication API ####################
*/

ipcMain.handle('init-dbus', async (event, arg) => {
    return new Promise<boolean>((resolve, reject) => {
        resolve(tccDBus.init());
    });
});

ipcMain.handle('disconnect-dbus', async (event, arg) => {
    return new Promise<void>((resolve, reject) => {
        resolve(tccDBus.disconnect());
    });
});

ipcMain.handle('tuxedo-wmi-available-dbus', async (event, arg) => {
    return new Promise<boolean>((resolve, reject) => {
        resolve(tccDBus.tuxedoWmiAvailable());
    });
});

ipcMain.handle('tccd-version-dbus', async (event, arg) => {
    return new Promise<string>((resolve, reject) => {
        resolve(tccDBus.tccdVersion());
    });
});

ipcMain.handle('get-fan-data-cpu-dbus', async (event, arg) => {
    return new Promise<FanData>((resolve, reject) => {
        resolve(tccDBus.getFanDataCPU());
    });
});

ipcMain.handle('get-fan-data-gpu1-dbus', async (event, arg) => {
    return new Promise<FanData>((resolve, reject) => {
        resolve(tccDBus.getFanDataGPU1());
    });
});

ipcMain.handle('get-fan-data-gpu2-dbus', async (event, arg) => {
    return new Promise<FanData>((resolve, reject) => {
        resolve(tccDBus.getFanDataGPU2());
    });
});

ipcMain.handle('webcam-sw-available-dbus', async (event, arg) => {
    return new Promise<boolean>((resolve, reject) => {
        resolve(tccDBus.webcamSWAvailable());
    });
});

ipcMain.handle('get-webcam-sw-status-dbus', async (event, arg) => {
    return new Promise<boolean>((resolve, reject) => {
        resolve(tccDBus.getWebcamSWStatus());
    });
});

ipcMain.handle('get-force-yub420-output-switch-available-dbus', async (event, arg) => {
    return new Promise<boolean>((resolve, reject) => {
        resolve(tccDBus.getForceYUV420OutputSwitchAvailable());
    });
});

ipcMain.handle('consume-mode-reapply-pending-dbus', async (event, arg) => {
    return new Promise<boolean>((resolve, reject) => {
        resolve(tccDBus.consumeModeReapplyPending());
    });
});

ipcMain.handle('get-active-profile-json-dbus', async (event, arg) => {
    return new Promise<string>((resolve, reject) => {
        resolve(tccDBus.getActiveProfileJSON());
    });
});

ipcMain.handle('set-temp-profile-dbus', async (event, profileName) => {
    return new Promise<boolean>((resolve, reject) => {
        resolve(tccDBus.setTempProfileName(profileName));
    });
});

ipcMain.handle('set-temp-profile-by-id-dbus', async (event, profileId) => {
    return new Promise<boolean>((resolve, reject) => {
        resolve(tccDBus.setTempProfileById(profileId));
    });
});

ipcMain.handle('get-profiles-json-dbus', async (event, arg) => {
    return new Promise<string>((resolve, reject) => {
        resolve(tccDBus.getProfilesJSON());
    });
});

ipcMain.handle('get-custom-profiles-json-dbus', async (event, arg) => {
    return new Promise<string>((resolve, reject) => {
        resolve(tccDBus.getCustomProfilesJSON());
    });
});

ipcMain.handle('get-default-profiles-json-dbus', async (event, arg) => {
    return new Promise<string>((resolve, reject) => {
        resolve(tccDBus.getDefaultProfilesJSON());
    });
});

ipcMain.handle('get-default-values-profile-json-dbus', async (event, arg) => {
    return new Promise<string>((resolve, reject) => {
        resolve(tccDBus.getDefaultValuesProfileJSON());
    });
});

ipcMain.handle('get-json-settings-dbus', async (event, arg) => {
    return new Promise<string>((resolve, reject) => {
        resolve(tccDBus.getSettingsJSON());
    });
});

ipcMain.handle('odm-profiles-available-dbus', async (event, arg) => {
    return new Promise<string[]>((resolve, reject) => {
        resolve(tccDBus.odmProfilesAvailable());
    });
});

ipcMain.handle('odm-power-limits-available-dbus', async (event, arg) => {
    return new Promise<TDPInfo[]>((resolve, reject) => {
        resolve(tccDBus.odmPowerLimits());
    });
});

ipcMain.handle('get-keyboard-backlight-capabilities-json-dbus', async (event, arg) => {
    return new Promise<string>((resolve, reject) => {
        resolve(tccDBus.getKeyboardBacklightCapabilitiesJSON());
    });
});

ipcMain.handle('get-keyboard-backlight-states-json-dbus', async (event, arg) => {
    return new Promise<string>((resolve, reject) => {
        resolve(tccDBus.getKeyboardBacklightStatesJSON());
    });
});

ipcMain.handle('set-keyboard-backlight-states-json-dbus', async (event, keyboardBacklightStatesJSON) => {
    return new Promise<boolean>((resolve, reject) => {
        resolve(tccDBus.setKeyboardBacklightStatesJSON(keyboardBacklightStatesJSON));
    });
});

ipcMain.handle('get-fans-min-speed-dbus', async (event, arg) => {
    return new Promise<number>((resolve, reject) => {
        resolve(tccDBus.getFansMinSpeed());
    });
});

ipcMain.handle('get-fans-off-available-dbus', async (event, arg) => {
    return new Promise<boolean>((resolve, reject) => {
        resolve(tccDBus.getFansOffAvailable());
    });
});

ipcMain.handle('get-charging-profiles-available-dbus', async (event, arg) => {
    return new Promise<string[]>((resolve, reject) => {
        resolve(tccDBus.getChargingProfilesAvailable());
    });
});

ipcMain.handle('get-current-charging-profile-dbus', async (event, arg) => {
    return new Promise<string>((resolve, reject) => {
        resolve(tccDBus.getCurrentChargingProfile());
    });
});

ipcMain.handle('set-charging-profile-dbus', async (event, profileDescriptor) => {
    return new Promise<boolean>((resolve, reject) => {
        resolve(tccDBus.setChargingProfile(profileDescriptor));
    });
});

ipcMain.handle('get-charging-priorities-available-dbus', async (event, arg) => {
    return new Promise<string[]>((resolve, reject) => {
        resolve(tccDBus.getChargingPrioritiesAvailable());
    });
});

ipcMain.handle('get-current-charging-priority-dbus', async (event, arg) => {
    return new Promise<string>((resolve, reject) => {
        resolve(tccDBus.getCurrentChargingPriority());
    });
});

ipcMain.handle('set-charging-priority-dbus', async (event, priorityDescriptor) => {
    return new Promise<boolean>((resolve, reject) => {
        resolve(tccDBus.setChargingPriority(priorityDescriptor));
    });
});


// ######## Gnome Brightness Workaround Functions ########

let sessionBus: any;
const dbus = require('dbus-next');

  let observeDisplayBrightness: Observable<number>;
  let displayBrightnessSubject: Subject<number>;
  let currentDisplayBrightness: number;
  let displayBrightnessNotSupported = false;

  let displayBrightnessGnome: DBusDisplayBrightnessGnome;

  let dbusDriverNames: string[] = [];

    displayBrightnessSubject = new Subject<number>();
    observeDisplayBrightness = displayBrightnessSubject.asObservable();

    try {
      sessionBus = dbus.sessionBus();

    } catch (err) {
      console.log('dbus.sessionBus() error: ', err);
      sessionBus = undefined;
    }

    initDusDisplayBrightness().then(() => {
      const driversList: string[] = [];
      if (displayBrightnessNotSupported === false) {
        driversList.push(displayBrightnessGnome.getDescriptiveString());
      }
      dbusDriverNames = driversList;
    });

  async function initDusDisplayBrightness(): Promise<void> {
    return new Promise<void>(async resolve => {

      if (this.sessionBus === undefined) {
        displayBrightnessNotSupported = true;
      } else {
        this.displayBrightnessGnome = new DBusDisplayBrightnessGnome(sessionBus);
        if (!await this.displayBrightnessGnome.isAvailable()) {
          displayBrightnessNotSupported = true;
          return;
        }

        try {
          const result = await this.displayBrightnessGnome.getBrightness();
          this.currentDisplayBrightness = result;
          this.displayBrightnessSubject.next(this.currentDisplayBrightness);
        } catch (err) {
          this.displayBrightnessNotSupported = true;
          return;
        }

        this.displayBrightnessGnome.setOnPropertiesChanged(
          (value) => {
            this.currentDisplayBrightness = value;
            this.displayBrightnessSubject.next(this.currentDisplayBrightness);
          }
        );
      }
      resolve();
    });
  }

  function getDBusDriverNames(): string[] {
    return this.dbusDriverNames;
  }

  async function setDisplayBrightness(valuePercent: number): Promise<void> {
    return this.displayBrightnessGnome.setBrightness(valuePercent).catch(() => {});
  }

  ipcMain.handle('set-display-brightness-gnome', async (event, valuePercent) => {
    return new Promise<void>((resolve, reject) => {
        resolve(setDisplayBrightness(valuePercent));
    });
});

ipcMain.on('get-display-brightness-not-supported-sync', (event) => {
    event.returnValue = { data: currentDisplayBrightness }
});


// ############## Other random functions ###################

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

/* 
########################################################
############## Aquaris Backend #########################
########################################################
*/

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
