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

import { TuxedoIOAPI, ObjWrapper } from '../../native-lib/TuxedoIOAPI';

export class WebcamWorker extends DaemonWorker {

    constructor(tccd: TuxedoControlCenterDaemon) {
        super(2000, tccd);
    }

    public onStart(): void {
        this.updateWebcamStatuses();

        const activeProfile = this.tccd.getCurrentProfile();
        const settingsDefined = activeProfile.webcam !== undefined
            && activeProfile.webcam.useStatus !== undefined
            && activeProfile.webcam.status !== undefined;

        if (settingsDefined && this.tccd.dbusData.webcamSwitchAvailable) {
            if (true || activeProfile.webcam.useStatus) { // Always force webcam to selected setting, option to not set is removed for now
                if (activeProfile.webcam.status) {
                    this.tccd.logLine('Set webcam status ON');
                    const success = TuxedoIOAPI.setWebcamStatus(true);
                    if (!success) {
                        this.tccd.logLine('WebcamWorker: Failed to activate webcam');
                    }
                } else {
                    this.tccd.logLine('Set webcam status OFF');
                    const success = TuxedoIOAPI.setWebcamStatus(false);
                    if (!success) {
                        this.tccd.logLine('WebcamWorker: Failed to deactivate webcam');
                    }
                }
            }
        }

        this.updateWebcamStatuses();
    }

    public onWork(): void {
        this.updateWebcamStatuses();
    }

    public onExit(): void {

    }


    private updateWebcamStatuses(): void {
        // Use getter method to check for implemented functionality
        const webcamStatus: ObjWrapper<boolean> = { value: undefined };
        if (!TuxedoIOAPI.getWebcamStatus(webcamStatus)) {
            this.tccd.dbusData.webcamSwitchAvailable = false;
        } else {
            this.tccd.dbusData.webcamSwitchAvailable = true;
        }

        this.tccd.dbusData.webcamSwitchStatus = webcamStatus.value;
    }
}
