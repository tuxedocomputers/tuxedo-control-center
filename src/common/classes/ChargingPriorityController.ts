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
import { SysFsPropertyString, SysFsPropertyStringList } from './SysFsProperties';

export class ChargingPriorityController extends SysFsController {
    constructor(public readonly basePath: string) {
        super();

        this.chargingPriosAvailable = new SysFsPropertyStringList(path.join(basePath, 'charging_prios_available'));
        this.chargingPrio = new SysFsPropertyString(path.join(basePath, 'charging_prio'));
    }

    public readonly chargingPriosAvailable: SysFsPropertyStringList;
    public readonly chargingPrio: SysFsPropertyString;
}
