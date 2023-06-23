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
import * as path from "path";
import {
    SysFsPropertyString,
    SysFsPropertyInteger,
    SysFsPropertyBoolean,
} from "./SysFsProperties";

export class IntelRAPLController {
    private properties: {
        name: SysFsPropertyString;
        constraint0Name: SysFsPropertyString;
        constraint0MaxPower: SysFsPropertyInteger;
        constraint0PowerLimit: SysFsPropertyInteger;
        enabled: SysFsPropertyBoolean;
        energyUJ: SysFsPropertyInteger;
    };

    constructor(private readonly basePath: string) {
        this.properties = {
            name: new SysFsPropertyString(path.join(basePath, "name")),
            constraint0Name: new SysFsPropertyString(
                path.join(basePath, "constraint_0_name")
            ),
            constraint0MaxPower: new SysFsPropertyInteger(
                path.join(basePath, "constraint_0_max_power_uw")
            ),
            constraint0PowerLimit: new SysFsPropertyInteger(
                path.join(basePath, "constraint_0_power_limit_uw")
            ),
            enabled: new SysFsPropertyBoolean(path.join(basePath, "enabled")),
            energyUJ: new SysFsPropertyInteger(
                path.join(basePath, "energy_uj")
            ),
        };
    }

    /**
     * Check if CPU supports necessary Intel RAPL variables
     *
     * @returns Boolean indicating wether or not this Intel RAPL controller can be used
     */
    public getIntelRAPLAvailable(): boolean {
        const props = this.properties;
        return (
            props.name.isAvailable() &&
            props.constraint0Name.isAvailable() &&
            props.constraint0MaxPower.isAvailable() &&
            props.constraint0PowerLimit.isAvailable() &&
            props.enabled.isAvailable() &&
            props.energyUJ.isAvailable() &&
            props.name.readValueNT() === "package-0" &&
            props.constraint0Name.readValueNT() === "long_term"
        );
    }

    /**
     * Get the maximum value that can be set for the power limit
     *
     * @returns Integer that is the maximum input value for long term power limit in micro watts or undefined on error
     */
    public getMaxPower(): number {
        return this.properties.constraint0MaxPower.readValueNT();
    }

    /**
     * Get the current energy counter in micro joules
     *
     * @returns Integer that returns the current energy counter
     */
    public getEnergy(): number {
        return this.properties.energyUJ.readValueNT();
    }

    /**
     * Sets the long term power limit for the CPU
     *
     * @param setPowerLimit Long term power limit to set in micro watts. Defaults to maximum value possible.
     * Automatically clamped to range [maxPower/2, maxPower].
     */
    public setPowerLimit(setPowerLimit?: number): void {
        const props = this.properties;
        const maxPower = this.getMaxPower();

        try {
            let powerLimit =
                setPowerLimit === undefined
                    ? maxPower
                    : Math.max(maxPower / 2, Math.min(setPowerLimit, maxPower));

            props.constraint0PowerLimit.writeValue(powerLimit);
            props.enabled.writeValue(true);
        } catch (err) {
            console.log("IntelRAPLController: Failed to set power limit.");
        }
    }
}
