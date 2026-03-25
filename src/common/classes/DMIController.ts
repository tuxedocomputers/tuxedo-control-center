/*!
 * Copyright (c) 2019-2026 TUXEDO Computers GmbH <tux@tuxedocomputers.com>
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
import { SysFsController } from './SysFsController';
import { SysFsPropertyString } from './SysFsProperties';

export class DMIController extends SysFsController {
    constructor(public readonly basePath: string) {
        super();

        this.boardName = new SysFsPropertyString(path.join(basePath, 'board_name'));
        this.productSKU = new SysFsPropertyString(path.join(basePath, 'product_sku'));
        this.boardVendor = new SysFsPropertyString(path.join(basePath, 'board_vendor'));
        this.chassisVendor = new SysFsPropertyString(path.join(basePath, 'chassis_vendor'));
        this.sysVendor = new SysFsPropertyString(path.join(basePath, 'sys_vendor'));
    }

    public readonly boardName: SysFsPropertyString;
    public readonly productSKU: SysFsPropertyString;
    public readonly boardVendor: SysFsPropertyString;
    public readonly chassisVendor: SysFsPropertyString;
    public readonly sysVendor: SysFsPropertyString;
}
