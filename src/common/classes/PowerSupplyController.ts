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
import { SysFsController } from './SysFsController';
import { SysFsPropertyBoolean, SysFsPropertyInteger, SysFsPropertyNumList, SysFsPropertyString } from './SysFsProperties';

enum PowerSupplyTypes {
    Mains = 'Mains',
    Battery = 'Battery',
}

export class PowerSupplyController extends SysFsController {

    constructor(public readonly basePath: string) {
        super();
    }

    public readonly online = new SysFsPropertyBoolean(path.join(this.basePath, 'online'));
    public readonly type = new SysFsPropertyString(path.join(this.basePath, 'type'));

    // Charge control official
    public readonly chargeControlStartThreshold = new SysFsPropertyInteger(path.join(this.basePath, 'charge_control_start_threshold'));
    public readonly chargeControlEndThreshold = new SysFsPropertyInteger(path.join(this.basePath, 'charge_control_end_threshold'));
    public readonly chargeType = new SysFsPropertyString(path.join(this.basePath, 'charge_type'));

    // Charge control unofficial
    public readonly chargeControlStartAvailableThresholds = new SysFsPropertyNumList(path.join(this.basePath, 'charge_control_start_available_thresholds'));
    public readonly chargeControlEndAvailableThresholds = new SysFsPropertyNumList(path.join(this.basePath, 'charge_control_end_available_thresholds'));
}
