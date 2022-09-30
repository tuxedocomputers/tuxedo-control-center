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
import { ITccSettings } from '../../common/models/TccSettings';
import { ITccProfile } from '../../common/models/TccProfile';
import { TuxedoControlCenterDaemon } from './TuxedoControlCenterDaemon';

export abstract class DaemonWorker {

    constructor(
        public readonly timeout: number,
        // Also inject the state (i.e configs etc..)
        protected tccd: TuxedoControlCenterDaemon) {}

    public timer: NodeJS.Timer;

    protected previousProfile: ITccProfile;
    protected activeProfile: ITccProfile;

    protected abstract onStart(): void;
    protected abstract onWork(): void;
    protected abstract onExit(): void;

    public start(): void { this.triggerWork(this.onStart); }
    public work(): void { this.triggerWork(this.onWork); }
    public exit(): void { this.triggerWork(this.onExit); }

    public updateProfile(activeProfile: ITccProfile): void {
        this.activeProfile = activeProfile;
    }

    private triggerWork(eventFunction: () => void): void {
        eventFunction.call(this);
        this.previousProfile = this.activeProfile;
    }

}
