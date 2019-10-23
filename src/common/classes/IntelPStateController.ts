import * as path from 'path';
import { SysFsPropertyBoolean, SysFsPropertyInteger, SysFsPropertyString } from './SysFsProperties';

export class IntelPstateController {
    constructor(public readonly basePath: string) {}

    public readonly noTurbo = new SysFsPropertyBoolean(path.join(this.basePath, 'no_turbo'));
    public readonly maxPerfPct = new SysFsPropertyInteger(path.join(this.basePath, 'max_perf_pct'));
    public readonly minPerfPct = new SysFsPropertyInteger(path.join(this.basePath, 'min_perf_pct'));
    public readonly numPstates = new SysFsPropertyInteger(path.join(this.basePath, 'num_pstates'));
    public readonly status = new SysFsPropertyString(path.join(this.basePath, 'status'));
    public readonly turboPct = new SysFsPropertyInteger(path.join(this.basePath, 'turbo_pct'));
}
