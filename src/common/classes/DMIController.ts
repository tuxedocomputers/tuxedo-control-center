/*!
 * Copyright (c) 2022 TUXEDO Computers GmbH <tux@tuxedocomputers.com>
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
import { SysFsPropertyString } from './SysFsProperties';
import { SysFsController } from './SysFsController';

export class DMIController extends SysFsController {

    constructor(public readonly basePath: string) {
        super();
    }

    readonly boardName = new SysFsPropertyString(path.join(this.basePath, 'board_name'));
    readonly productSKU = new SysFsPropertyString(path.join(this.basePath, 'product_sku'));
    readonly boardVendor = new SysFsPropertyString(path.join(this.basePath, 'board_vendor'));
    readonly chassisVendor = new SysFsPropertyString(path.join(this.basePath, 'chassis_vendor'));
    readonly sysVendor = new SysFsPropertyString(path.join(this.basePath, 'sys_vendor'));
}