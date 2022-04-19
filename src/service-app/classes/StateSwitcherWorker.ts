/*!
 * Copyright (c) 2019-2022 TUXEDO Computers GmbH <tux@tuxedocomputers.com>
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
        super(2000, tccd);
    }

    public onStart(): void {
        // Check state and switch profile if appropriate
        const newState = determineState();

        if (newState !== this.currentState) {
            this.currentState = newState;
            const newActiveProfileId = this.tccd.settings.stateMap[newState.toString()];
            if (newActiveProfileId !== undefined) {
                this.tccd.setCurrentProfileById(newActiveProfileId);
            } else {
                this.tccd.logLine('StateSwitcherWorker: Undefined state mapping for ' + newState.toString());
            }

            this.tccd.updateDBusActiveProfileData();

            // Note: No need to manually run other workers on fresh start
        }
    }

    public onWork(): void {
        // Check state and switch profile if appropriate
        const newState = determineState();
        const oldActiveProfileId = this.tccd.activeProfile.id;

        if (newState !== this.currentState) {
            this.currentState = newState;
            const newActiveProfileId = this.tccd.settings.stateMap[newState.toString()];
            if (newActiveProfileId === undefined) {
                this.tccd.logLine('StateSwitcherWorker: Undefined state mapping for ' + newState.toString());
            } else {
                this.tccd.setCurrentProfileById(newActiveProfileId);
            }
        } else {
            // If state didn't change, a manual temporary profile can still be set
            if (this.tccd.dbusData.tempProfileName !== undefined) {
                if (this.tccd.getAllProfiles().find((profile) => profile.name === this.tccd.dbusData.tempProfileName) !== undefined) {
                    // If set and exists set this as active profile
                    this.tccd.setCurrentProfileByName(this.tccd.dbusData.tempProfileName);
                    this.tccd.logLine('StateSwitcherWorker: Temp profile "' + this.tccd.dbusData.tempProfileName + '" selected');
                }
                this.tccd.dbusData.tempProfileName = undefined;
            }
            if (this.tccd.dbusData.tempProfileId !== undefined) {
                if (this.tccd.getAllProfiles().find((profile) => profile.id === this.tccd.dbusData.tempProfileId) !== undefined) {
                    // If set and exists set this as active profile
                    this.tccd.setCurrentProfileById(this.tccd.dbusData.tempProfileId);
                    this.tccd.logLine('StateSwitcherWorker: Temp profile "' + this.tccd.dbusData.tempProfileId + '" selected');
                }
                this.tccd.dbusData.tempProfileId = undefined;
            }
        }

        // Run worker start procedure / application of profile
        // if the profile changed
        if (oldActiveProfileId !== this.tccd.activeProfile.id) {
            this.tccd.updateDBusActiveProfileData();
            this.tccd.startWorkers();
        }
    }

    public onExit(): void {
        // Do nothing
    }

}
