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

import { DaemonWorker } from './DaemonWorker';
import { TuxedoControlCenterDaemon } from './TuxedoControlCenterDaemon';
import { ConfigHandler } from "../../common/classes/ConfigHandler";

export class ProfileSwitchWorker extends DaemonWorker {
    constructor(tccd: TuxedoControlCenterDaemon, private config: ConfigHandler) {
        super(10000, tccd);
    }

    public onStart(): void {
        // throw new Error('Method not implemented.');
    }

    public onWork(): void {
        const settings = this.config.getSettingsNoThrow();
        const currentDate = new Date();
        const today = currentDate.toString().split(' ')[0].toLowerCase();
        let settingsTimeStart = new Date();
        let settingsTimeEnd = new Date();
        let profileChange: Boolean = false;

        const startTimeHour = Number(settings.profileSwitchSettings.startTime.split(":")[0]);
        const startTimeMinutes = Number(settings.profileSwitchSettings.startTime.split(":")[1]);

        const endTimeHour = Number(settings.profileSwitchSettings.endTime.split(":")[0]);
        const endTimeMinutes = Number(settings.profileSwitchSettings.endTime.split(":")[1]);

        if(!settings.profileSwitchSettings.activate) {
            return;
        }

        settingsTimeStart.setHours(startTimeHour);
        settingsTimeStart.setMinutes(startTimeMinutes);
        settingsTimeEnd.setHours(endTimeHour);
        settingsTimeEnd.setMinutes(endTimeMinutes);

        if(settings.profileSwitchSettings.days.includes(today)) {
            if(currentDate.getTime() >= settingsTimeStart.getTime() && currentDate.getTime() <= settingsTimeEnd.getTime()) {
                if(settings.stateMap["power_ac"] != settings.profileSwitchSettings.profileNameAC) {
                    settings.profileSwitchSettings.lastProfileNameAC = settings.stateMap["power_ac"];
                    settings.stateMap["power_ac"] = settings.profileSwitchSettings.profileNameAC;
                    profileChange = true;
                }

                if(settings.stateMap["power_bat"] != settings.profileSwitchSettings.profileNameBat) {
                    settings.profileSwitchSettings.lastProfileNameBat = settings.stateMap["power_bat"];
                    settings.stateMap["power_bat"] = settings.profileSwitchSettings.profileNameBat;
                    profileChange = true;
                }

                if(profileChange) {
                    this.config.writeSettings(settings);
                    console.log(`restart daemon`);
                    this.tccd.restartDaemon();
                }
            }
        }
    }

    public onExit(): void {
        // throw new Error('Method not implemented.');
    }
}