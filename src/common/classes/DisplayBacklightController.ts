import * as path from 'path';
import { SysFsPropertyInteger } from './SysFsProperties';
import { SysFsController } from './SysFsController';

export class DisplayBacklightController extends SysFsController {

    constructor(public readonly basePath: string, public readonly driver: string) {
        super();
    }

    readonly brightness = new SysFsPropertyInteger(
        path.join(this.basePath, this.driver, 'actual_brightness'),
        path.join(this.basePath, this.driver, 'brightness'));

    readonly maxBrightness = new SysFsPropertyInteger(path.join(this.basePath, this.driver, 'max_brightness'));
}
