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

import type { IpcMainEvent, IpcMainInvokeEvent } from 'electron';
import { ipcMain } from 'electron';
import { CpuController } from '../../common/classes/CpuController';
import { ScalingDriver } from '../../common/classes/LogicalCpuController';
import type { IGeneralCPUInfo, ILogicalCoreInfo } from '../../common/models/ICpuInfos';

const cpu: CpuController = new CpuController('/sys/devices/system/cpu');

// todo: values can most likely be gathered in the cpu worker via onWork() instead to avoid unnecessary duplicated file access
// there already is core.scalingAvailableFrequencies.readValueNT() and this.cpuCtrl.cores[0].cpuinfoMinFreq.readValueNT() for example
// todo: readValueNT() is sync and thus it is an async function which runs sync code
ipcMain.handle('get-general-cpu-info-async', (event: IpcMainInvokeEvent): Promise<IGeneralCPUInfo> => {
    return new Promise<IGeneralCPUInfo>(
        (
            resolve: (value: IGeneralCPUInfo | PromiseLike<IGeneralCPUInfo>) => void,
            reject: (reason?: unknown) => void,
        ): void => {
            try {
                let cpuInfo: IGeneralCPUInfo;
                const scalingDriver: string = cpu.cores[0].scalingDriver.readValueNT();
                try {
                    const cpuinfoMinFreqAvailable: boolean = cpu.cores[0].cpuinfoMinFreq.isAvailable();
                    let minFreq: number;
                    if (cpuinfoMinFreqAvailable) {
                        minFreq = cpu.cores[0].cpuinfoMinFreq.readValueNT();
                    }

                    const cpuinfoMaxFreqAvailable: boolean = cpu.cores[0].cpuinfoMaxFreq.isAvailable();
                    let maxFreq: number;
                    if (cpuinfoMaxFreqAvailable) {
                        maxFreq = cpu.cores[0].cpuinfoMaxFreq.readValueNT();
                    }

                    const scalingAvailableFrequenciesAvailable: boolean =
                        cpu.cores[0].scalingAvailableFrequencies.isAvailable();
                    let scalingAvailableFrequencies: number[];
                    if (scalingAvailableFrequenciesAvailable) {
                        scalingAvailableFrequencies = cpu.cores[0].scalingAvailableFrequencies.readValueNT();
                    }

                    const scalingAvailableGovernorsAvailable: boolean =
                        cpu.cores[0].scalingAvailableGovernors.isAvailable();
                    let scalingAvailableGovernors: string[];
                    if (scalingAvailableGovernorsAvailable) {
                        scalingAvailableGovernors = cpu.cores[0].scalingAvailableGovernors.readValueNT();
                    }

                    const energyPerformanceAvailablePreferencesAvailable: boolean =
                        cpu.cores[0].energyPerformanceAvailablePreferences.isAvailable();
                    let energyPerformanceAvailablePreferences: string[];
                    if (energyPerformanceAvailablePreferencesAvailable) {
                        energyPerformanceAvailablePreferences =
                            cpu.cores[0].energyPerformanceAvailablePreferences.readValueNT();
                    }

                    const boostAvailable: boolean = cpu.boost.isAvailable();
                    let boost: boolean;
                    if (boostAvailable) {
                        boost = cpu.boost.readValueNT();
                    }

                    cpuInfo = {
                        availableCores: cpu.cores?.length,
                        minFreq: minFreq,
                        maxFreq: maxFreq,
                        scalingAvailableFrequencies: scalingAvailableFrequencies,
                        scalingAvailableGovernors: scalingAvailableGovernors,
                        energyPerformanceAvailablePreferences: energyPerformanceAvailablePreferences,
                        reducedAvailableFreq: cpu.cores[0].getReducedAvailableFreqNT(),
                        boost: boost,
                    };
                    if (cpuInfo.scalingAvailableFrequencies !== undefined) {
                        cpuInfo.maxFreq = cpuInfo.scalingAvailableFrequencies[0];
                    }
                    if (cpuInfo.boost !== undefined && scalingDriver === ScalingDriver.acpi_cpufreq) {
                        // FIXME: Use actual max boost frequency
                        cpuInfo.maxFreq += 1000000;
                        cpuInfo.scalingAvailableFrequencies = [cpuInfo.maxFreq].concat(
                            cpuInfo.scalingAvailableFrequencies,
                        );
                    }
                } catch (err: unknown) {
                    console.log(err);
                }
                resolve(cpuInfo);
            } catch (err: unknown) {
                console.error(`cpuAPI: get-general-cpu-info-async failed => ${err}`);
                reject(err);
            }
        },
    );
});

// todo: same todos as above
ipcMain.handle('get-logical-core-info-async', (event: IpcMainInvokeEvent): Promise<ILogicalCoreInfo[]> => {
    return new Promise<ILogicalCoreInfo[]>(
        (
            resolve: (value: ILogicalCoreInfo[] | PromiseLike<ILogicalCoreInfo[]>) => void,
            reject: (reason?: unknown) => void,
        ): void => {
            try {
                const coreInfoList: ILogicalCoreInfo[] = [];
                for (const core of cpu.cores) {
                    try {
                        let onlineStatus: boolean = true;
                        if (core.coreIndex !== 0) {
                            onlineStatus = core.online.readValue();
                        }
                        // Skip core if offline
                        if (!onlineStatus) {
                            continue;
                        }

                        const scalingCurFreqAvailable: boolean = core.scalingCurFreq.isAvailable();
                        let scalingCurFreq: number;
                        if (scalingCurFreqAvailable) {
                            scalingCurFreq = core.scalingCurFreq.readValueNT();
                        }

                        const scalingMinFreqAvailable: boolean = core.scalingMinFreq.isAvailable();
                        let scalingMinFreq: number;
                        if (scalingMinFreqAvailable) {
                            scalingMinFreq = core.scalingMinFreq.readValueNT();
                        }

                        const scalingMaxFreqAvailable: boolean = core.scalingMaxFreq.isAvailable();
                        let scalingMaxFreq: number;
                        if (scalingMaxFreqAvailable) {
                            scalingMaxFreq = core.scalingMaxFreq.readValueNT();
                        }

                        const scalingDriverAvailable: boolean = core.scalingDriver.isAvailable();
                        let scalingDriver: string;
                        if (scalingDriverAvailable) {
                            scalingDriver = core.scalingDriver.readValueNT();
                        }

                        const energyPerformanceAvailablePreferencesAvailable: boolean =
                            core.energyPerformanceAvailablePreferences.isAvailable();
                        let energyPerformanceAvailablePreferences: string[];
                        if (energyPerformanceAvailablePreferencesAvailable) {
                            energyPerformanceAvailablePreferences =
                                core.energyPerformanceAvailablePreferences.readValueNT();
                        }

                        const energyPerformancePreferenceAvailable: boolean =
                            core.energyPerformancePreference.isAvailable();
                        let energyPerformancePreference: string;
                        if (energyPerformancePreferenceAvailable) {
                            energyPerformancePreference = core.energyPerformancePreference.readValueNT();
                        }

                        const scalingAvailableGovernorsAvailable: boolean =
                            core.scalingAvailableGovernors.isAvailable();
                        let scalingAvailableGovernors: string[];
                        if (scalingAvailableGovernorsAvailable) {
                            scalingAvailableGovernors = core.scalingAvailableGovernors.readValueNT();
                        }

                        const constscalingGovernorAvailable: boolean = core.scalingGovernor.isAvailable();
                        let scalingGovernor: string;
                        if (constscalingGovernorAvailable) {
                            scalingGovernor = core.scalingGovernor.readValueNT();
                        }

                        const cpuInfoMaxFreqAvailable: boolean = core.cpuinfoMaxFreq.isAvailable();
                        let cpuInfoMaxFreq: number;
                        if (cpuInfoMaxFreqAvailable) {
                            cpuInfoMaxFreq = core.cpuinfoMaxFreq.readValueNT();
                        }

                        const cpuInfoMinFreqAvailable: boolean = core.cpuinfoMinFreq.isAvailable();
                        let cpuInfoMinFreq: number;
                        if (cpuInfoMinFreqAvailable) {
                            cpuInfoMinFreq = core.cpuinfoMinFreq.readValueNT();
                        }

                        const coreIdAvailable: boolean = core.coreId.isAvailable();
                        let coreId: number;
                        if (coreIdAvailable) {
                            coreId = core.coreId.readValueNT();
                        }

                        const coreSiblingsListAvailable: boolean = core.coreSiblingsList.isAvailable();
                        let coreSiblingsList: number[];
                        if (coreSiblingsListAvailable) {
                            coreSiblingsList = core.coreSiblingsList.readValueNT();
                        }

                        const physicalPackageIdAvailable: boolean = core.physicalPackageId.isAvailable();
                        let physicalPackageId: number;
                        if (physicalPackageIdAvailable) {
                            physicalPackageId = core.physicalPackageId.readValueNT();
                        }

                        const threadSiblingsListAvailable: boolean = core.threadSiblingsList.isAvailable();
                        let threadSiblingsList: number[];
                        if (threadSiblingsListAvailable) {
                            threadSiblingsList = core.threadSiblingsList.readValueNT();
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
                            threadSiblingsList: threadSiblingsList,
                        };
                        coreInfoList.push(coreInfo);
                    } catch (err: unknown) {
                        console.error(`cpuAPI: get-logical-core-info-async loop failed => ${err}`);
                    }
                }
                resolve(coreInfoList);
            } catch (err: unknown) {
                console.error(`cpuAPI: get-logical-core-info-async failed => ${err}`);
                reject(err);
            }
        },
    );
});

ipcMain.handle('get-intel-pstate-turbo-value-async', (event: IpcMainInvokeEvent): Promise<boolean> => {
    return new Promise<boolean>(
        (resolve: (value: boolean | PromiseLike<boolean>) => void, reject: (reason?: unknown) => void): void => {
            try {
                if (cpu.intelPstate.noTurbo.isAvailable()) {
                    resolve(cpu.intelPstate.noTurbo.readValueNT());
                }
                resolve(false);
            } catch (err: unknown) {
                console.error(`cpuAPI: get-intel-pstate-turbo-value-async failed => ${err}`);
                reject(err);
            }
        },
    );
});

ipcMain.on('comp-get-scaling-driver-acpi-cpu-freq-sync', (event: IpcMainEvent): string => {
    try {
        const scalingDriver: string = ScalingDriver.acpi_cpufreq;
        return scalingDriver;
    } catch (err: unknown) {
        console.error(`cpuApi: comp-get-scaling-driver-acpi-cpu-freq-sync failed => ${err}`);
        throw err;
    }
});
