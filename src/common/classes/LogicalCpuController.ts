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
import { SysFsController } from './SysFsController';
import {
    SysFsPropertyBoolean,
    SysFsPropertyInteger,
    SysFsPropertyStringList,
    SysFsPropertyString,
    SysFsPropertyNumList
} from './SysFsProperties';

export enum ScalingDriver {
    acpi_cpufreq = 'acpi-cpufreq',
    intel_pstate = 'intel_pstate',
    amd_pstate = 'amd-pstate',
    amd_pstate_epp = 'amd-pstate-epp',
}

export class LogicalCpuController extends SysFsController {

    public readonly cpuPath: string;
    private readonly cpufreqPath: string;
    private readonly cpuTopologyPath: string;

    // cpuX

    /**
     * Note: not available for cpu nr 0
     */
    readonly online: SysFsPropertyBoolean;

    // cpufreq

    readonly scalingCurFreq: SysFsPropertyInteger;
    readonly scalingMinFreq: SysFsPropertyInteger;
    readonly scalingMaxFreq: SysFsPropertyInteger;
    readonly scalingAvailableFrequencies: SysFsPropertyNumList;
    readonly scalingDriver: SysFsPropertyString;
    readonly energyPerformanceAvailablePreferences: SysFsPropertyStringList;
    readonly energyPerformancePreference: SysFsPropertyString;
    readonly scalingAvailableGovernors: SysFsPropertyStringList;
    readonly scalingGovernor: SysFsPropertyString;

    readonly cpuinfoMinFreq: SysFsPropertyInteger;
    readonly cpuinfoMaxFreq: SysFsPropertyInteger;

    readonly coreId: SysFsPropertyInteger;
    readonly coreSiblingsList: SysFsPropertyNumList;
    readonly physicalPackageId: SysFsPropertyInteger;
    readonly threadSiblingsList: SysFsPropertyNumList;

    constructor(
        public readonly basePath: string,
        public readonly coreIndex: number,
    ) {
        super();

        this.cpuPath = path.join(basePath, `cpu${coreIndex}`);
        this.cpufreqPath = path.join(this.cpuPath, "cpufreq");
        this.cpuTopologyPath = path.join(this.cpuPath, "topology");

        this.online = new SysFsPropertyBoolean(
            path.join(this.cpuPath, "online"),
        );

        this.scalingCurFreq = new SysFsPropertyInteger(
            path.join(this.cpufreqPath, "scaling_cur_freq"),
        );
        this.scalingMinFreq = new SysFsPropertyInteger(
            path.join(this.cpufreqPath, "scaling_min_freq"),
        );
        this.scalingMaxFreq = new SysFsPropertyInteger(
            path.join(this.cpufreqPath, "scaling_max_freq"),
        );
        this.scalingAvailableFrequencies = new SysFsPropertyNumList(
            path.join(this.cpufreqPath, "scaling_available_frequencies"),
            undefined,
            " ",
        );
        this.scalingDriver = new SysFsPropertyString(
            path.join(this.cpufreqPath, "scaling_driver"),
        );
        this.energyPerformanceAvailablePreferences =
            new SysFsPropertyStringList(
                path.join(
                    this.cpufreqPath,
                    "energy_performance_available_preferences",
                ),
            );
        this.energyPerformancePreference = new SysFsPropertyString(
            path.join(this.cpufreqPath, "energy_performance_preference"),
        );
        this.scalingAvailableGovernors = new SysFsPropertyStringList(
            path.join(this.cpufreqPath, "scaling_available_governors"),
        );
        this.scalingGovernor = new SysFsPropertyString(
            path.join(this.cpufreqPath, "scaling_governor"),
        );

        this.cpuinfoMinFreq = new SysFsPropertyInteger(
            path.join(this.cpufreqPath, "cpuinfo_min_freq"),
        );
        this.cpuinfoMaxFreq = new SysFsPropertyInteger(
            path.join(this.cpufreqPath, "cpuinfo_max_freq"),
        );

        this.coreId = new SysFsPropertyInteger(
            path.join(this.cpuTopologyPath, "core_id"),
        );
        this.coreSiblingsList = new SysFsPropertyNumList(
            path.join(this.cpuTopologyPath, "core_siblings_list"),
        );
        this.physicalPackageId = new SysFsPropertyInteger(
            path.join(this.cpuTopologyPath, "physical_package_id"),
        );
        this.threadSiblingsList = new SysFsPropertyNumList(
            path.join(this.cpuTopologyPath, "thread_siblings_list"),
        );
    }

    public getReducedAvailableFreq(): number {
        let averageFreq: number;
        const coreMaxFrequency: number = this.cpuinfoMaxFreq.readValue();
        const scalingAvailable: boolean = this.scalingAvailableFrequencies.isAvailable()
        if (scalingAvailable) {
            const availableFrequencies: number[] = this.scalingAvailableFrequencies.readValueNT();
            if (availableFrequencies !== undefined && availableFrequencies?.length !== 0) {
                averageFreq = availableFrequencies[Math.floor(availableFrequencies?.length / 2.0)];
            } else {
                averageFreq = Math.round((coreMaxFrequency) / 2);
            }
        }

        return averageFreq;
    }

    public getReducedAvailableFreqNT(): number {
        try {
            return this.getReducedAvailableFreq();
        } catch (err: unknown) {
            console.error(`LogicalCpuController: getReducedAvailableFreqNT failed => ${err}`)
            return undefined;
        }
    }
}
