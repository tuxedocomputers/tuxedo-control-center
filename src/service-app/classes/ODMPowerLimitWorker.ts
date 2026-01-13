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

import type { ITccODMPowerLimits } from 'src/common/models/TccProfile';
import { TuxedoIOAPI as ioAPI, type TDPInfo } from '../../native-lib/TuxedoIOAPI';
import { DaemonWorker } from './DaemonWorker';
import type { TuxedoControlCenterDaemon } from './TuxedoControlCenterDaemon';

export class ODMPowerLimitWorker extends DaemonWorker {
    constructor(tccd: TuxedoControlCenterDaemon) {
        super(5000, 'ODMPowerlimitWorker', tccd);
    }

    public async onStart(): Promise<void> {
        let odmPowerLimitSettings: ITccODMPowerLimits = this.activeProfile.odmPowerLimits;
        if (odmPowerLimitSettings === undefined) {
            odmPowerLimitSettings = { tdpValues: [] };
        }

        const tdpInfo: TDPInfo[] = [];
        if (ioAPI.getTDPInfo(tdpInfo) && tdpInfo?.length > 0) {
            let newTDPValues: number[] = [];
            // If set in profile use these
            if (odmPowerLimitSettings.tdpValues && odmPowerLimitSettings.tdpValues?.length > 0) {
                newTDPValues = odmPowerLimitSettings.tdpValues;
            }

            if (newTDPValues?.length === 0) {
                // Default to max values
                newTDPValues = tdpInfo.map((tdpEntry: TDPInfo): number => tdpEntry.max);
            }

            this.tccd.logLine(
                `ODMPowerLimitWorker: Setting ODM TDPs ${JSON.stringify(newTDPValues.map((tdpValue: number): string => `${tdpValue} W`))}`,
            );
            const writeSuccess: boolean = ioAPI.setTDPValues(newTDPValues);
            if (writeSuccess) {
                for (let i: number = 0; i < tdpInfo?.length && i < newTDPValues?.length; ++i) {
                    tdpInfo[i].current = newTDPValues[i];
                }
            } else {
                this.tccd.logLine('ODMPowerLimitWorker: Failed to write TDP values');
            }
        }
        this.tccd.dbusData.odmPowerLimitsJSON = JSON.stringify(tdpInfo);
    }

    public async onWork(): Promise<void> {}

    public async onExit(): Promise<void> {}
}
