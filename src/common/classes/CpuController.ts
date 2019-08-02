import * as path from 'path';
import { SysDevController } from './SysDevController';
import {
    SysDevPropertyInteger,
    SysDevPropertyStringList,
    SysDevPropertyString,
    SysDevPropertyBoolean,
    SysDevPropertyNumList
} from './SysDevProperties';

export class CpuController {

    constructor(public readonly basePath: string) {}

    public readonly cores: LogicalCpuController[];

    public readonly kernelMax = new SysDevPropertyInteger(path.join(this.basePath, 'kernel_max'));
    public readonly offline = new SysDevPropertyNumList(path.join(this.basePath, 'offline'));
    public readonly online = new SysDevPropertyNumList(path.join(this.basePath, 'online'));
    public readonly possible = new SysDevPropertyNumList(path.join(this.basePath, 'possible'));
    public readonly present = new SysDevPropertyNumList(path.join(this.basePath, 'present'));
}

class LogicalCpuController extends SysDevController {

    public readonly cpuPath: string;
    private readonly cpufreqPath: string;

    constructor(public readonly basePath: string, public readonly coreNumber: number) {
        super();
        this.cpuPath = path.join(this.basePath, 'cpu' + coreNumber);
        this.cpufreqPath = path.join(this.cpuPath, 'cpufreq');
    }

    // cpuX

    /**
     * Note: not available for cpu nr 0
     */
    readonly online = new SysDevPropertyBoolean(path.join(this.cpuPath, 'online'));

    // cpufreq


    readonly scalingCurFreq = new SysDevPropertyInteger(path.join(this.cpufreqPath, 'scaling_cur_freq'));
    readonly scalingMinFreq = new SysDevPropertyInteger(path.join(this.cpufreqPath, 'scaling_min_freq'));
    readonly scalingMaxFreq = new SysDevPropertyInteger(path.join(this.cpufreqPath, 'scaling_max_freq'));
    readonly energyPerformanceAvailablePreferences = new SysDevPropertyStringList(
        path.join(this.cpufreqPath, 'energy_performance_available_preferences'));
    readonly energyPerformancePreference = new SysDevPropertyString(path.join(this.cpufreqPath, 'energy_performance_preference'));
    readonly scalingAvailableGovernors = new SysDevPropertyStringList(path.join(this.cpufreqPath, 'scaling_available_governors'));
    readonly scalingGovernor = new SysDevPropertyString(path.join(this.cpufreqPath, 'scaling_governor'));
}
