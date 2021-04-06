/*!
 * Copyright (c) 2019-2020 TUXEDO Computers GmbH <tux@tuxedocomputers.com>
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
import * as path from 'path';
import { LogicalCpuController } from './LogicalCpuController';
import { SysFsPropertyInteger, SysFsPropertyNumList } from './SysFsProperties';
import { IntelPstateController } from './IntelPStateController';
import { findClosestValue } from './Utils';

export class CpuController {

    constructor(public readonly basePath: string) {
        this.cores = [];
        this.getAvailableLogicalCores();
    }

    public cores: LogicalCpuController[];

    public readonly kernelMax = new SysFsPropertyInteger(path.join(this.basePath, 'kernel_max'));
    public readonly offline = new SysFsPropertyNumList(path.join(this.basePath, 'offline'));
    public readonly online = new SysFsPropertyNumList(path.join(this.basePath, 'online'));
    public readonly possible = new SysFsPropertyNumList(path.join(this.basePath, 'possible'));
    public readonly present = new SysFsPropertyNumList(path.join(this.basePath, 'present'));

    public readonly intelPstate = new IntelPstateController(path.join(this.basePath, 'intel_pstate'));

    public readonly boost = new SysFsPropertyNumList(path.join(this.basePath, 'cpufreq/boost'));

    public getAvailableLogicalCores(): void {
        // Add "possible" and "present" logical cores
        this.cores = [];
        try {
            const possibleCores = this.possible.readValue();
            const presentCores = this.present.readValue();
            const coreIndexToAdd: number[] = [];
            for (const possibleCoreIndex of possibleCores) {
                if (presentCores.includes(possibleCoreIndex)) {
                    coreIndexToAdd.push(possibleCoreIndex);
                }
            }
            coreIndexToAdd.sort((a, b) => a - b );
            for (const coreIndex of coreIndexToAdd) {
                const newCore = new LogicalCpuController(this.basePath, coreIndex);
                if (coreIndex === 0 || newCore.online.isAvailable()) {
                    this.cores.push(newCore);
                }
            }
        } catch (err) {}
    }

    /**
     * Sets the selected number of cpu cores to be online, the rest to be offline
     *
     * @param numberOfCores Number of logical cpu cores to use, defaults to "use all available"
     */
    public useCores(numberOfCores?: number): void {
        if (numberOfCores === undefined) { numberOfCores = this.cores.length; }
        if (numberOfCores === 0) { return; }
        for (let i = 1; i < this.cores.length; ++i) {
            if (!this.cores[i].online.isAvailable()) { continue; }
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
    public setGovernorScalingMaxFrequency(setMaxFrequency?: number): void {
        for (const core of this.cores) {
            if (!core.scalingMinFreq.isAvailable() || !core.scalingMaxFreq.isAvailable()
                || !core.cpuinfoMinFreq.isAvailable() || !core.cpuinfoMaxFreq.isAvailable()) { continue; }
            if (core.coreIndex !== 0 && !core.online.readValue()) { continue; }
            const coreMinFrequency = core.cpuinfoMinFreq.readValue();
            const coreMaxFrequency = core.cpuinfoMaxFreq.readValue();
            const scalingMinFrequency = core.scalingMinFreq.readValue();
            let availableFrequencies = core.scalingAvailableFrequencies.readValueNT();
            let newMaxFrequency: number;


            // Default to max available
            if (setMaxFrequency === undefined) {
                newMaxFrequency = coreMaxFrequency;
            } else if (setMaxFrequency === -1) {
                newMaxFrequency = core.getReducedAvailableFreq();
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
                availableFrequencies = availableFrequencies.filter(value => value >= scalingMinFrequency);
                if (availableFrequencies.length === 0) { continue; }
                newMaxFrequency = findClosestValue(newMaxFrequency, availableFrequencies);
            }

            core.scalingMaxFreq.writeValue(newMaxFrequency);
        }
    }

    /**
     * Sets the scaling_min_freq parameter for the current governor for all available logical cores
     *
     * @param setMinFrequency Minimum scaling frequency value to set, defaults to min value for core
     */
    public setGovernorScalingMinFrequency(setMinFrequency?: number): void {
        for (const core of this.cores) {
            if (!core.scalingMinFreq.isAvailable() || !core.scalingMaxFreq.isAvailable()
                || !core.cpuinfoMinFreq.isAvailable() || !core.cpuinfoMaxFreq.isAvailable()) { continue; }
            if (core.coreIndex !== 0 && !core.online.readValue()) { continue; }
            const coreMinFrequency = core.cpuinfoMinFreq.readValue();
            const coreMaxFrequency = core.cpuinfoMaxFreq.readValue();
            const scalingMaxFrequency = core.scalingMaxFreq.readValue();
            let availableFrequencies = core.scalingAvailableFrequencies.readValueNT();

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
                availableFrequencies = availableFrequencies.filter(value => value <= scalingMaxFrequency);
                if (availableFrequencies.length === 0) { continue; }
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
    public setGovernor(governor?: string) {
        if (governor === undefined) {
            return;
        }

        for (const core of this.cores) {
            if (!core.scalingGovernor.isAvailable() || !core.scalingAvailableGovernors.isAvailable()) { continue; }
            if (core.coreIndex !== 0 && !core.online.readValue()) { return; }
            const availableGovernors = core.scalingAvailableGovernors.readValue();
            if (availableGovernors.includes(governor)) {
                core.scalingGovernor.writeValue(governor);
            } else {
                throw Error('setGovernor: choosen governor \''
                 + governor + '\' is not available (' + core.cpuPath
                 + ') available are: ' + JSON.stringify(availableGovernors));
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
    public setEnergyPerformancePreference(performancePreference?: string) {
        if (performancePreference === undefined) {
            return;
        }

        for (const core of this.cores) {
            if (!core.energyPerformancePreference.isAvailable() || !core.energyPerformanceAvailablePreferences.isAvailable()) { continue; }
            if (core.coreIndex !== 0 && !core.online.readValue()) { return; }
            if (core.energyPerformanceAvailablePreferences.readValue().includes(performancePreference)) {
                core.energyPerformancePreference.writeValue(performancePreference);
            }
        }
    }
}
