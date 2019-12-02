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
            // Note: No need to manually run other workers on fresh start
        }
    }

    public onWork(): void {
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
            // Also run worker start procedure / application of profile
            this.tccd.startWorkers();
        }
    }

    public onExit(): void {
        // Do nothing
    }

}
