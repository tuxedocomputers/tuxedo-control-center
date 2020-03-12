/*!
 * Copyright (c) 2019 TUXEDO Computers GmbH <tux@tuxedocomputers.com>
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

import { TuxedoWMIAPI } from '../../native-lib/TuxedoWMIAPI';

export class WebcamWorker extends DaemonWorker {

    constructor(tccd: TuxedoControlCenterDaemon) {
        super(3000, tccd);
    }

    public onStart(): void {
        const activeProfile = this.tccd.getCurrentProfile();
        const settingsDefined = activeProfile.webcam !== undefined
            && activeProfile.webcam.useStatus !== undefined
            && activeProfile.webcam.status !== undefined;

        if (settingsDefined) {
            if (activeProfile.webcam.useStatus) {
                if (activeProfile.webcam.status) {
                    this.tccd.logLine('Set webcam status ON');
                    const success = TuxedoWMIAPI.webcamOn();
                    if (!success) {
                        this.tccd.logLine('WebcamWorker: Failed to activate webcam');
                    }
                } else {
                    this.tccd.logLine('Set webcam status OFF');
                    const success = TuxedoWMIAPI.webcamOff();
                    if (!success) {
                        this.tccd.logLine('WebcamWorker: Failed to deactivate webcam');
                    }
                }
            }
        }
    }

    public onWork(): void {

    }

    public onExit(): void {

    }

}
