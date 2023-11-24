/*!
 * Copyright (c) 2019-2023 TUXEDO Computers GmbH <tux@tuxedocomputers.com>
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

        constraint1Name: SysFsPropertyString;
        constraint1MaxPower: SysFsPropertyInteger;
        constraint1PowerLimit: SysFsPropertyInteger;

        constraint2Name: SysFsPropertyString;
        constraint2MaxPower: SysFsPropertyInteger;
        constraint2PowerLimit: SysFsPropertyInteger;

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

            constraint1Name: new SysFsPropertyString(
                path.join(basePath, "constraint_1_name")
            ),
            constraint1MaxPower: new SysFsPropertyInteger(
                path.join(basePath, "constraint_1_max_power_uw")
            ),
            constraint1PowerLimit: new SysFsPropertyInteger(
                path.join(basePath, "constraint_1_power_limit_uw")
            ),

            constraint2Name: new SysFsPropertyString(
                path.join(basePath, "constraint_2_name")
            ),
            constraint2MaxPower: new SysFsPropertyInteger(
                path.join(basePath, "constraint_2_max_power_uw")
            ),
            constraint2PowerLimit: new SysFsPropertyInteger(
                path.join(basePath, "constraint_2_power_limit_uw")
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
    public getIntelRAPLPowerAvailable(): boolean {
        const props = this.properties;
        return (
            props.name.isAvailable() &&
            props.enabled.isAvailable() &&
            props.energyUJ.isAvailable() &&
            props.name.readValueNT() === "package-0"
        );
    }

    /**
     * Check if CPU supports power constraints
     *
     * @returns Boolean indicating if constraints are available
     */
    public getIntelRAPLConstraint0Available(): boolean {
        const props = this.properties;

        return (
            props.constraint0Name.isAvailable() &&
            props.constraint0MaxPower.isAvailable() &&
            props.constraint0PowerLimit.isAvailable() &&
            props.constraint0Name.readValueNT() === "long_term"
        );
    }

    public getIntelRAPLConstraint1Available(): boolean {
        const props = this.properties;

        return (
            props.constraint1Name.isAvailable() &&
            props.constraint1MaxPower.isAvailable() &&
            props.constraint1PowerLimit.isAvailable() &&
            props.constraint1Name.readValueNT() === "short_term"
        );
    }

    public getIntelRAPLConstraint2Available(): boolean {
        const props = this.properties;

        return (
            props.constraint2Name.isAvailable() &&
            props.constraint2MaxPower.isAvailable() &&
            props.constraint2PowerLimit.isAvailable() &&
            props.constraint2Name.readValueNT() === "peak_power"
        );
    }

    /**
     * Check if energyUJ is available
     *
     * @returns Boolean indicating if it is available
     */
    public getIntelRAPLEnergyAvailable(): boolean {
        const props = this.properties;
        return props.energyUJ.isAvailable();
    }

    /**
     * Get the maximum value that can be set for the power limit
     *
     * @returns Integer that is the maximum input value for long term power limit in micro watts or undefined on error
     */
    public getConstraint0MaxPower(): number {
        return this.properties.constraint0PowerLimit.readValueNT();
    }

    public getConstraint1MaxPower(): number {
        return this.properties.constraint1PowerLimit.readValueNT();
    }

    public getConstraint2MaxPower(): number {
        return this.properties.constraint2PowerLimit.readValueNT();
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
    public setPowerPL1Limit(setPowerLimit?: number): void {
        const props = this.properties;
        const maxPower = this.getConstraint0MaxPower();

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
