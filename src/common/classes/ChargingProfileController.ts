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
import { SysFsPropertyString, SysFsPropertyStringList } from './SysFsProperties';
import { SysFsController } from './SysFsController';

export class ChargingProfileController extends SysFsController {

    constructor(public readonly basePath: string) {
        super();
    }

    readonly chargingProfilesAvailable = new SysFsPropertyStringList(path.join(this.basePath, 'charging_profiles_available'));
    readonly chargingProfile = new SysFsPropertyString(path.join(this.basePath, 'charging_profile'));
}