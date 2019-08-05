import * as path from 'path';
import { SysDevController } from './SysDevController';
import { SysDevPropertyBoolean, SysDevPropertyInteger, SysDevPropertyStringList, SysDevPropertyString } from './SysDevProperties';

export class LogicalCpuController extends SysDevController {

    public readonly cpuPath: string;
    private readonly cpufreqPath: string;

    // cpuX

    /**
     * Note: not available for cpu nr 0
     */
    readonly online: SysDevPropertyBoolean;

    // cpufreq

    readonly scalingCurFreq: SysDevPropertyInteger;
    readonly scalingMinFreq: SysDevPropertyInteger;
    readonly scalingMaxFreq: SysDevPropertyInteger;
    readonly energyPerformanceAvailablePreferences: SysDevPropertyStringList;
    readonly energyPerformancePreference: SysDevPropertyString;
    readonly scalingAvailableGovernors: SysDevPropertyStringList;
    readonly scalingGovernor: SysDevPropertyString;


    constructor(public readonly basePath: string, public readonly coreIndex: number) {
        super();
        this.cpuPath = path.join(this.basePath, 'cpu' + this.coreIndex);
        this.cpufreqPath = path.join(this.cpuPath, 'cpufreq');

        this.online = new SysDevPropertyBoolean(path.join(this.cpuPath, 'online'));
        this.scalingCurFreq = new SysDevPropertyInteger(path.join(this.cpufreqPath, 'scaling_cur_freq'));
        this.scalingMinFreq = new SysDevPropertyInteger(path.join(this.cpufreqPath, 'scaling_min_freq'));
        this.scalingMaxFreq = new SysDevPropertyInteger(path.join(this.cpufreqPath, 'scaling_max_freq'));
        this.energyPerformanceAvailablePreferences = new SysDevPropertyStringList(
            path.join(this.cpufreqPath, 'energy_performance_available_preferences'));
        this.energyPerformancePreference = new SysDevPropertyString(path.join(this.cpufreqPath, 'energy_performance_preference'));
        this.scalingAvailableGovernors = new SysDevPropertyStringList(path.join(this.cpufreqPath, 'scaling_available_governors'));
        this.scalingGovernor = new SysDevPropertyString(path.join(this.cpufreqPath, 'scaling_governor'));
    }

}
