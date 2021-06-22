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
import { SysFsPropertyString, SysFsPropertyInteger, SysFsPropertyBoolean } from './SysFsProperties';

export class IntelRAPLController {
    constructor(private readonly basePath: string) {}

    private readonly name = new SysFsPropertyString(path.join(this.basePath, 'name'));
    private readonly constraint_0_name = new SysFsPropertyString(path.join(this.basePath, 'constraint_0_name'));
    private readonly constraint_0_max_power_uw = new SysFsPropertyInteger(path.join(this.basePath, 'constraint_0_max_power_uw'));
    private readonly constraint_0_power_limit_uw = new SysFsPropertyInteger(path.join(this.basePath, 'constraint_0_power_limit_uw'));
    private readonly enabled = new SysFsPropertyBoolean(path.join(this.basePath, 'enabled'));

    /**
     * Check if CPU supports necessary Intel RAPL variables
     *
     * @returns Boolean indicating wether or not this Intel RAPL controller can be used
     */
    public getIntelRAPLAvailable(): boolean {
        return this.name.isAvailable() &&
               this.constraint_0_name.isAvailable() &&
               this.constraint_0_max_power_uw.isAvailable() &&
               this.constraint_0_power_limit_uw.isAvailable() &&
               this.enabled.isAvailable() &&
               this.name.readValueNT() === "package-0" &&
               this.constraint_0_name.readValueNT() === "long_term"
    }

    /**
     * Get the maximum value that can be set for the power limit
     *
     * @returns Integer that is the maximum input value for long term power limit in micro watts or undefined on error
     */
    public getMaxPower(): number {
        return this.constraint_0_max_power_uw.readValueNT();
    }

    /**
     * Sets the long term power limit for the CPU
     *
     * @param setPowerLimit Long term power limit to set in micro watts. Defaults to maximum value possible.
     * Automatically clamped to range [maxPower/2, maxPower].
     */
    public setPowerLimit(setPowerLimit?: number): void {
        let maxPower = this.getMaxPower();

        if (setPowerLimit === undefined) {
            // TODO error handling
            this.constraint_0_power_limit_uw.writeValue(maxPower);
        }
        else {
            // TODO error handling
            this.constraint_0_power_limit_uw.writeValue(Math.max(maxPower/2, Math.min(setPowerLimit, maxPower)))
        }
        // TODO error handling
        this.enabled.writeValue(true);
    }
}
