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
##################################################################
################# IPC Backend for TCC API ########################
##################################################################
*/
import { ipcMain, app, dialog, nativeTheme, shell } from "electron";
import * as child_process from 'child_process';
import * as fs from 'fs';
import * as https from 'https';
import * as path from 'path';
import { OpenDialogReturnValue, SaveDialogReturnValue } from 'electron/main';
import { DriveController } from '../../common/classes/DriveController';
import { IDrive } from '../../common/models/IDrive';
import { ConfigHandler } from '../../common/classes/ConfigHandler';
import { TccPaths } from '../../common/classes/TccPaths';
import { ScalingDriver } from '../../common/classes/LogicalCpuController';
import { CpuController } from '../../common/classes/CpuController';
import { AvailabilityService } from "../../common/classes/availability.service";
import { IDisplayBrightnessInfo, IGeneralCPUInfo, ILogicalCoreInfo } from '../../common/models/ICpuInfos';
import { DisplayBacklightController } from '../../common/classes/DisplayBacklightController';
import { ITccSettings } from '../../common/models/TccSettings';
import { ITccProfile } from "../../common/models/TccProfile";
import { VendorService } from '../../common/classes/Vendor.service'
import { amdDGpuDeviceIdString } from "../../common/classes/DeviceIDs";
import { primeWindow, tccWindow } from './browserWindows';
import { changeLanguage, getBrightnessMode, setBrightnessMode } from "./translationAndTheme";
import { hasAquaris } from "./initMain";
export const cwd: string = process.cwd();
//https://github.com/electron/electron/blob/main/docs/api/app.md#appispackaged-readonly
export let environmentIsProduction = app.isPackaged;

ipcMain.on("comp-get-scaling-driver-acpi-cpu-freq",(event) =>
{
    event.returnValue = ScalingDriver.acpi_cpufreq;
});

 
ipcMain.handle('comp-get-has-aquaris', async (event, arg) => {
        return new Promise<boolean>(async (resolve, reject) => {
            try {
                resolve( await hasAquaris());
            } catch (err) {
              reject(err);
            }
          });
    
});

ipcMain.on("prime-window-close", () => {
    if (primeWindow) {
        primeWindow.close();
    }
});

ipcMain.on("prime-window-show", () => {
    if (primeWindow) {
        primeWindow.show();
    }
});


ipcMain.handle('ipc-prime-select', async (event, selectedState) => {
    return new Promise<{data:string,error:string}>(async (resolve, reject) => {
        try {
            resolve( execFile(
                `pkexec prime-select ${selectedState}`
            ));
        } catch (err) {
          reject(err);
        }
      });

});



      
/* 
################ Utils API #######################
*/


// TODO sepparate all APIs into their own files like explained here:
// https://stackoverflow.com/questions/56523293/how-do-i-seperate-ipcmain-on-functions-in-different-file-from-main-js



ipcMain.handle('fs-write-text-file', async (event, filePath: string, fileData: string | Buffer, writeFileOptions?) => {   
    return writeTextFile(filePath, fileData, writeFileOptions);
});

ipcMain.handle('fs-read-text-file', async (event, filePath) => {
    return readTextFile(filePath);
});

async function writeTextFile(filePath: string, fileData: string | Buffer, writeFileOptions?)  {
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
}

async function readTextFile(filePath: string): Promise<string> {
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
}

ipcMain.on('fs-file-exists-sync', (event, filePath) => {
    event.returnValue = fs.existsSync(filePath);
});


  // ####### CPU Backend for sys-fs service ####



  let cpu = new CpuController('/sys/devices/system/cpu');

ipcMain.handle('get-general-cpu-info-async', (event) => {
    return new Promise<IGeneralCPUInfo>((resolve, reject) => {
        try {
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
    resolve(cpuInfo);
        } catch (err) {
          reject(err);
        }
      });
  });


  ipcMain.handle('get-logical-core-info-async', (event) => {
    return new Promise<ILogicalCoreInfo[]>((resolve, reject) => {
        try {
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
   resolve(coreInfoList);
    } catch (err) {
      reject(err);
    }
  });
  });

  ipcMain.handle('get-intel-pstate-turbo-value-async', (event) => {
    return new Promise<boolean>((resolve, reject) => {
        try {
            resolve( cpu.intelPstate.noTurbo.readValueNT());
        } catch (err) {
          reject(err);
        }
      });
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
    event.returnValue = infoArray;
  });

//########################
// #### Backend for config service ####

let config = new ConfigHandler(
    TccPaths.SETTINGS_FILE,
    TccPaths.PROFILES_FILE,
    TccPaths.WEBCAM_FILE,
    TccPaths.V4L2_NAMES_FILE,
    TccPaths.AUTOSAVE_FILE,
    TccPaths.FANTABLES_FILE
);

async function pkexecWriteCustomProfilesAsync(newProfileList)
{
    return new Promise<boolean>(resolve => {
        const tmpProfilesPath = '/tmp/tmptccprofiles';
        config.writeProfiles(newProfileList, tmpProfilesPath);
        let tccdExec: string;
        if (environmentIsProduction) {
            tccdExec = TccPaths.TCCD_EXEC_FILE;
        } else {
            tccdExec = cwd + '/dist/tuxedo-control-center/data/service/tccd';
        }
        child_process.exec('pkexec ' + tccdExec + ' --new_profiles ' + tmpProfilesPath, (err, stdout, stderr) => {
                if (err) {
                    resolve(false);
                } else {
                    resolve(true);
                }
            });
        });
}


function pkexecWriteCustomProfiles(profiles: ITccProfile[])
{
    const tmpProfilesPath = '/tmp/tmptccprofiles';
    config.writeProfiles(profiles, tmpProfilesPath);
    let tccdExec: string;
    if (environmentIsProduction) {
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

async function pkexecWriteConfigAsync(settings: ITccSettings, profiles: ITccProfile[])
{
    return new Promise<boolean>(resolve => {
        const tmpProfilesPath = '/tmp/tmptccprofiles';
        const tmpSettingsPath = '/tmp/tmptccsettings';
        config.writeProfiles(profiles, tmpProfilesPath);
        config.writeSettings(settings, tmpSettingsPath);
        let tccdExec: string;
        if (environmentIsProduction) {
            tccdExec = TccPaths.TCCD_EXEC_FILE;
        } else {
            tccdExec = cwd + '/dist/tuxedo-control-center/data/service/tccd';
        }
        child_process.exec(
            'pkexec ' + tccdExec + ' --new_profiles ' + tmpProfilesPath + ' --new_settings ' + tmpSettingsPath, (err, stdout, stderr) => {
            if (err) {
                resolve(false);
            } else {
                resolve(true);
            }
        });
    });
}

ipcMain.on('config-set-active-profile', (event, profileId: string, stateId: string, settings) => {
    // Copy existing current settings and set id of new profile
    const newSettings: ITccSettings = config.copyConfig<ITccSettings>(settings);

    newSettings.stateMap[stateId] = profileId;
    const tmpSettingsPath = '/tmp/tmptccsettings';
    config.writeSettings(newSettings, tmpSettingsPath);
    let tccdExec: string;

    if (environmentIsProduction) {
        tccdExec = TccPaths.TCCD_EXEC_FILE;
    } else {
        tccdExec = cwd + '/dist/tuxedo-control-center/data/service/tccd';
    }
    child_process.exec('pkexec ' + tccdExec + ' --new_settings ' + tmpSettingsPath);
});


ipcMain.on('config-pkexec-write-custom-profiles', (event, customProfiles: ITccProfile[]) => {
    event.returnValue = pkexecWriteCustomProfiles(customProfiles);
    
});

ipcMain.handle('config-pkexec-write-custom-profiles-async', (event, customProfiles: ITccProfile[]) => {
   return pkexecWriteCustomProfilesAsync(customProfiles);
});

ipcMain.handle('config-pkexec-write-config-async', (event, settings: ITccSettings, customProfiles: ITccProfile[]) => {
    return pkexecWriteConfigAsync(settings,customProfiles);
});

ipcMain.on('config-get-default-fan-profiles', (event) => {
event.returnValue = config.getDefaultFanProfiles();
});


// ########################################################


ipcMain.on('utils-get-systeminfos-url-sync', (event) => {
    event.returnValue = systeminfosURL;
});

// TODO exec cmd has to be replaced completely by specific commands.###########
// ipcMain.on('exec-cmd-sync', (event, arg) => {
//     try {
//         event.returnValue = { data: child_process.execSync(arg), error: undefined };
//     } catch (err) {
//         event.returnValue = { data: undefined, error: err };
//     }
// });

// ipcMain.handle('exec-cmd-async', async (event, arg) => {
//     return new Promise((resolve, reject) => {
//         child_process.exec(arg, (err, stdout, stderr) => {
//             if (err) {
//                 resolve({ data: stderr, error: err });
//             } else {
//                 resolve({ data: stdout, error: err });
//             }
//         });
//     });
// });

// ipcMain.handle('exec-file-async', async (event, arg) => {
//     return new Promise((resolve, reject) => {
//         let strArg: string = arg;
//         let cmdList = strArg.split(' ');
//         let cmd = cmdList.shift();
//         child_process.execFile(cmd, cmdList, (err, stdout, stderr) => {
//             if (err) {
//                 resolve({ data: stderr, error: err });
//             } else {
//                 resolve({ data: stdout, error: err });
//             }
//         });
//     });
// });

// ######################################################################

// Shutdown timer
ipcMain.handle('ipc-set-shutdown-time', async (event, selectedHour, selectedMinute) => {
    return new Promise<string>((resolve, reject) => {
        let results = execCmd("pkexec shutdown -h " + selectedHour + ":" + selectedMinute);
        resolve(results);
    });
});

ipcMain.handle('ipc-cancel-shutdown', async (event) => {
    return new Promise<string>((resolve, reject) => {
        let results = execCmd("pkexec shutdown -c");
        resolve(results);
    });
});

ipcMain.handle('ipc-get-scheduled-shutdown', async (event) => {
    return new Promise<string>((resolve, reject) => {
        let results = execCmd("cat /run/systemd/shutdown/scheduled");
        resolve(results);
    });
});

ipcMain.handle('ipc-issue-reboot', async (event) => {
    return new Promise<string>((resolve, reject) => {
        let results = execCmd("reboot");
        resolve(results);
    });
});



// TODO
ipcMain.on('get-cwd-sync', (event) => {
    event.returnValue = { data: process.cwd() }
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

ipcMain.handle('ipc-get-path', async (event, arg) => {
    return new Promise<string>((resolve, reject) => {
        let requestedPath = app.getPath(arg);
        resolve(requestedPath);
    });
});

ipcMain.on('ipc-open-external', (event, url) => {
    // Explanation: openExternal can theoretically pose a security risk
    // that's why we only let weblinks happen.
    // https://benjamin-altpeter.de/shell-openexternal-dangers/
    if(url.startsWith('http://') || url.startsWith('https://'))
    {
        shell.openExternal(url);
    }
    else
    {
        console.error("Link violates security! Needs to be a weblink! Link: " + url);
    }
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

// #### power state service backend + availablity service backend ####

let availabilityService = new AvailabilityService();

ipcMain.on('get-nvidia-dgpu-count-power', (event, arg) => {
    event.returnValue = availabilityService.getNvidiaDGpuCount();
});
ipcMain.on('get-amd-dgpu-count-power', (event, arg) => {
    event.returnValue = availabilityService.getAmdDGpuCount();
});

ipcMain.on('get-is-dgpu-available-power', (event, arg) => {
    event.returnValue = availabilityService.isDGpuAvailable();
});
ipcMain.on('get-is-igpu-available-power', (event, arg) => {
    event.returnValue = availabilityService.isIGpuAvailable();
});

ipcMain.handle('get-dgpu-power-state-power', async (event, arg) => {
    return getDGpuPowerState(arg);
});

async function getDGpuPowerState(busPath: string) {
    if (busPath) {
        try {
            const powerStatePath = path.join(busPath, "power_state");
            const powerState = await readTextFile(
                powerStatePath
            );

            return powerState.trim();
        } catch (err) {
            console.error("Failed to get power state of GPU: ", err);
        }
    }
    return "-1";
}



ipcMain.on('get-bus-path-power', (event, arg) => {
    event.returnValue = getBusPath(arg);
});

function getBusPath(driver: string): string {
    let devicePattern: string;

    if (driver === "nvidia") {
        devicePattern = "DRIVER=nvidia";
    } else if (driver === "amd") {
        devicePattern = "PCI_ID=" + amdDGpuDeviceIdString;
    }

    if (devicePattern) {
        const grepCmd = `grep -lx '${devicePattern}' /sys/bus/pci/devices/*/uevent | sed 's|/uevent||'`;
        return execCmdSync(grepCmd).trim();
    }
    return undefined;
}

export async function execCmd(cmd): Promise<string> {
    return new Promise<string>((resolve, reject) => {
    child_process.exec(cmd, (err, stdout, stderr) => {
        if (err) {
            reject(stderr);
        } else {
            resolve(stdout);
        }
    });});
}

export function execCmdSync(cmd):string {
        try {
            return child_process.execSync(cmd).toString();
        } catch (err) {
            return err.toString();
        }
}

export async function execFile(arg): Promise<{ data: string, error: any}> {
    return new Promise((resolve, reject) => {
        let strArg: string = arg;
        let cmdList = strArg.split(' ');
        let cmd = cmdList.shift();
        child_process.execFile(cmd, cmdList, (err, stdout, stderr) => {
                    if (err) {
                        reject({ data: stderr, error: err });
                    } else {
                        resolve({ data: stdout, error: err });
                    }
        });
    });
}



// ######## vendor service backend ######

let vendorService = new VendorService();

ipcMain.handle('get-cpu-vendor', async (event, status) => {
    return new Promise<string>((resolve, reject) => {
        resolve(vendorService.getCpuVendor());
    });
});


// ###### programm management service backend ###


// TODO, I removed the "is in Progress" functionality, do we still need it?
class ProgramManagementService {

    public isInProgress: Map<string, boolean>;
    public isCheckingInstallation: Map<string, boolean>;
  
    constructor() {
      this.isInProgress = new Map();
      this.isCheckingInstallation = new Map();
    }
  
    public async isInstalled(name: string): Promise<boolean> {
      this.isCheckingInstallation.set(name, true);
      return new Promise<boolean>(async (resolve) => {
        execCmd('which ' + name).then((result) => {
          this.isCheckingInstallation.set(name, false);
          resolve(true);
        }).catch(() => {
          this.isCheckingInstallation.set(name, false);
          resolve(false);
        });
      });
    }
  
    public async install(name: string): Promise<boolean> {
      this.isInProgress.set(name, true);
      return new Promise<boolean>(async (resolve) => {
        execCmd('pkexec apt install -y ' + name).then(() => {
          this.isInProgress.set(name, false);
          resolve(true);
        }).catch(() => {
          this.isInProgress.set(name, false);
          resolve(false);
        });
      });
    }
  
    public async remove(name: string): Promise<boolean> {
      this.isInProgress.set(name, true);
      return new Promise<boolean>(async (resolve) => {
          // TODO
        execCmd('pkexec apt remove -y ' + name).then(() => {
          this.isInProgress.set(name, false);
          resolve(true);
        }).catch(() => {
          this.isInProgress.set(name, false);
          resolve(false);
        });
      });
    }
  
    public run(name: string): void {
        child_process.spawn(name, { detached: true, stdio: 'ignore' }).on('error', (err) => {
            console.log("\"" + name + "\" could not be executed.")
            dialog.showMessageBox({ title: "Notice", buttons: ["OK"], message: "\"" + name + "\" could not be executed." })
        });
    }
  }

// important! the functions in the class may not be exposed to the outside directly and only be used to 
// check on specific programs, to prevent render service from running arbitrary code
const pgms = new ProgramManagementService();
const tomteName = "tuxedo-tomte";
const anydeskProgramName = 'anydesk';
const webFAICreatorProgramName = 'tuxedo-webfai-creator';

ipcMain.handle('pgms-is-in-progress', async (event, status) => {
    return new Promise<Map<string, boolean>>((resolve, reject) => {
        resolve(pgms.isInProgress);
    });
});

ipcMain.handle('pgms-is-checking-installation', async (event, status) => {
    return new Promise<Map<string, boolean>>((resolve, reject) => {
        resolve(pgms.isCheckingInstallation);
    });
});

ipcMain.handle('pgms-tomte-is-installed', async (event, status) => {
    return new Promise<boolean>((resolve, reject) => {
        resolve(pgms.isInstalled(tomteName));
    });
});

ipcMain.handle('pgms-install-tomte', async (event, status) => {
    return new Promise<boolean>((resolve, reject) => {
        resolve(pgms.install(tomteName));
    });
});

ipcMain.handle('pgms-uninstall-tomte', async (event, status) => {
    return new Promise<boolean>((resolve, reject) => {
        resolve(pgms.remove(tomteName));
    });
});

ipcMain.handle('pgms-start-tomte', async (event, status) => {
    return new Promise<void>((resolve, reject) => {
        resolve(pgms.run(tomteName));
    });
});


ipcMain.handle('pgms-anydesk-is-installed', async (event, status) => {
    return new Promise<boolean>((resolve, reject) => {
        resolve(pgms.isInstalled(anydeskProgramName));
    });
});

ipcMain.handle('pgms-install-anydesk', async (event, status) => {
    return new Promise<boolean>((resolve, reject) => {
        resolve(pgms.install(anydeskProgramName));
    });
});

ipcMain.handle('pgms-uninstall-anydesk', async (event, status) => {
    return new Promise<boolean>((resolve, reject) => {
        resolve(pgms.remove(anydeskProgramName));
    });
});

ipcMain.handle('pgms-start-anydesk', async (event, status) => {
    return new Promise<void>((resolve, reject) => {
        resolve(pgms.run(anydeskProgramName));
    });
});


ipcMain.handle('pgms-webfaic-is-installed', async (event, status) => {
    return new Promise<boolean>((resolve, reject) => {
        resolve(pgms.isInstalled(webFAICreatorProgramName));
    });
});

ipcMain.handle('pgms-install-webfaic', async (event, status) => {
    return new Promise<boolean>((resolve, reject) => {
        resolve(pgms.install(webFAICreatorProgramName));
    });
});

ipcMain.handle('pgms-uninstall-webfaic', async (event, status) => {
    return new Promise<boolean>((resolve, reject) => {
        resolve(pgms.remove(webFAICreatorProgramName));
    });
});

ipcMain.handle('pgms-start-webfaic', async (event, status) => {
    return new Promise<void>((resolve, reject) => {
        resolve(pgms.run(webFAICreatorProgramName));
    });
});


// Change Crypt password backend

async function changeCryptPassword(oldPassword: string, newPassword: string, confirmPassword: string) {  
    let crypt_drives: IDrive[] = await DriveController.getDrives();
    crypt_drives = crypt_drives.filter(x => x.crypt);
    let oneliner = "";
    for (let drive of crypt_drives) {
        oneliner += `printf '%s\\n' '${oldPassword}' | /usr/sbin/cryptsetup open --type luks -q --test-passphrase ${drive.devPath} && `
    }
    for (let drive of crypt_drives) {
        oneliner += `printf '%s\\n' '${oldPassword}' '${newPassword}' '${confirmPassword}' | /usr/sbin/cryptsetup -q luksChangeKey --force-password ${drive.devPath} && `
    }
    oneliner = oneliner.slice(0, -4); // remove the tailing " && "  
    return execCmd(`pkexec /bin/sh -c "` + oneliner + `"`);
}

ipcMain.handle('ipc-change-crypt-password', async (event, opw,npw,cpw) => {
    return new Promise<string>((resolve, reject) => {
        resolve(changeCryptPassword(opw,npw,cpw));
    });
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

  // systeminfos

  let systeminfosURL = 'https://mytuxedo.de/index.php/s/DcAeZk4TbBTTjRq/download';

async function getSystemInfos() {
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
}

  let systeminfoFilePath = '/tmp/tcc/systeminfos.sh';
    function updateSystemInfoLabel(text: string)
    {
        tccWindow.webContents.send('ipc-update-system-info-label', text);
    }

    async function runSysteminfo(ticketNumber: string): Promise<void> {
        return new Promise<void>(async (resolve, reject) => {
          let fileData: string;
          // Download file
          try {
            updateSystemInfoLabel('Fetching: ' + systeminfosURL);
            const data = await getSystemInfos();
            fileData = data.toString();
          } catch (err) {
            reject('Download failed'); return;
          }
    
          // Write file
          try {
            updateSystemInfoLabel('Writing file: ' + systeminfoFilePath);
            await writeTextFile(systeminfoFilePath, fileData, { mode: 0o755 });
          } catch (err) {
            reject('Failed to write file ' + systeminfoFilePath); return;
          }
    
          // Run
          try {
            updateSystemInfoLabel('Running systeminfos.sh');
            await execCmd('pkexec env DISPLAY=$DISPLAY XAUTHORITY=$XAUTHORITY XDG_SESSION_TYPE=$XDG_SESSION_TYPE XDG_CURRENT_DESKTOP=$XDG_CURRENT_DESKTOP sh ' + systeminfoFilePath + ' ' + ticketNumber);
          } catch (err) {
            reject('Failed to execute script');
          } 
          resolve();
        });
      }

ipcMain.handle('ipc-run-systeminfos', async (event, ticketNumber) => {
    return new Promise<void>((resolve, reject) => {
        resolve(runSysteminfo(ticketNumber));
    });
});