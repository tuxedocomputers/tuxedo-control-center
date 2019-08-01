import * as path from 'path';
import { SysDevPropertyInteger } from './SysDevPropertyInteger';
import { SysDevController } from './SysDevController';

export class DisplayBacklightController extends SysDevController {

    constructor(public readonly basePath: string) {
        super();
    }

    readonly brightness = new SysDevPropertyInteger(
        path.join(this.basePath, 'actual_brightness'),
        path.join(this.basePath, 'brightness'));

    readonly maxBrightness = new SysDevPropertyInteger(path.join(this.basePath, 'max_brightness'));
}
