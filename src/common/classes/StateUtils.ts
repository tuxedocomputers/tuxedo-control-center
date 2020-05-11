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
import { ProfileStates } from '../models/TccSettings';
import { PowerSupplyController } from './PowerSupplyController';

export function determineState(): ProfileStates {
    // Default state
    let state: ProfileStates = ProfileStates.AC;

    const pathPowerSupplies = '/sys/class/power_supply';
    const powerSupplyNames = PowerSupplyController.getDeviceList(pathPowerSupplies);
    const powerSupplies: PowerSupplyController[] = [];

    // Attempt to find a 'Mains' type power supply
    let powerAc: PowerSupplyController;
    try {
        for (const powerSupplyName of powerSupplyNames) {
            const newPowerSupply = new PowerSupplyController(path.join(pathPowerSupplies, powerSupplyName));
            powerSupplies.push(newPowerSupply);
        }
        powerAc = powerSupplies.find(powerSupply => powerSupply.type.readValue() === 'Mains');
    } catch (err) { }


    // Attempt to find state depending on 'Mains' online status
    if (powerAc !== undefined) {
        try {
            const acOnline = powerAc.online.readValue();
            if (acOnline) {
                state = ProfileStates.AC;
            } else {
                state = ProfileStates.BAT;
            }
        } catch (err) { }
    }

    return state;
}
