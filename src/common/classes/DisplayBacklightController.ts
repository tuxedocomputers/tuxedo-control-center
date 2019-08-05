import * as path from 'path';
import { SysFsPropertyInteger } from './SysFsProperties';
import { SysFsController } from './SysFsController';

export class DisplayBacklightController extends SysFsController {

    constructor(public readonly basePath: string) {
        super();
    }

    readonly brightness = new SysFsPropertyInteger(
        path.join(this.basePath, 'actual_brightness'),
        path.join(this.basePath, 'brightness'));

    readonly maxBrightness = new SysFsPropertyInteger(path.join(this.basePath, 'max_brightness'));
}
