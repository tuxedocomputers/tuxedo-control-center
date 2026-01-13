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

const path: typeof import('path') = require('path');

import { SysFsController } from './SysFsController';
import {
    SysFsPropertyBoolean,
    SysFsPropertyInteger,
    SysFsPropertyNumListExplicit,
    SysFsPropertyString,
} from './SysFsProperties';

/**
 * Definitions as of 2023-08-11 from
 *   https://www.kernel.org/doc/Documentation/ABI/testing/sysfs-class-power
 *   Section: /sys/class/power_supply/<supply_name>/charge_type
 */
export enum ChargeType {
    Unknown = 'Unknown',
    NotAvailable = 'N/A',
    Trickle = 'Trickle',
    Fast = 'Fast',
    Standard = 'Standard',
    Adaptive = 'Adaptive',
    Custom = 'Custom',
    LongLife = 'LongLife',
    Bypass = 'Bypass',
}

export class PowerSupplyController extends SysFsController {
    constructor(public readonly basePath: string) {
        super();
        this.online = new SysFsPropertyBoolean(path.join(basePath, 'online'));
        this.type = new SysFsPropertyString(path.join(basePath, 'type'));
        this.chargeControlStartThreshold = new SysFsPropertyInteger(
            path.join(basePath, 'charge_control_start_threshold'),
        );
        this.chargeControlEndThreshold = new SysFsPropertyInteger(path.join(basePath, 'charge_control_end_threshold'));
        this.chargeType = new SysFsPropertyString(path.join(basePath, 'charge_type'));
        this.chargeControlStartAvailableThresholds = new SysFsPropertyNumListExplicit(
            path.join(basePath, 'charge_control_start_available_thresholds'),
        );
        this.chargeControlEndAvailableThresholds = new SysFsPropertyNumListExplicit(
            path.join(basePath, 'charge_control_end_available_thresholds'),
        );
    }

    public readonly online: SysFsPropertyBoolean;
    public readonly type: SysFsPropertyString;

    // Charge control official
    public readonly chargeControlStartThreshold: SysFsPropertyInteger;
    public readonly chargeControlEndThreshold: SysFsPropertyInteger;
    public readonly chargeType: SysFsPropertyString;

    // Charge control unofficial
    public readonly chargeControlStartAvailableThresholds: SysFsPropertyNumListExplicit;
    public readonly chargeControlEndAvailableThresholds: SysFsPropertyNumListExplicit;

    public static async getPowerSupplyBatteries(): Promise<PowerSupplyController[]> {
        const psDevices: string[] = SysFsController.getDeviceList('/sys/class/power_supply');
        const ctrlBatteries: PowerSupplyController[] = [];
        for (const devString of psDevices) {
            const ps = new PowerSupplyController(`/sys/class/power_supply/${devString}`);
            try {
                if ((await ps.type.readValueA()).trim() === 'Battery') {
                    ctrlBatteries.push(ps);
                }
            } catch (err: unknown) {
                console.error(`PowerSupplyController: getPowerSupplyBatteries failed => ${err}`);
            }
        }
        return ctrlBatteries;
    }

    public static async getFirstBattery(): Promise<PowerSupplyController> {
        const batteries: PowerSupplyController[] = await this.getPowerSupplyBatteries();
        if (batteries?.length > 0) {
            return batteries[0];
        } else {
            return undefined;
        }
    }
}
