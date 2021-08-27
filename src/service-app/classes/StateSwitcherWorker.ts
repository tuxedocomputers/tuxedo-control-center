/*!
 * Copyright (c) 2019-2021 TUXEDO Computers GmbH <tux@tuxedocomputers.com>
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
import { ProfileStates } from '../../common/models/TccSettings';
import { determineState } from '../../common/classes/StateUtils';

export class StateSwitcherWorker extends DaemonWorker {

    private currentState: ProfileStates;

    constructor(tccd: TuxedoControlCenterDaemon) {
        super(500, tccd);
    }

    public onStart(): void {
        // Check state and switch profile if appropriate
        const newState = determineState();

        if (newState !== this.currentState) {
            this.currentState = newState;
            const newActiveProfileName = this.tccd.settings.stateMap[newState.toString()];
            if (newActiveProfileName === undefined) {
                this.tccd.logLine('StateSwitcherWorker: Undefined state mapping for ' + newState.toString());
                this.tccd.activeProfileName = 'Default';
            } else {
                this.tccd.activeProfileName = newActiveProfileName;
            }

            this.tccd.updateDBusActiveProfileData();

            // Note: No need to manually run other workers on fresh start
        }
    }

    public onWork(): void {
        // Check state and switch profile if appropriate
        const newState = determineState();
        const oldActiveProfileName = this.tccd.activeProfileName;

        if (newState !== this.currentState) {
            this.currentState = newState;
            const newActiveProfileName = this.tccd.settings.stateMap[newState.toString()];
            if (newActiveProfileName === undefined) {
                this.tccd.logLine('StateSwitcherWorker: Undefined state mapping for ' + newState.toString());
                this.tccd.activeProfileName = 'Default';
            } else {
                this.tccd.activeProfileName = newActiveProfileName;
            }
        } else {
            // If state didn't change, a manual temporary profile can still be set
            if (this.tccd.dbusData.tempProfileName !== undefined) {
                if (this.tccd.getAllProfiles().find((profile) => profile.name === this.tccd.dbusData.tempProfileName) !== undefined) {
                    // If set and exists set this as active profile
                    this.tccd.activeProfileName = this.tccd.dbusData.tempProfileName;
                    this.tccd.logLine('StateSwitcherWorker: Temp profile "' + this.tccd.dbusData.tempProfileName + '" selected');
                }
                this.tccd.dbusData.tempProfileName = undefined;
            }
        }

        this.tccd.updateDBusActiveProfileData();

        // Run worker start procedure / application of profile
        // if the profile changed
        if (oldActiveProfileName !== this.tccd.activeProfileName) {
            this.tccd.startWorkers();
        }
    }

    public onExit(): void {
        // Do nothing
    }

}
