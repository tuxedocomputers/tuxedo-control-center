/*!
 * Copyright (c) 2021 TUXEDO Computers GmbH <tux@tuxedocomputers.com>
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
import { DaemonWorker } from './DaemonWorker';
import { TuxedoControlCenterDaemon } from './TuxedoControlCenterDaemon';

import { TuxedoIOAPI as ioAPI, ObjWrapper} from '../../native-lib/TuxedoIOAPI';

export class ODMProfileWorker extends DaemonWorker {

    constructor(tccd: TuxedoControlCenterDaemon) {
        super(1000, tccd);
    }

    public onStart(): void {
        const availableProfiles: ObjWrapper<string[]> = { value: [] };
        if (ioAPI.getAvailableODMPerformanceProfiles(availableProfiles)) {
            const odmProfileSettings = this.tccd.getCurrentProfile().odmProfile;
            let chosenODMProfileName;
            if (odmProfileSettings !== undefined) {
                chosenODMProfileName = odmProfileSettings.name;
            }

            // If saved profile name does not match available ones
            // attempt to get the default profile name
            if (!availableProfiles.value.includes(chosenODMProfileName)) {
                const defaultProfileName: ObjWrapper<string> = { value: '' };
                ioAPI.getDefaultODMPerformanceProfile(defaultProfileName);
                chosenODMProfileName = defaultProfileName.value;
            }
            
            // Make sure a valid one could be found before proceeding, otherwise abort
            if (availableProfiles.value.includes(chosenODMProfileName)) {
                this.tccd.logLine('Set ODM profile \'' + chosenODMProfileName + '\' ');
                if (!ioAPI.setODMPerformanceProfile(chosenODMProfileName)) {
                    this.tccd.logLine('ODMProfileWorker: Failed to apply profile');
                }
            } else {
                this.tccd.logLine('ODMProfileWorker: Unexpected error, default profile name \'' + chosenODMProfileName + '\' not valid');
            }
        }
    }

    public onWork(): void {

    }

    public onExit(): void {

    }
}
