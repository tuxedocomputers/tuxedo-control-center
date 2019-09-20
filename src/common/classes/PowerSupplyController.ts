import * as path from 'path';
import { SysFsController } from './SysFsController';
import { SysFsPropertyBoolean } from './SysFsProperties';

export class PowerSupplyController implements SysFsController {

    constructor(public readonly basePath: string) { }

    public readonly online = new SysFsPropertyBoolean(path.join(this.basePath, 'online'));
}
