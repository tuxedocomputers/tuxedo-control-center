import * as path from 'path';
import { SysDevPropertyInteger } from './SysDevPropertyInteger';

export class DisplayBacklightController {

    constructor(readonly basePath: string) {}

    readonly brightness = new SysDevPropertyInteger(
        path.join(this.basePath, 'actual_brightness'),
        path.join(this.basePath, 'brightness'));

    readonly maxBrightness = new SysDevPropertyInteger(path.join(this.basePath, 'max_brightness'));
}
