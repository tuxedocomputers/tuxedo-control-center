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

import * as path from 'node:path';
import { IntelPstateController } from './IntelPStateController';
import { LogicalCpuController, ScalingDriver } from './LogicalCpuController';
import {
    SysFsPropertyBoolean,
    SysFsPropertyInteger,
    SysFsPropertyNumList,
    SysFsPropertyString,
} from './SysFsProperties';
import { findClosestValue } from './Utils';

export class CpuController {
    constructor(public readonly basePath: string) {
        this.cores = [];
        this.basePath = basePath;

        this.kernelMax = new SysFsPropertyInteger(path.join(basePath, 'kernel_max'));
        this.offline = new SysFsPropertyNumList(path.join(basePath, 'offline'));
        this.online = new SysFsPropertyNumList(path.join(basePath, 'online'));
        this.possible = new SysFsPropertyNumList(path.join(basePath, 'possible'));
        this.present = new SysFsPropertyNumList(path.join(basePath, 'present'));
        this.intelPstate = new IntelPstateController(path.join(basePath, 'intel_pstate'));
        this.boost = new SysFsPropertyBoolean(path.join(basePath, 'cpufreq/boost'));
        this.amdPstateStatus = new SysFsPropertyString(path.join(basePath, 'amd_pstate/status'));

        this.getAvailableLogicalCores(basePath);
    }

    public cores: LogicalCpuController[];
    private unsupportedEnergyPreferenceValues: string[] = [];

    public readonly kernelMax: SysFsPropertyInteger;
    public readonly offline: SysFsPropertyNumList;
    public readonly online: SysFsPropertyNumList;
    public readonly possible: SysFsPropertyNumList;
    public readonly present: SysFsPropertyNumList;

    public readonly intelPstate: IntelPstateController;

    public readonly boost: SysFsPropertyBoolean;
    public readonly amdPstateStatus: SysFsPropertyString;

    public getAvailableLogicalCores(basePath: string): void {
        // Add "possible" and "present" logical cores
        this.cores = [];
        try {
            const possibleCores: number[] = this.possible.readValue();
            const presentCores: number[] = this.present.readValue();
            const coreIndexToAdd: number[] = [];
            for (const possibleCoreIndex of possibleCores) {
                if (presentCores.includes(possibleCoreIndex)) {
                    coreIndexToAdd.push(possibleCoreIndex);
                }
            }
            coreIndexToAdd.sort((a: number, b: number): number => a - b);
            for (const coreIndex of coreIndexToAdd) {
                const newCore = new LogicalCpuController(basePath, coreIndex);
                if (coreIndex === 0 || newCore.online.isAvailable()) {
                    this.cores.push(newCore);
                }
            }
        } catch (err: unknown) {
            console.error(`CpuController: getAvailableLogicalCores failed => ${err}`);
        }
    }

    /**
     * Sets the selected number of cpu cores to be online, the rest to be offline
     *
     * @param numberOfCores Number of logical cpu cores to use, defaults to "use all available"
     */
    public useCores(numberOfCores?: number): void {
        if (numberOfCores === undefined) {
            numberOfCores = this.cores?.length;
        }
        if (numberOfCores === 0) {
            return;
        }
        for (let i: number = 1; i < this.cores?.length; ++i) {
            if (!this.cores[i].online.isAvailable()) {
                continue;
            }
            if (i < numberOfCores) {
                this.cores[i].online.writeValue(true);
            } else {
                this.cores[i].online.writeValue(false);
            }
        }
    }

    /**
     * Sets the scaling_max_freq parameter for the current governor for all available logical cores
     *
     * @param setMaxFrequency Maximum scaling frequency value to set, defaults to max value for core
     */
    // todo: function too long
    public setGovernorScalingMaxFrequency(setMaxFrequency?: number): void {
        let scalingDriver: string;

        for (const core of this.cores) {
            if (
                !core.scalingMinFreq.isAvailable() ||
                !core.scalingMaxFreq.isAvailable() ||
                !core.cpuinfoMinFreq.isAvailable() ||
                !core.cpuinfoMaxFreq.isAvailable()
            ) {
                continue;
            }
            if (core.coreIndex !== 0 && !core.online.readValue()) {
                continue;
            }
            //const coreMinFrequency = core.cpuinfoMinFreq.readValue();
            const coreMaxFrequency: number = core.cpuinfoMaxFreq.readValue();
            const scalingMinFrequency: number = core.scalingMinFreq.readValue();

            const scalingFrequencyAvailable: boolean = this.cores[0].scalingAvailableFrequencies.isAvailable();
            let availableFrequencies: number[];
            if (scalingFrequencyAvailable) {
                availableFrequencies = core.scalingAvailableFrequencies.readValueNT();
            }
            const scalingDriverAvailable: boolean = this.cores[0].scalingAvailableFrequencies.isAvailable();
            if (scalingDriverAvailable) {
                scalingDriver = core.scalingDriver.readValueNT();
            }
            let newMaxFrequency: number;

            // Default to max available
            if (setMaxFrequency === undefined) {
                newMaxFrequency = coreMaxFrequency;
            } else if (setMaxFrequency === -1) {
                if (this.boost.isAvailable() && scalingDriver === ScalingDriver.acpi_cpufreq) {
                    newMaxFrequency = coreMaxFrequency;
                } else {
                    newMaxFrequency = core.getReducedAvailableFreq();
                }
            } else {
                newMaxFrequency = setMaxFrequency;
            }

            // Enforce min/max limits
            if (newMaxFrequency > coreMaxFrequency) {
                newMaxFrequency = coreMaxFrequency;
            } else if (newMaxFrequency < scalingMinFrequency) {
                newMaxFrequency = scalingMinFrequency;
            }

            // Additionally verify that it is one of the available frequencies
            // ..if available frequencies are defined
            if (availableFrequencies !== undefined) {
                availableFrequencies = availableFrequencies.filter(
                    (value: number): boolean => value >= scalingMinFrequency,
                );
                if (availableFrequencies?.length === 0) {
                    continue;
                }
                newMaxFrequency = findClosestValue(newMaxFrequency, availableFrequencies);
            }

            core.scalingMaxFreq.writeValue(newMaxFrequency);
        }

        // AMD does not count boost frequency to coreMaxFrequency while Intel does. So on AMD a setMaxFrequency over
        // coreMaxFrequency indicates that the boost switch should be enabled. On Intel this switch doesn't exist
        // and boost is handled via scalingMaxFreq.
        const maxFrequency: number = this.cores[0].cpuinfoMaxFreq.readValue();
        let maximumAvailableFrequency: number = maxFrequency;

        const scalingFrequencyAvailable: boolean = this.cores[0].scalingAvailableFrequencies.isAvailable();
        if (scalingFrequencyAvailable) {
            const availableFrequencies: number[] = this.cores[0].scalingAvailableFrequencies.readValueNT();
            if (availableFrequencies !== undefined) {
                maximumAvailableFrequency = availableFrequencies[0];
            }
        }

        if (this.boost.isAvailable() && scalingDriver === ScalingDriver.acpi_cpufreq) {
            if (setMaxFrequency === undefined || setMaxFrequency > maximumAvailableFrequency) {
                this.boost.writeValue(true);
            } else {
                this.boost.writeValue(false);
            }
        }
    }

    /**
     * Sets the scaling_min_freq parameter for the current governor for all available logical cores
     *
     * @param setMinFrequency Minimum scaling frequency value to set, defaults to min value for core
     */
    public setGovernorScalingMinFrequency(setMinFrequency?: number): void {
        for (const core of this.cores) {
            if (
                !core.scalingMinFreq.isAvailable() ||
                !core.scalingMaxFreq.isAvailable() ||
                !core.cpuinfoMinFreq.isAvailable() ||
                !core.cpuinfoMaxFreq.isAvailable()
            ) {
                continue;
            }
            if (core.coreIndex !== 0 && !core.online.readValue()) {
                continue;
            }
            const coreMinFrequency: number = core.cpuinfoMinFreq.readValue();
            const coreMaxFrequency: number = core.cpuinfoMaxFreq.readValue();
            const scalingMaxFrequency: number = core.scalingMaxFreq.readValue();

            const scalingAvailable: boolean = core.scalingAvailableFrequencies.isAvailable();
            let availableFrequencies: number[];
            if (scalingAvailable) {
                availableFrequencies = core.scalingAvailableFrequencies.readValueNT();
            }

            let newMinFrequency: number;

            // Default to min available freq
            if (setMinFrequency === undefined) {
                newMinFrequency = coreMinFrequency;
            } else if (setMinFrequency === -2) {
                newMinFrequency = coreMaxFrequency;
            } else {
                newMinFrequency = setMinFrequency;

                // Enforce min/max limits
                if (newMinFrequency < coreMinFrequency) {
                    newMinFrequency = coreMinFrequency;
                } else if (newMinFrequency > scalingMaxFrequency) {
                    newMinFrequency = scalingMaxFrequency;
                }
            }

            // Additionally verify that it is one of the available frequencies
            // ..if available frequencies are defined
            if (availableFrequencies !== undefined) {
                availableFrequencies = availableFrequencies.filter(
                    (value: number): boolean => value <= scalingMaxFrequency,
                );
                if (availableFrequencies?.length === 0) {
                    continue;
                }
                newMinFrequency = findClosestValue(newMinFrequency, availableFrequencies);
            }

            core.scalingMinFreq.writeValue(newMinFrequency);
        }
    }

    /**
     * Sets the scaling_governor parameter for all available logical cores
     * if it exists in the list of available governors
     *
     * @param governor The chosen governor (the same will be applied to all cores),
     *                 defaults to "don't set"
     */
    public setGovernor(governor?: string): void {
        if (governor === undefined) {
            return;
        }

        for (const core of this.cores) {
            if (!core.scalingGovernor.isAvailable() || !core.scalingAvailableGovernors.isAvailable()) {
                continue;
            }
            if (core.coreIndex !== 0 && !core.online.readValue()) {
                return;
            }
            const availableGovernors: string[] = core.scalingAvailableGovernors.readValue();
            if (availableGovernors.includes(governor)) {
                core.scalingGovernor.writeValue(governor);
            } else {
                throw Error(
                    `CpuController: setGovernor: Choosen governor '${governor}' is not available (${core.cpuPath}), available are: ${JSON.stringify(availableGovernors)}`,
                );
            }
        }
    }

    /**
     * Sets the energy_performance_preference parameter for all available logical cores
     * if it exists in the list of available energy performance preference options
     *
     * @param performancePreference The chosen energy performance preference (the same
     *                              will be applied to all cores), defaults to "don't set"
     */
    public setEnergyPerformancePreference(performancePreference?: string): void {
        if (performancePreference === undefined) {
            return;
        }

        // core.energyPerformancePreference.isWritable() is not enough to check if file is writable, returns true and write results in "EINVAL: invalid argument"
        // the path is indeed writable, but does not accept the supplied value and only works with certain values
        // checking if value can be written, assuming that write is not possible if it failed once, to avoid repeated access errors
        if (this.unsupportedEnergyPreferenceValues.includes(performancePreference)) {
            return;
        }

        for (const core of this.cores) {
            if (
                !core.energyPerformancePreference.isAvailable() ||
                !core.energyPerformanceAvailablePreferences.isAvailable() ||
                !core.energyPerformancePreference.isWritable()
            ) {
                continue;
            }
            if (core.coreIndex !== 0 && !core.online.readValue()) {
                return;
            }
            if (core.energyPerformanceAvailablePreferences.readValue().includes(performancePreference)) {
                try {
                    core.energyPerformancePreference.writeValue(performancePreference);
                } catch (err: unknown) {
                    console.error(
                        `CpuController: setEnergyPerformancePreference: ${performancePreference} is not supported.`,
                    );
                    this.unsupportedEnergyPreferenceValues.push(performancePreference);
                    break;
                }
            }
        }
    }
}
