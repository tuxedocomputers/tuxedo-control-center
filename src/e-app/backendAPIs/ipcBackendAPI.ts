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
import { ipcMain, app, dialog, nativeTheme, shell, IpcMainEvent, IpcMainInvokeEvent, IpcMain } from "electron";
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
import { BrightnessModeString, changeLanguage, getBrightnessMode, setBrightnessMode } from "./translationAndTheme";
import { ClientRequest, IncomingMessage } from "http";
import { hasAquaris, hideCTGP } from "./initMain";

export const cwd: string = process.cwd();
//https://github.com/electron/electron/blob/main/docs/api/app.md#appispackaged-readonly
export let environmentIsProduction: boolean = app.isPackaged;

ipcMain.on("comp-get-scaling-driver-acpi-cpu-freq",(event: IpcMainEvent): void =>
{
    event.returnValue = ScalingDriver.acpi_cpufreq;
});


ipcMain.handle('comp-get-has-aquaris', (event: IpcMainInvokeEvent): Promise<boolean> => {
        return new Promise<boolean>((resolve: (value: boolean | PromiseLike<boolean>) => void, reject: (reason?: unknown) => void): void => {
            try {
              resolve(hasAquaris());
            } catch (err: unknown) {
              console.error("ipcBackendAPI: comp-get-has-aquaris failed =>", err)
              reject(err);
            }
          });

});

ipcMain.handle('comp-get-hide-ctgp', async (event: IpcMainInvokeEvent): Promise<boolean> => {
    return new Promise<boolean>(async (resolve: (value: boolean | PromiseLike<boolean>) => void, reject: (reason?: unknown) => void): Promise<void> => {
        try {
          resolve( await hideCTGP());
        } catch (err) {
          reject(err);
        }
      });

});

ipcMain.on("prime-window-close", (): void => {
    if (primeWindow) {
        primeWindow.close();
    }
});

ipcMain.on("prime-window-show", (): void => {
    if (primeWindow) {
        primeWindow.show();
    }
});


ipcMain.handle('ipc-prime-select', async (event: IpcMainInvokeEvent, selectedState: string): Promise<{data: string; error: unknown}> => {
    return new Promise<{data:string, error:unknown}>((resolve: (value: {data:string, error:unknown} | PromiseLike<{data:string, error:unknown}>) => void, reject: (reason?: unknown) => void): void => {
        try {
            resolve( execFile(
                `pkexec prime-select ${selectedState}`
            ));
        } catch (err: unknown) {
          console.error("ipcBackendAPI: ipc-prime-select failed =>", err)
          reject(err);
        }
      });

});




/*
################ Utils API #######################
*/


// TODO sepparate all APIs into their own files like explained here:
// https://stackoverflow.com/questions/56523293/how-do-i-seperate-ipcmain-on-functions-in-different-file-from-main-js



ipcMain.handle('fs-write-text-file', async (event: IpcMainInvokeEvent, filePath: string, fileData: string | Buffer, writeFileOptions?: fs.WriteFileOptions): Promise<void> => {
    return writeTextFile(filePath, fileData, writeFileOptions);
});

ipcMain.handle('fs-read-text-file', async (event: IpcMainInvokeEvent, filePath: string): Promise<string> => {
    return readTextFile(filePath);
});

async function writeTextFile(filePath: string, fileData: string | Buffer, writeFileOptions?: fs.WriteFileOptions): Promise<void>  {
    return new Promise<void>((resolve: (value: void | PromiseLike<void>) => void, reject: (reason?: unknown) => void): void => {
    try {
        if (!fs.existsSync(path.dirname(filePath))) {
            fs.mkdirSync(path.dirname(filePath), { mode: 0o755, recursive: true });
        }
        fs.writeFile(filePath, fileData, writeFileOptions, (err: unknown): void => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      } catch (err: unknown) {
        console.error("ipcBackendAPI: writeTextFile failed =>", err)
        reject(err);
      }
    });
}

async function readTextFile(filePath: string): Promise<string> {
    return new Promise<string>((resolve: (value: string | PromiseLike<string>) => void, reject: (reason?: unknown) => void): void => {
        try {
          fs.readFile(filePath,(err: unknown, data: Buffer): void => {
            if (err) {
              reject(err);
            } else {
              resolve(data + "");
            }
          });
        } catch (err: unknown) {
          console.error("ipcBackendAPI: readTextFile failed =>", err)
          reject(err);
        }
      });
}

ipcMain.on('fs-file-exists-sync', (event: IpcMainEvent, filePath: string): void => {
    event.returnValue = fs.existsSync(filePath);
});


  // ####### CPU Backend for sys-fs service ####



  let cpu: CpuController = new CpuController('/sys/devices/system/cpu');

// todo: values can most likely be gathered in the cpu worker via onWork() instead to avoid unnecessary duplicated file access
// there already is core.scalingAvailableFrequencies.readValueNT() and this.cpuCtrl.cores[0].cpuinfoMinFreq.readValueNT() for example
// todo: readValueNT() is sync and thus it is an async function which runs sync code
ipcMain.handle('get-general-cpu-info-async', (event: IpcMainInvokeEvent): Promise<IGeneralCPUInfo> => {
    return new Promise<IGeneralCPUInfo>((resolve: (value: IGeneralCPUInfo | PromiseLike<IGeneralCPUInfo>) => void, reject: (reason?: unknown) => void): void => {
        try {
    let cpuInfo: IGeneralCPUInfo;
    const scalingDriver: string = cpu.cores[0].scalingDriver.readValueNT();
    try {
        const cpuinfoMinFreqAvailable: boolean = cpu.cores[0].cpuinfoMinFreq.isAvailable()
        let minFreq: number
        if (cpuinfoMinFreqAvailable) {
            minFreq = cpu.cores[0].cpuinfoMinFreq.readValueNT()
        }

        const cpuinfoMaxFreqAvailable: boolean = cpu.cores[0].cpuinfoMaxFreq.isAvailable()
        let maxFreq: number
        if (cpuinfoMaxFreqAvailable) {
            maxFreq = cpu.cores[0].cpuinfoMaxFreq.readValueNT()
        }

        const scalingAvailableFrequenciesAvailable: boolean = cpu.cores[0].scalingAvailableFrequencies.isAvailable()
        let scalingAvailableFrequencies: number[]
        if (scalingAvailableFrequenciesAvailable) {
            scalingAvailableFrequencies = cpu.cores[0].scalingAvailableFrequencies.readValueNT()
        }

        const scalingAvailableGovernorsAvailable: boolean = cpu.cores[0].scalingAvailableGovernors.isAvailable()
        let scalingAvailableGovernors: string[]
        if (scalingAvailableGovernorsAvailable) {
            scalingAvailableGovernors = cpu.cores[0].scalingAvailableGovernors.readValueNT()
        }

        const energyPerformanceAvailablePreferencesAvailable: boolean = cpu.cores[0].energyPerformanceAvailablePreferences.isAvailable()
        let energyPerformanceAvailablePreferences: string[]
        if (energyPerformanceAvailablePreferencesAvailable) {
            energyPerformanceAvailablePreferences = cpu.cores[0].energyPerformanceAvailablePreferences.readValueNT()
        }

        const boostAvailable: boolean = cpu.boost.isAvailable()
        let boost: boolean
        if (boostAvailable) {
            boost = cpu.boost.readValueNT()
        }

      cpuInfo = {
        availableCores: cpu.cores?.length,
        minFreq: minFreq,
        maxFreq: maxFreq,
        scalingAvailableFrequencies: scalingAvailableFrequencies,
        scalingAvailableGovernors: scalingAvailableGovernors,
        energyPerformanceAvailablePreferences: energyPerformanceAvailablePreferences,
        reducedAvailableFreq: cpu.cores[0].getReducedAvailableFreqNT(),
        boost: boost
      };
      if (cpuInfo.scalingAvailableFrequencies !== undefined) {
        cpuInfo.maxFreq = cpuInfo.scalingAvailableFrequencies[0];
      }
      if (cpuInfo.boost !== undefined && scalingDriver === ScalingDriver.acpi_cpufreq) {
        // FIXME: Use actual max boost frequency
        cpuInfo.maxFreq += 1000000;
        cpuInfo.scalingAvailableFrequencies = [cpuInfo.maxFreq].concat(cpuInfo.scalingAvailableFrequencies);
      }
    } catch (err: unknown) {
      console.log(err);
    }
    resolve(cpuInfo);
        } catch (err: unknown) {
          console.error("ipcBackendAPI: get-general-cpu-info-async failed =>", err)
          reject(err);
        }
      });
  });

// todo: same todos as above
  ipcMain.handle('get-logical-core-info-async', (event: IpcMainInvokeEvent): Promise<ILogicalCoreInfo[]> => {
   return new Promise<ILogicalCoreInfo[]>((resolve: (value: ILogicalCoreInfo[] | PromiseLike<ILogicalCoreInfo[]>) => void, reject: (reason?: unknown) => void): void => {
        try {
    const coreInfoList: ILogicalCoreInfo[] = [];
    for (const core of cpu.cores) {
      try {
        let onlineStatus: boolean = true;
        if (core.coreIndex !== 0) { onlineStatus = core.online.readValue(); }
        // Skip core if offline
        if (!onlineStatus) { continue; }

        const scalingCurFreqAvailable: boolean = core.scalingCurFreq.isAvailable()
        let scalingCurFreq: number
        if (scalingCurFreqAvailable) {
            scalingCurFreq = core.scalingCurFreq.readValueNT()
        }

        const scalingMinFreqAvailable: boolean = core.scalingMinFreq.isAvailable()
        let scalingMinFreq: number
        if (scalingMinFreqAvailable) {
            scalingMinFreq = core.scalingMinFreq.readValueNT()
        }

        const scalingMaxFreqAvailable: boolean = core.scalingMaxFreq.isAvailable()
        let scalingMaxFreq: number
        if (scalingMaxFreqAvailable) {
            scalingMaxFreq = core.scalingMaxFreq.readValueNT()
        }

        const scalingDriverAvailable: boolean = core.scalingDriver.isAvailable()
        let scalingDriver: string
        if (scalingDriverAvailable) {
            scalingDriver = core.scalingDriver.readValueNT()
        }

        const energyPerformanceAvailablePreferencesAvailable: boolean = core.energyPerformanceAvailablePreferences.isAvailable()
        let energyPerformanceAvailablePreferences: string[]
        if (energyPerformanceAvailablePreferencesAvailable) {
            energyPerformanceAvailablePreferences = core.energyPerformanceAvailablePreferences.readValueNT()
        }

        const energyPerformancePreferenceAvailable: boolean = core.energyPerformancePreference.isAvailable()
        let energyPerformancePreference: string
        if (energyPerformancePreferenceAvailable) {
            energyPerformancePreference = core.energyPerformancePreference.readValueNT()
        }

        const scalingAvailableGovernorsAvailable: boolean = core.scalingAvailableGovernors.isAvailable()
        let scalingAvailableGovernors: string[]
        if (scalingAvailableGovernorsAvailable) {
            scalingAvailableGovernors = core.scalingAvailableGovernors.readValueNT()
        }

        const constscalingGovernorAvailable: boolean = core.scalingGovernor.isAvailable()
        let scalingGovernor: string
        if (constscalingGovernorAvailable) {
            scalingGovernor = core.scalingGovernor.readValueNT()
        }

        const cpuInfoMaxFreqAvailable: boolean = core.cpuinfoMaxFreq.isAvailable()
        let cpuInfoMaxFreq: number
        if (cpuInfoMaxFreqAvailable) {
            cpuInfoMaxFreq = core.cpuinfoMaxFreq.readValueNT()
        }

        const cpuInfoMinFreqAvailable: boolean = core.cpuinfoMinFreq.isAvailable()
        let cpuInfoMinFreq: number
        if (cpuInfoMinFreqAvailable) {
            cpuInfoMinFreq = core.cpuinfoMinFreq.readValueNT()
        }

        const coreIdAvailable: boolean = core.coreId.isAvailable()
        let coreId: number
        if (coreIdAvailable) {
            coreId = core.coreId.readValueNT()
        }

        const coreSiblingsListAvailable: boolean = core.coreSiblingsList.isAvailable()
        let coreSiblingsList: number[]
        if (coreSiblingsListAvailable) {
            coreSiblingsList = core.coreSiblingsList.readValueNT()
        }

        const physicalPackageIdAvailable: boolean = core.physicalPackageId.isAvailable()
        let physicalPackageId: number
        if (physicalPackageIdAvailable) {
            physicalPackageId = core.physicalPackageId.readValueNT()
        }

        const threadSiblingsListAvailable: boolean = core.threadSiblingsList.isAvailable()
        let threadSiblingsList: number[]
        if (threadSiblingsListAvailable) {
            threadSiblingsList = core.threadSiblingsList.readValueNT()
        }

        const coreInfo: ILogicalCoreInfo = {
          index: core.coreIndex,
          online: onlineStatus,
          scalingCurFreq: scalingCurFreq,
          scalingMinFreq: scalingMinFreq,
          scalingMaxFreq: scalingMaxFreq,
          scalingDriver: scalingDriver,
          energyPerformanceAvailablePreferences: energyPerformanceAvailablePreferences,
          energyPerformancePreference: energyPerformancePreference,
          scalingAvailableGovernors: scalingAvailableGovernors,
          scalingGovernor: scalingGovernor,
          cpuInfoMaxFreq: cpuInfoMaxFreq,
          cpuInfoMinFreq: cpuInfoMinFreq,
          coreId: coreId,
          coreSiblingsList: coreSiblingsList,
          physicalPackageId: physicalPackageId,
          threadSiblingsList: threadSiblingsList
        };
        coreInfoList.push(coreInfo);
      } catch (err: unknown) {
        console.error("ipcBackendAPI: get-logical-core-info-async loop failed =>", err)
      }
    }
   resolve(coreInfoList);
    } catch (err: unknown) {
      console.error("ipcBackendAPI: get-logical-core-info-async failed =>", err)
      reject(err);
    }
  });
  });

  ipcMain.handle('get-intel-pstate-turbo-value-async', (event: IpcMainInvokeEvent): Promise<boolean> => {
    return new Promise<boolean>((resolve: (value: boolean | PromiseLike<boolean>) => void, reject: (reason?: unknown) => void): void => {
        try {
            if (cpu.intelPstate.noTurbo.isAvailable()) {
                resolve(cpu.intelPstate.noTurbo.readValueNT());
            }
            resolve(false)
        } catch (err: unknown) {
          console.error("ipcBackendAPI: get-intel-pstate-turbo-value-async failed =>", err)
          reject(err);
        }
      });
  });

  // #####   Backend for sys-fs service backlight stuff ########

  let displayBacklightControllers: DisplayBacklightController[];
  const displayBacklightControllerBasepath = '/sys/class/backlight';
  const displayBacklightControllerNames: string[] = DisplayBacklightController.getDeviceList(displayBacklightControllerBasepath);
  displayBacklightControllers = [];
  for (const driverName of displayBacklightControllerNames) {
    displayBacklightControllers.push(new DisplayBacklightController(displayBacklightControllerBasepath, driverName));
  }


  ipcMain.on('get-display-brightness-info-sync', (event: IpcMainEvent): void => {
    const infoArray: IDisplayBrightnessInfo[] = [];
    for (const controller of displayBacklightControllers) {
      try {
        const info: IDisplayBrightnessInfo = {
          driver: controller.driver,
          brightness: controller.brightness.readValue(),
          maxBrightness: controller.maxBrightness.readValue()
        };
        infoArray.push(info);
      } catch (err: unknown) {
        console.error("ipcBackendAPI: get-display-brightness-info-sync failed =>", err)
      }
    }
    event.returnValue = infoArray;
  });

//########################
// #### Backend for config service ####

let config: ConfigHandler = new ConfigHandler(
    TccPaths.SETTINGS_FILE,
    TccPaths.PROFILES_FILE,
    TccPaths.WEBCAM_FILE,
    TccPaths.V4L2_NAMES_FILE,
    TccPaths.AUTOSAVE_FILE,
    TccPaths.FANTABLES_FILE
);

async function pkexecWriteCustomProfilesAsync(newProfileList: ITccProfile[]): Promise<boolean>
{
    return new Promise<boolean>(async (resolve: (value: boolean | PromiseLike<boolean>) => void, reject: (reason?: unknown) => void): Promise<void> => {
        const tmpProfilesPath: string = '/tmp/tmptccprofiles';
        config.writeProfiles(newProfileList, tmpProfilesPath);
        let tccdExec: string;
        if (environmentIsProduction) {
            tccdExec = TccPaths.TCCD_EXEC_FILE;
        } else {
            tccdExec = cwd + '/dist/tuxedo-control-center/data/service/tccd';
        }
        await execFile('pkexec ' + tccdExec + ' --new_profiles ' + tmpProfilesPath)
            .then((): void => resolve(true))
            .catch((): void => resolve(false));
        });
}


function pkexecWriteCustomProfiles(profiles: ITccProfile[]): boolean
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
        execFileSync('pkexec ' + tccdExec + ' --new_profiles ' + tmpProfilesPath);
        return true;
    }
    catch(err: unknown)
    {
        console.error("ipcBackendAPI: pkexecWriteCustomProfiles failed =>", err)
        return false;
    }
}

async function pkexecWriteConfigAsync(settings: ITccSettings, profiles: ITccProfile[]): Promise<boolean>
{
    return new Promise<boolean>(async (resolve: (value: boolean | PromiseLike<boolean>) => void, reject: (reason?: unknown) => void): Promise<void> => {
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
        // todo: use then() and catch() instead
        let data: {data: string; error: unknown} = await execFile(
            'pkexec ' + tccdExec + ' --new_profiles ' + tmpProfilesPath + ' --new_settings ' + tmpSettingsPath);
        if(data.error) {
            resolve(false);
        }
        else {
            resolve(true);
        }
    });
}

ipcMain.on('config-set-active-profile', (event: IpcMainEvent, profileId: string, stateId: string, settings: ITccSettings): void => {
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
    // todo: error handling
    execFile('pkexec ' + tccdExec + ' --new_settings ' + tmpSettingsPath);
});


ipcMain.on('config-pkexec-write-custom-profiles', (event: IpcMainEvent, customProfiles: ITccProfile[]): void => {
    event.returnValue = pkexecWriteCustomProfiles(customProfiles);

});

ipcMain.handle('config-pkexec-write-custom-profiles-async', (event: IpcMainInvokeEvent, customProfiles: ITccProfile[]): Promise<boolean> => {
   return pkexecWriteCustomProfilesAsync(customProfiles);
});

ipcMain.handle('config-pkexec-write-config-async', (event: IpcMainInvokeEvent, settings: ITccSettings, customProfiles: ITccProfile[]): Promise<boolean> => {
    return pkexecWriteConfigAsync(settings,customProfiles);
});

ipcMain.on('config-get-default-fan-profiles', (event: IpcMainEvent): void => {
event.returnValue = config.getDefaultFanProfiles();
});


// ########################################################


ipcMain.on('utils-get-systeminfos-url-sync', (event: IpcMainEvent): void => {
    event.returnValue = systeminfosURL;
});

// TODO exec cmd has to be replaced completely by specific commands.###########
// ipcMain.on('exec-cmd-sync', (event, arg) => {
//     try {
//         event.returnValue = { data: child_process.execSync(arg), error: undefined };
//     } catch (err: unknown) {
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
ipcMain.handle('ipc-set-shutdown-time', async (event: IpcMainInvokeEvent, selectedHour: number, selectedMinute: number): Promise<string> => {
    return new Promise<string>((resolve: (value: string | PromiseLike<string>) => void, reject: (reason?: unknown) => void): void => {
        execCmd("pkexec shutdown -h " + selectedHour + ":" + selectedMinute)
        .then((results: string) => {resolve(results)})
        .catch((): void => {resolve("")});
    });
});

ipcMain.handle('ipc-cancel-shutdown', async (event: IpcMainInvokeEvent): Promise<string> => {
    return new Promise<string>((resolve: (value: string | PromiseLike<string>) => void, reject: (reason?: unknown) => void): void => {
        execCmd("pkexec shutdown -c")
        .then((results: string): void => {resolve(results)})
        .catch((): void => {resolve("")});
    });
});

ipcMain.handle('ipc-get-scheduled-shutdown', async (event: IpcMainInvokeEvent): Promise<string> => {
    return new Promise<string>((resolve: (value: string | PromiseLike<string>) => void, reject: (reason?: unknown) => void): void => {
        const available: boolean = fs.existsSync("/run/systemd/shutdown/scheduled")
        if (available) {
            execCmd("cat /run/systemd/shutdown/scheduled")
            .then((results: string): void => {resolve(results)})
            .catch((err: unknown): void => {console.error("ipcBackendAPI: ipc-get-scheduled-shutdown failed =>", err); resolve("")});
        }
        resolve("")
    });
});

ipcMain.handle('ipc-issue-reboot', async (event: IpcMainInvokeEvent): Promise<string> => {
    return new Promise<string>((resolve: (value: string | PromiseLike<string>) => void, reject: (reason?: unknown) => void): void => {
        execCmd("reboot")
        .then((results: string): void => {resolve(results)})
        .catch((): void => {resolve("")});
    });
});

// todo: make async
ipcMain.on('get-cwd-sync', (event: IpcMainEvent): void => {
    event.returnValue = { data: process.cwd() }
});


ipcMain.handle('get-app-version', (event: IpcMainInvokeEvent): Promise<string> => {
    return new Promise<string>((resolve: (value: string | PromiseLike<string>) => void, reject: (reason?: unknown) => void): void => {
        let requestedInfo: string = app.getVersion();
        resolve(requestedInfo);
    });
});

ipcMain.handle('get-cwd', (event: IpcMainInvokeEvent): Promise<string> => {
    return new Promise<string>((resolve: (value: string | PromiseLike<string>) => void, reject: (reason?: unknown) => void): void => {
        let requestedInfo: string = process.cwd();
        resolve(requestedInfo);
    });
});

ipcMain.handle('get-process-versions', (event: IpcMainInvokeEvent): Promise<NodeJS.ProcessVersions> => {
    return new Promise<NodeJS.ProcessVersions>((resolve: (value: NodeJS.ProcessVersions | PromiseLike<NodeJS.ProcessVersions>) => void, reject: (reason?: unknown) => void): void => {
        let requestedInfo: NodeJS.ProcessVersions = process.versions;
        resolve(requestedInfo);
    });
});

ipcMain.handle('show-save-dialog', async (event: IpcMainInvokeEvent, arg: Electron.SaveDialogOptions): Promise<SaveDialogReturnValue> => {
    return new Promise<SaveDialogReturnValue>((resolve: (value: SaveDialogReturnValue | PromiseLike<SaveDialogReturnValue>) => void, reject: (reason?: unknown) => void): void => {
        let results: Promise<SaveDialogReturnValue> = dialog.showSaveDialog(arg);
        resolve(results);
    });
});


ipcMain.handle('show-open-dialog', async (event: IpcMainInvokeEvent, arg: Electron.OpenDialogOptions): Promise<OpenDialogReturnValue> => {
    return new Promise<OpenDialogReturnValue>(async (resolve: (value: OpenDialogReturnValue | PromiseLike<OpenDialogReturnValue>) => void, reject: (reason?: unknown) => void): Promise<void> => {
        let results: Promise<OpenDialogReturnValue> = dialog.showOpenDialog(arg);
        resolve(results);
    });
});

// todo: make cleaner
ipcMain.handle('ipc-get-path', (event: IpcMainInvokeEvent, arg: "home" | "appData" | "userData" | "cache" | "temp" | "exe" | "module" | "desktop" | "documents" | "downloads" | "music" | "pictures" | "videos" | "recent" | "logs" | "crashDumps"): Promise<string>  => {
    return new Promise<string>((resolve: (value: string | PromiseLike<string>) => void, reject: (reason?: unknown) => void): void => {
        let requestedPath: string = app.getPath(arg);
        resolve(requestedPath);
    });
});


ipcMain.on('show-tcc-window', (event: IpcMainEvent,): void => {
    if(!tccWindow.isVisible()) {
        tccWindow.show();
    }
});

ipcMain.on('ipc-open-external', (event: IpcMainEvent, url: string): void => {
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
ipcMain.handle('set-brightness-mode', (event: IpcMainInvokeEvent, mode: BrightnessModeString): Promise<void> => setBrightnessMode(mode));
ipcMain.handle('get-brightness-mode', (): Promise<BrightnessModeString> => getBrightnessMode());
ipcMain.handle('get-should-use-dark-colors', (): boolean => { return nativeTheme.shouldUseDarkColors; });

/**
 * Change user language IPC interface
 */
ipcMain.on('trigger-language-change', (event: IpcMainEvent, arg: string): void => {
    const langId: string = arg;
    changeLanguage(langId);
});

// #### power state service backend + availablity service backend ####

let availabilityService: AvailabilityService = new AvailabilityService();

ipcMain.on('get-nvidia-dgpu-count-power', (event: IpcMainEvent): void => {
    event.returnValue = availabilityService.getNvidiaDGpuCount();
});
ipcMain.on('get-amd-dgpu-count-power', (event: IpcMainEvent): void => {
    event.returnValue = availabilityService.getAmdDGpuCount();
});

ipcMain.on('get-is-dgpu-available-power', (event: IpcMainEvent): void => {
    event.returnValue = availabilityService.isDGpuAvailable();
});
ipcMain.on('get-is-igpu-available-power', (event: IpcMainEvent): void => {
    event.returnValue = availabilityService.isIGpuAvailable();
});

ipcMain.handle('get-dgpu-power-state-power', async (event: IpcMainEvent, arg: string): Promise<string> => {
    return getDGpuPowerState(arg);
});

async function getDGpuPowerState(busPath: string): Promise<string> {
    if (busPath) {
        try {
            const powerStatePath: string = path.join(busPath, "power_state");
            const powerState: string = await readTextFile(
                powerStatePath
            );

            return powerState.trim();
        } catch (err: unknown) {
            console.error("ipcBackendAPI: getDGpuPowerState failed =>", err);
        }
    }
    return "-1";
}



ipcMain.on('get-bus-path-power', (event: IpcMainEvent, arg: string): void => {
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

export async function execCmd(cmd: string): Promise<string> {
    return new Promise<string>((resolve: (value: string | PromiseLike<string>) => void, reject: (reason?: unknown) => void): void => {
    child_process.exec(cmd, (err: unknown, stdout: string, stderr: string): void => {
        if (err) {
            reject(stderr);
        } else {
            resolve(stdout);
        }
    });
});
}

export function execCmdSync(cmd: string):string {
        try {
            return child_process.execSync(cmd).toString();
        } catch (err: unknown) {
            console.error("ipcBackendAPI: execCmdSync failed =>", err)
            return err.toString();
        }
}

// todo: rename into execFileAsync or somehow else indicate that function is async
export async function execFile(arg: string): Promise<{ data: string, error: unknown}> {
    return new Promise<{ data: string, error: unknown}>( (resolve: (value: { data: string, error: unknown} | PromiseLike<{ data: string, error: unknown}>) => void, reject: (reason?: unknown) => void): void => {
        let strArg: string = arg;
        let cmdList: string[] = strArg.split(' ');
        let cmd: string = cmdList.shift();
        child_process.execFile(cmd, cmdList, (err: unknown, stdout: string, stderr: string): void => {
                    if (err) {
                        reject({ data: stderr, error: err });
                    } else {
                        resolve({ data: stdout, error: err });
                    }
        });
    });
}

export async function execFileSync(arg: string): Promise<unknown | string> {
        let strArg: string = arg;
        let cmdList: string[] = strArg.split(' ');
        let cmd: string = cmdList.shift();
        let data: Buffer;
        try {
            data = child_process.execFileSync(cmd, cmdList);
            return data.toString();
        }
        catch (err: unknown) {
            console.error("ipcBackendAPI: execFileSync failed =>", err)
            return err;
        }
}



// ######## vendor service backend ######

let vendorService: VendorService = new VendorService();

ipcMain.handle('get-cpu-vendor', async (event: IpcMainEvent, status: any): Promise<string> => {
    return new Promise<string>(async (resolve: (value: string | PromiseLike<string>) => void, reject: (reason?: unknown) => void): Promise<void> => {
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
        return new Promise<boolean>(async (resolve: (value: boolean | PromiseLike<boolean>) => void, reject: (reason?: unknown) => void): Promise<void> => {
        // using || to return a success code to avoid throwing an error when nothing was found with "which" and : means no-op
        execCmd(`which ${name} || :`).then((result: string): void => {
          this.isCheckingInstallation.set(name, false);
          resolve(true);
        }).catch((err: unknown): void => {
          console.error("ipcBackendAPI: isInstalled failed =>", err)
          this.isCheckingInstallation.set(name, false);
          resolve(false);
        });
      });
    }

    public async install(name: string): Promise<boolean> {
      this.isInProgress.set(name, true);
        return new Promise<boolean>(async (resolve: (value: boolean | PromiseLike<boolean>) => void, reject: (reason?: unknown) => void): Promise<void> => {
        execCmd('pkexec apt install -y ' + name).then((): void  => {
          this.isInProgress.set(name, false);
          resolve(true);
        }).catch((err: unknown): void => {
          console.error("ipcBackendAPI: install failed =>", err)
          this.isInProgress.set(name, false);
          resolve(false);
        });
      });
    }

    public async remove(name: string): Promise<boolean> {
      this.isInProgress.set(name, true);
        return new Promise<boolean>(async (resolve: (value: boolean | PromiseLike<boolean>) => void, reject: (reason?: unknown) => void): Promise<void> => {
        execCmd('pkexec apt remove -y ' + name).then((): void => {
          this.isInProgress.set(name, false);
          resolve(true);
        }).catch((err: unknown): void => {
          console.error("ipcBackendAPI: remove failed =>", err)
          this.isInProgress.set(name, false);
          resolve(false);
        });
      });
    }

    public run(name: string): void {
        child_process.spawn(name, { detached: true, stdio: 'ignore' }).on('error', (err: Error): void => {
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

ipcMain.handle('pgms-is-in-progress', (event: IpcMainInvokeEvent): Promise<Map<string, boolean>> => {
    return new Promise<Map<string, boolean>>((resolve: (value: Map<string, boolean> | PromiseLike<Map<string, boolean>>) => void, reject: (reason?: unknown) => void): void => {
        resolve(pgms.isInProgress);
    });
});

ipcMain.handle('pgms-is-checking-installation', (event: IpcMainInvokeEvent): Promise<Map<string, boolean>> => {
    return new Promise<Map<string, boolean>>((resolve: (value: Map<string, boolean> | PromiseLike<Map<string, boolean>>) => void, reject: (reason?: unknown) => void): void => {
        resolve(pgms.isCheckingInstallation);
    });
});

ipcMain.handle('pgms-tomte-is-installed', (event: IpcMainInvokeEvent): Promise<boolean> => {
    return new Promise<boolean>((resolve: (value: boolean | PromiseLike<boolean>) => void, reject: (reason?: unknown) => void): void => {
        resolve(pgms.isInstalled(tomteName));
    });
});

ipcMain.handle('pgms-install-tomte', (event: IpcMainInvokeEvent): Promise<boolean> => {
    return new Promise<boolean>((resolve: (value: boolean | PromiseLike<boolean>) => void, reject: (reason?: unknown) => void): void => {
        resolve(pgms.install(tomteName));
    });
});

ipcMain.handle('pgms-uninstall-tomte', (event: IpcMainInvokeEvent): Promise<boolean> => {
    return new Promise<boolean>((resolve: (value: boolean | PromiseLike<boolean>) => void, reject: (reason?: unknown) => void): void => {
        resolve(pgms.remove(tomteName));
    });
});

ipcMain.handle('pgms-start-tomte', (event: IpcMainInvokeEvent): Promise<void> => {
    return new Promise<void>((resolve: (value: void | PromiseLike<void>) => void, reject: (reason?: unknown) => void): void => {
        resolve(pgms.run(tomteName));
    });
});


ipcMain.handle('pgms-anydesk-is-installed', (event: IpcMainInvokeEvent): Promise<boolean> => {
    return new Promise<boolean>((resolve: (value: boolean | PromiseLike<boolean>) => void, reject: (reason?: unknown) => void): void => {
        resolve(pgms.isInstalled(anydeskProgramName));
    });
});

ipcMain.handle('pgms-install-anydesk', (event: IpcMainInvokeEvent): Promise<boolean> => {
    return new Promise<boolean>((resolve: (value: boolean | PromiseLike<boolean>) => void, reject: (reason?: unknown) => void): void => {
        resolve(pgms.install(anydeskProgramName));
    });
});

ipcMain.handle('pgms-uninstall-anydesk', (event: IpcMainInvokeEvent): Promise<boolean> => {
    return new Promise<boolean>((resolve: (value: boolean | PromiseLike<boolean>) => void, reject: (reason?: unknown) => void): void => {
        resolve(pgms.remove(anydeskProgramName));
    });
});

ipcMain.handle('pgms-start-anydesk', (event: IpcMainInvokeEvent): Promise<void> => {
    return new Promise<void>((resolve: (value: void | PromiseLike<void>) => void, reject: (reason?: unknown) => void): void => {
        resolve(pgms.run(anydeskProgramName));
    });
});


ipcMain.handle('pgms-webfaic-is-installed', (event: IpcMainInvokeEvent): Promise<boolean> => {
    return new Promise<boolean>((resolve: (value: boolean | PromiseLike<boolean>) => void, reject: (reason?: unknown) => void): void => {
        resolve(pgms.isInstalled(webFAICreatorProgramName));
    });
});

ipcMain.handle('pgms-install-webfaic', (event: IpcMainInvokeEvent): Promise<boolean> => {
    return new Promise<boolean>((resolve: (value: boolean | PromiseLike<boolean>) => void, reject: (reason?: unknown) => void): void => {
        resolve(pgms.install(webFAICreatorProgramName));
    });
});

ipcMain.handle('pgms-uninstall-webfaic', (event: IpcMainInvokeEvent): Promise<boolean> => {
    return new Promise<boolean>((resolve: (value: boolean | PromiseLike<boolean>) => void, reject: (reason?: unknown) => void): void => {
        resolve(pgms.remove(webFAICreatorProgramName));
    });
});

ipcMain.handle('pgms-start-webfaic', (event: IpcMainInvokeEvent): Promise<void> => {
    return new Promise<void>((resolve: (value: void | PromiseLike<void>) => void, reject: (reason?: unknown) => void): void => {
        resolve(pgms.run(webFAICreatorProgramName));
    });
});


// Change Crypt password backend

async function changeCryptPassword(newPassword: string, oldPassword: string, confirmPassword: string): Promise<string> {
    let crypt_drives: IDrive[] = await DriveController.getDrives();
    crypt_drives = crypt_drives.filter((x: IDrive): boolean => x.crypt);
    // todo: rename variable
    let oneliner: string = "";
    for (let drive of crypt_drives) {
        oneliner += `printf '%s\\n' '${oldPassword}' | /usr/sbin/cryptsetup open --type luks -q --test-passphrase ${drive.devPath} && `
    }
    for (let drive of crypt_drives) {
        oneliner += `printf '%s\\n' '${oldPassword}' '${newPassword}' '${confirmPassword}' | /usr/sbin/cryptsetup -q luksChangeKey --force-password ${drive.devPath} && `
    }
    oneliner = oneliner.slice(0, -4); // remove the tailing " && "
    return execCmd(`pkexec /bin/sh -c "` + oneliner + `"`);
}

ipcMain.handle('ipc-change-crypt-password', async (event: IpcMainInvokeEvent, newPassword: string, oldPassword: string, confirmPassword: string): Promise<string> => {
    return new Promise<string>(async (resolve: (value: string | PromiseLike<string>) => void, reject: (reason?: unknown) => void): Promise<void> => {
        resolve(changeCryptPassword(newPassword, oldPassword, confirmPassword));
    });
});

ipcMain.handle('drive-controller-get-drives', (event: IpcMainInvokeEvent): Promise<IDrive[]> => {
    return new Promise<IDrive[]>(async (resolve: (value: IDrive[] | PromiseLike<IDrive[]>) => void, reject: (reason?: unknown) => void): Promise<void> => {
        try {
            resolve( DriveController.getDrives());
        } catch (err: unknown) {
          console.error("ipcBackendAPI: drive-controller-get-drives failed =>", err)
          reject(err);
        }
      });
  });

  // systeminfos

let systeminfosURL: string = 'https://mytuxedo.de/index.php/s/DcAeZk4TbBTTjRq/download';

async function getSystemInfos(): Promise<Buffer> {
    return new Promise<Buffer>(async (resolve: (value: Buffer | PromiseLike<Buffer>) => void, reject: (reason?: unknown) => void): Promise<void> => {
        try {
          const dataArray: Buffer[] = [];
          const req: ClientRequest = https.get(systeminfosURL, (response: IncomingMessage): void => {

            response.on('data', (data: any): void => {
              dataArray.push(data);
            });

            response.once('end', (): void => {
              resolve(Buffer.concat(dataArray));
            });

            response.once('error', (err: Error): void => {
              reject(err);
            });

          });

          req.once('error', (err: Error): void => {
       reject(err);
          });
        } catch (err: unknown) {
          console.error("ipcBackendAPI: getSystemInfos failed =>", err)
          reject(err);
        }
      });
}

  let systeminfoFilePath: string = '/tmp/tcc/systeminfos.sh';
    function updateSystemInfoLabel(text: string): void
    {
        tccWindow.webContents.send('ipc-update-system-info-label', text);
    }

    async function runSysteminfo(ticketNumber: string): Promise<void> {
        return new Promise<void>(async (resolve: (value: void | PromiseLike<void>) => void, reject: (reason?: unknown) => void): Promise<void> => {
          let fileData: string;
          // Download file
          try {
            updateSystemInfoLabel('Fetching: ' + systeminfosURL);
            const data: Buffer = await getSystemInfos();
            fileData = data.toString();
          } catch (err: unknown) {
            console.error("ipcBackendAPI: runSysteminfo download failed =>", err)
            reject('Download failed'); return;
          }

          // Write file
          try {
            updateSystemInfoLabel('Writing file: ' + systeminfoFilePath);
            await writeTextFile(systeminfoFilePath, fileData, { mode: 0o755 });
          } catch (err: unknown) {
            console.error("ipcBackendAPI: runSysteminfo write failed =>", err)
            reject('Failed to write file ' + systeminfoFilePath); return;
          }

          // Run
          try {
            updateSystemInfoLabel('Running systeminfos.sh');
            await execCmd('pkexec env DISPLAY=$DISPLAY XAUTHORITY=$XAUTHORITY XDG_SESSION_TYPE=$XDG_SESSION_TYPE XDG_CURRENT_DESKTOP=$XDG_CURRENT_DESKTOP sh ' + systeminfoFilePath + ' ' + ticketNumber);
          } catch (err: unknown) {
            console.error("ipcBackendAPI: runSysteminfo run failed =>", err)
            reject('Failed to execute script');
          }
          resolve();
        });
      }

ipcMain.handle('ipc-run-systeminfos', async (event: IpcMainInvokeEvent, ticketNumber: string): Promise<void> => {
    return new Promise<void>(async (resolve: (value: void | PromiseLike<void>) => void, reject: (reason?: unknown) => void): Promise<void> => {
        resolve(runSysteminfo(ticketNumber));
    });
});