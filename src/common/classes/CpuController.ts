/*!
 * Copyright (c) 2019 TUXEDO Computers GmbH <tux@tuxedocomputers.com>
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
     * @param maxFrequency Maximum scaling frequency value to set, defaults to max value for core
     */
    public setGovernorScalingMaxFrequency(maxFrequency?: number): void {
        for (const core of this.cores) {
            if (!core.scalingMinFreq.isAvailable() || !core.scalingMaxFreq.isAvailable()
                || !core.cpuinfoMinFreq.isAvailable() || !core.cpuinfoMaxFreq.isAvailable()) { continue; }
            if (core.coreIndex !== 0 && !core.online.readValue()) { continue; }
            const coreMinFrequency = core.cpuinfoMinFreq.readValue();
            const coreMaxFrequency = core.cpuinfoMaxFreq.readValue();
            let newMaxFrequency: number;
            if (maxFrequency === undefined) {
                newMaxFrequency = coreMaxFrequency;
            } else {
                newMaxFrequency = maxFrequency;
            }
            const currentMinFrequency = core.scalingMinFreq.readValue();
            if (newMaxFrequency <= coreMaxFrequency && newMaxFrequency >= currentMinFrequency) {
                core.scalingMaxFreq.writeValue(newMaxFrequency);
            } else {
                throw Error('setGovernorScalingMaxFrequency: new frequency ' + newMaxFrequency + ' is out of range');
            }
        }
    }

    /**
     * Sets the scaling_min_freq parameter for the current governor for all available logical cores
     *
     * @param minFrequency Minimum scaling frequency value to set, defaults to min value for core
     */
    public setGovernorScalingMinFrequency(minFrequency?: number): void {
        for (const core of this.cores) {
            if (!core.scalingMinFreq.isAvailable() || !core.scalingMaxFreq.isAvailable()
                || !core.cpuinfoMinFreq.isAvailable() || !core.cpuinfoMaxFreq.isAvailable()) { continue; }
            if (core.coreIndex !== 0 && !core.online.readValue()) { continue; }
            const coreMinFrequency = core.cpuinfoMinFreq.readValue();
            const coreMaxFrequency = core.cpuinfoMaxFreq.readValue();
            let newMinFrequency: number;
            if (minFrequency === undefined) {
                newMinFrequency = coreMinFrequency;
            } else {
                newMinFrequency = minFrequency;
            }

            const currentMaxFrequency = core.scalingMaxFreq.readValue();
            if (newMinFrequency <= currentMaxFrequency && newMinFrequency >= coreMinFrequency) {
                core.scalingMinFreq.writeValue(newMinFrequency);
            }
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
