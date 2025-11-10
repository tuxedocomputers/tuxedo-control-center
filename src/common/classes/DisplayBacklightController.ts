/*!
 * Copyright (c) 2019-2025 TUXEDO Computers GmbH <tux@tuxedocomputers.com>
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

import * as path from 'node:path';
import { SysFsPropertyInteger } from './SysFsProperties';
import { SysFsController } from './SysFsController';

// Exception for amd backlight driver (amdgpu_bl)
// amdgpu brightness workaround, scale actual_brightness [0, 0xffff] to [0, 0xff]
// if it appears to return a high value
class SysFsPropertyAmdgpuBrightness extends SysFsPropertyInteger {
    public readValue(): number {
        return this.checkAndScaleValue(super.readValue());
    }

    public readValueNT(): number {
        return this.checkAndScaleValue(super.readValueNT());
    }

    private checkAndScaleValue(value: number): number {
        if (value === undefined) {
            return undefined;
        } else if (value > 0xff) {
            return Math.round(0xff * (value / 0xffff));
        } else {
            return value;
        }
    }
}

export class DisplayBacklightController extends SysFsController {
    constructor(
        public readonly basePath: string,
        public readonly driver: string,
    ) {
        super();

        // Workaround
        if (driver.includes('amdgpu_bl')) {
            this.brightness = new SysFsPropertyAmdgpuBrightness(
                path.join(basePath, driver, 'actual_brightness'),
                path.join(basePath, driver, 'brightness'),
            );
        }

        this.brightness = new SysFsPropertyInteger(
            path.join(basePath, driver, 'actual_brightness'),
            path.join(basePath, driver, 'brightness'),
        );
        this.maxBrightness = new SysFsPropertyInteger(path.join(basePath, driver, 'max_brightness'));
    }

    public readonly brightness: SysFsPropertyInteger;
    public readonly maxBrightness: SysFsPropertyInteger;
}
