/*!
 * Copyright (c) 2019-2020 TUXEDO Computers GmbH <tux@tuxedocomputers.com>
 *
 * This file is part of TUXEDO Control Center.
 *
 * TUXEDO Control Center is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * TUXEDO Control Center is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with TUXEDO Control Center.  If not, see <https://www.gnu.org/licenses/>.
 */
import * as path from 'path';
import { SysFsPropertyInteger } from './SysFsProperties';
import { SysFsController } from './SysFsController';

export class DisplayBacklightController extends SysFsController {

    constructor(public readonly basePath: string, public readonly driver: string) {
        super();

        // Workaround:
        // Exception to amd backlight driver (amdgpu_bl)
        // Do not use actual_brightness for reading until fixed
        if (driver.includes('amdgpu_bl')) {
            this.brightness = new SysFsPropertyInteger(path.join(this.basePath, this.driver, 'brightness'));
        }
    }

    readonly brightness = new SysFsPropertyInteger(
        path.join(this.basePath, this.driver, 'actual_brightness'),
        path.join(this.basePath, this.driver, 'brightness'));

    readonly maxBrightness = new SysFsPropertyInteger(path.join(this.basePath, this.driver, 'max_brightness'));
}
