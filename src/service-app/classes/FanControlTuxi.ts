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

import { getHwmonPathWithName } from '../../common/classes/FanUtils';
import { TUXEDODevice } from '../../common/models/DefaultProfiles';
import { FanControlHwmon } from './FanControlHwmon';
import type { TuxedoControlCenterDaemon } from './TuxedoControlCenterDaemon';

export class FanControlTuxi extends FanControlHwmon {
    private tuxedoDevice: TUXEDODevice;

    constructor(tccd: TuxedoControlCenterDaemon, tuxedoDevice: TUXEDODevice) {
        super(tccd);
        this.fanControlName = 'tuxi';
        this.tuxedoDevice = tuxedoDevice;
    }

    public async getHwmonPath(): Promise<string | undefined> {
        return await getHwmonPathWithName('tuxedo_tuxi_sensors');
    }

    public async checkAvailable(): Promise<[boolean, boolean]> {
        // Sirius can have 2 hwmon paths, but only using tuxi to avoid high cpu usage
        if (
            this.fanControlName !== 'tuxi' &&
            (this.tuxedoDevice === TUXEDODevice.SIRIUS1601 || this.tuxedoDevice === TUXEDODevice.SIRIUS1602)
        ) {
            return [false, false];
        }

        return super.checkAvailable();
    }
}
