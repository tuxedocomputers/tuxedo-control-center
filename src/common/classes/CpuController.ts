import * as path from 'path';
import { LogicalCpuController } from './LogicalCpuController';
import { SysDevPropertyInteger, SysDevPropertyNumList } from './SysDevProperties';

export class CpuController {

    constructor(public readonly basePath: string) {
        // Add "possible" and "present" logical cores
        this.cores = [];
        try {
            const possibleCores = this.possible.readValue();
            const presentCores = this.present.readValue();
            const coreIndexToAdd: number[] = [];
            possibleCores.forEach((possibleCoreIndex) => {
                if (presentCores.includes(possibleCoreIndex)) {
                    coreIndexToAdd.push(possibleCoreIndex);
                }
            });
            coreIndexToAdd.forEach((coreIndex) => {
                const newCore = new LogicalCpuController(this.basePath, coreIndex);
                if (newCore.online.isAvailable()) {
                    this.cores.push(newCore);
                }
            });
        } catch (err) {
            console.log(err);
        }
    }

    public readonly cores: LogicalCpuController[];

    public readonly kernelMax = new SysDevPropertyInteger(path.join(this.basePath, 'kernel_max'));
    public readonly offline = new SysDevPropertyNumList(path.join(this.basePath, 'offline'));
    public readonly online = new SysDevPropertyNumList(path.join(this.basePath, 'online'));
    public readonly possible = new SysDevPropertyNumList(path.join(this.basePath, 'possible'));
    public readonly present = new SysDevPropertyNumList(path.join(this.basePath, 'present'));

}
