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

import { DaemonWorker } from './DaemonWorker';
import { TuxedoControlCenterDaemon } from './TuxedoControlCenterDaemon';
import { ProfileStates } from '../../common/models/TccSettings';
import { determineState } from '../../common/classes/StateUtils';

export class StateSwitcherWorker extends DaemonWorker {

    private currentState: ProfileStates;
    private currentStateProfileId: string;

    private refreshProfile: boolean = false;

    constructor(tccd: TuxedoControlCenterDaemon) {
        super(2000, "StateSwitcherWorker", tccd);
    }

    /** Reset state */
    public reset(): void {
        this.currentState = undefined;
    }

    /** Refresh profile application */
    public reapplyProfile(): void {
        this.refreshProfile = true;
    }

    public async onStart(): Promise<void> {
        // Check state and switch profile if appropriate
        const newState: ProfileStates = determineState();

        if (newState !== this.currentState) {
            this.currentState = newState;
            const newActiveProfileId: string = this.tccd.settings.stateMap[newState.toString()];
            this.currentStateProfileId = newActiveProfileId;
            if (newActiveProfileId !== undefined) {
                this.tccd.setCurrentProfileById(newActiveProfileId);
            } else {
                this.tccd.logLine('StateSwitcherWorker: Undefined state mapping for ' + newState.toString());
            }

            this.tccd.updateDBusActiveProfileData();

            // Note: No need to manually run other workers on fresh start
        }
    }

    public async onWork(): Promise<void> {
        // Check state and switch profile if appropriate
        const newState: ProfileStates = determineState();
        const oldActiveProfileId: string = this.tccd.activeProfile.id;
        const oldActiveProfileName: string = this.tccd.activeProfile.name;

        const newStateProfileId: string = this.tccd.settings.stateMap[newState.toString()];

        if (newState !== this.currentState || newStateProfileId !== this.currentStateProfileId) {
            /*
             * If state changed or assigned profile depending on state changed,
             * unset temp profile and set state selected profile
             */

            // Deactivate temp profile choices on real state change
            this.tccd.dbusData.tempProfileName = undefined;
            this.tccd.dbusData.tempProfileId = undefined;

            // Set active profile according to state map
            this.currentState = newState;
            this.currentStateProfileId = newStateProfileId;
            if (newStateProfileId === undefined) {
                this.tccd.logLine('StateSwitcherWorker: Undefined state mapping for ' + newState.toString());
            } else {
                this.tccd.setCurrentProfileById(newStateProfileId);
            }
        } else {
            // If state didn't change, a manual temporary profile can still be set
            if (this.tccd.dbusData.tempProfileName !== undefined && this.tccd.dbusData.tempProfileName !== "" && this.tccd.dbusData.tempProfileName !== oldActiveProfileName) {
                if (this.tccd.setCurrentProfileByName(this.tccd.dbusData.tempProfileName)) {
                    this.tccd.logLine(`StateSwitcherWorker: Temp profile '${this.tccd.getCurrentProfile().name}' (${this.tccd.getCurrentProfile().id}) selected`);
                }
            }
            if (this.tccd.dbusData.tempProfileId !== undefined && this.tccd.dbusData.tempProfileId !== "" && this.tccd.dbusData.tempProfileId !== oldActiveProfileId) {
                if (this.tccd.setCurrentProfileById(this.tccd.dbusData.tempProfileId)) {
                    this.tccd.logLine(`StateSwitcherWorker: Temp profile '${this.tccd.getCurrentProfile().name}' (${this.tccd.getCurrentProfile().id}) selected`);
                    this.tccd.dbusData.tempProfileName = undefined;
                }
            }
        }

        // Run worker start procedure / application of profile
        // if the profile changed
        if (oldActiveProfileId !== this.tccd.activeProfile.id || this.refreshProfile) {
            this.refreshProfile = false;
            this.tccd.updateDBusActiveProfileData();
            this.tccd.startWorkers();
        }
    }

    public async onExit(): Promise<void> {
        // Do nothing
    }

}
