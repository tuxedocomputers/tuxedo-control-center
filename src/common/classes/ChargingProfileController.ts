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
import { SysFsPropertyString, SysFsPropertyStringList } from './SysFsProperties';
import { SysFsController } from './SysFsController';

export class ChargingProfileController extends SysFsController {
    constructor(public readonly basePath: string) {
        super();

        this.chargingProfilesAvailable = new SysFsPropertyStringList(
            path.join(basePath, "charging_profiles_available"),
        );
        this.chargingProfile = new SysFsPropertyString(
            path.join(basePath, "charging_profile"),
        );
    }

    public readonly chargingProfilesAvailable: SysFsPropertyStringList;
    public readonly chargingProfile: SysFsPropertyString;
}