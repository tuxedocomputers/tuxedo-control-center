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
import { SysFsController } from './SysFsController';
import {
    SysFsPropertyBoolean,
    SysFsPropertyInteger,
    SysFsPropertyStringList,
    SysFsPropertyString,
    SysFsPropertyNumList
} from './SysFsProperties';

export class LogicalCpuController extends SysFsController {

    public readonly cpuPath: string = path.join(this.basePath, 'cpu' + this.coreIndex);
    private readonly cpufreqPath: string = path.join(this.cpuPath, 'cpufreq');
    private readonly cpuTopologyPath: string = path.join(this.cpuPath, 'topology');

    // cpuX

    /**
     * Note: not available for cpu nr 0
     */
    readonly online = new SysFsPropertyBoolean(path.join(this.cpuPath, 'online'));

    // cpufreq

    readonly scalingCurFreq = new SysFsPropertyInteger(path.join(this.cpufreqPath, 'scaling_cur_freq'));
    readonly scalingMinFreq = new SysFsPropertyInteger(path.join(this.cpufreqPath, 'scaling_min_freq'));
    readonly scalingMaxFreq = new SysFsPropertyInteger(path.join(this.cpufreqPath, 'scaling_max_freq'));
    readonly scalingDriver = new SysFsPropertyString(path.join(this.cpufreqPath, 'scaling_driver'));
    readonly energyPerformanceAvailablePreferences = new SysFsPropertyStringList(
        path.join(this.cpufreqPath, 'energy_performance_available_preferences'));
    readonly energyPerformancePreference = new SysFsPropertyString(path.join(this.cpufreqPath, 'energy_performance_preference'));
    readonly scalingAvailableGovernors = new SysFsPropertyStringList(path.join(this.cpufreqPath, 'scaling_available_governors'));
    readonly scalingGovernor = new SysFsPropertyString(path.join(this.cpufreqPath, 'scaling_governor'));

    readonly cpuinfoMinFreq = new SysFsPropertyInteger(path.join(this.cpufreqPath, 'cpuinfo_min_freq'));
    readonly cpuinfoMaxFreq = new SysFsPropertyInteger(path.join(this.cpufreqPath, 'cpuinfo_max_freq'));

    readonly coreId = new SysFsPropertyInteger(path.join(this.cpuTopologyPath, 'core_id'));
    readonly coreSiblingsList = new SysFsPropertyNumList(path.join(this.cpuTopologyPath, 'core_siblings_list'));
    readonly physicalPackageId = new SysFsPropertyInteger(path.join(this.cpuTopologyPath, 'physical_package_id'));
    readonly threadSiblingsList = new SysFsPropertyNumList(path.join(this.cpuTopologyPath, 'thread_siblings_list'));

    constructor(public readonly basePath: string, public readonly coreIndex: number) {
        super();
    }
}
