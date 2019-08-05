import * as path from 'path';
import { LogicalCpuController } from './LogicalCpuController';
import { SysFsPropertyInteger, SysFsPropertyNumList } from './SysFsProperties';

export class CpuController {

    constructor(public readonly basePath: string) {
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
                if (newCore.online.isAvailable()) {
                    this.cores.push(newCore);
                }
            }
        } catch (err) {}
    }

    public readonly cores: LogicalCpuController[];

    public readonly kernelMax = new SysFsPropertyInteger(path.join(this.basePath, 'kernel_max'));
    public readonly offline = new SysFsPropertyNumList(path.join(this.basePath, 'offline'));
    public readonly online = new SysFsPropertyNumList(path.join(this.basePath, 'online'));
    public readonly possible = new SysFsPropertyNumList(path.join(this.basePath, 'possible'));
    public readonly present = new SysFsPropertyNumList(path.join(this.basePath, 'present'));

    /**
     * Sets the selected number of cpu cores to be online, the rest to be offline
     *
     * @param numberOfCores Number of logical cpu cores to use
     */
    public useCores(numberOfCores?: number): void {
        if (numberOfCores === undefined) { numberOfCores = this.cores.length; }
        if (numberOfCores === 0) { return; }
        for (let i = 1; i < this.cores.length; ++i) {
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
            const coreMinFrequency = core.cpuinfoMinFreq.readValue();
            const coreMaxFrequency = core.cpuinfoMaxFreq.readValue();
            let newMaxFrequency: number;
            if (maxFrequency === undefined) {
                newMaxFrequency = coreMaxFrequency;
            } else {
                newMaxFrequency = maxFrequency;
            }

            if (newMaxFrequency <= coreMaxFrequency && newMaxFrequency >= coreMinFrequency) {
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
            const coreMinFrequency = core.cpuinfoMinFreq.readValue();
            const coreMaxFrequency = core.cpuinfoMaxFreq.readValue();
            let newMinFrequency: number;
            if (minFrequency === undefined) {
                newMinFrequency = coreMinFrequency;
            } else {
                newMinFrequency = minFrequency;
            }

            if (newMinFrequency <= coreMaxFrequency && newMinFrequency >= coreMinFrequency) {
                core.scalingMinFreq.writeValue(newMinFrequency);
            } else {
                throw Error('setGovernorScalingMinFrequency: new frequency ' + newMinFrequency + ' is out of range');
            }
        }
    }
}
