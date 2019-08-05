import * as path from 'path';
import { SysFsController } from './SysFsController';
import { SysFsPropertyBoolean, SysFsPropertyInteger, SysFsPropertyStringList, SysFsPropertyString } from './SysFsProperties';

export class LogicalCpuController extends SysFsController {

    public readonly cpuPath: string;
    private readonly cpufreqPath: string;

    // cpuX

    /**
     * Note: not available for cpu nr 0
     */
    readonly online: SysFsPropertyBoolean;

    // cpufreq

    readonly scalingCurFreq: SysFsPropertyInteger;
    readonly scalingMinFreq: SysFsPropertyInteger;
    readonly scalingMaxFreq: SysFsPropertyInteger;
    readonly energyPerformanceAvailablePreferences: SysFsPropertyStringList;
    readonly energyPerformancePreference: SysFsPropertyString;
    readonly scalingAvailableGovernors: SysFsPropertyStringList;
    readonly scalingGovernor: SysFsPropertyString;


    constructor(public readonly basePath: string, public readonly coreIndex: number) {
        super();
        this.cpuPath = path.join(this.basePath, 'cpu' + this.coreIndex);
        this.cpufreqPath = path.join(this.cpuPath, 'cpufreq');

        this.online = new SysFsPropertyBoolean(path.join(this.cpuPath, 'online'));
        this.scalingCurFreq = new SysFsPropertyInteger(path.join(this.cpufreqPath, 'scaling_cur_freq'));
        this.scalingMinFreq = new SysFsPropertyInteger(path.join(this.cpufreqPath, 'scaling_min_freq'));
        this.scalingMaxFreq = new SysFsPropertyInteger(path.join(this.cpufreqPath, 'scaling_max_freq'));
        this.energyPerformanceAvailablePreferences = new SysFsPropertyStringList(
            path.join(this.cpufreqPath, 'energy_performance_available_preferences'));
        this.energyPerformancePreference = new SysFsPropertyString(path.join(this.cpufreqPath, 'energy_performance_preference'));
        this.scalingAvailableGovernors = new SysFsPropertyStringList(path.join(this.cpufreqPath, 'scaling_available_governors'));
        this.scalingGovernor = new SysFsPropertyString(path.join(this.cpufreqPath, 'scaling_governor'));
    }

}
