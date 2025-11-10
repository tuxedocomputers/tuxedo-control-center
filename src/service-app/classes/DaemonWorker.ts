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

import type { ITccProfile } from '../../common/models/TccProfile';
import type { TuxedoControlCenterDaemon } from './TuxedoControlCenterDaemon';

export abstract class DaemonWorker {
    constructor(
        public readonly timeout: number,
        public readonly name: string,
        // Also inject the state (i.e configs etc..)
        protected tccd: TuxedoControlCenterDaemon,
    ) {}

    public timer: NodeJS.Timeout;

    protected previousProfile: ITccProfile;
    protected activeProfile: ITccProfile;

    protected abstract onStart(): Promise<void>;
    protected abstract onWork(): Promise<void>;
    protected abstract onExit(): Promise<void>;

    public async start(): Promise<void> {
        await this.triggerWork(this.onStart);
    }
    public async work(): Promise<void> {
        await this.triggerWork(this.onWork);
    }
    public async exit(): Promise<void> {
        await this.triggerWork(this.onExit);
    }

    public updateProfile(activeProfile: ITccProfile): void {
        this.activeProfile = activeProfile;
    }

    private async triggerWork(eventFunction: () => Promise<void>): Promise<void> {
        await eventFunction.call(this);
        this.previousProfile = this.activeProfile;
    }
}
