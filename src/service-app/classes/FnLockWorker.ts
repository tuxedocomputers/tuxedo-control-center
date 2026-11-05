/*!
 * Copyright (c) 2019-2026 TUXEDO Computers GmbH <tux@tuxedocomputers.com>
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

import { FnLockController } from '../../common/classes/FnLockController';
import { DaemonWorker } from './DaemonWorker';
import type { TuxedoControlCenterDaemon } from './TuxedoControlCenterDaemon';

/**
 * Persists the Fn-Lock state across reboots and sleep cycles.
 *
 * Some firmwares reset Fn-Lock on power cycle. The worker restores the last
 * known state on start (tccd is restarted after resume by tccd-sleep.service)
 * and saves any change, whether made from TCC or with the Fn+Esc key.
 */
export class FnLockWorker extends DaemonWorker {
    private fnLock: FnLockController = new FnLockController();
    private startValue: boolean;

    constructor(tccd: TuxedoControlCenterDaemon) {
        super(2000, 'FnLockWorker', tccd);
    }

    public async onStart(): Promise<void> {
        if (!this.fnLock.getFnLockSupported()) {
            return;
        }

        const savedValue: boolean = this.tccd.settings.fnLock;
        if (savedValue !== undefined && this.fnLock.getFnLockStatus() !== savedValue) {
            try {
                this.fnLock.setFnLockStatus(savedValue);
                this.tccd.logLine(`FnLockWorker: Restored Fn-Lock ${savedValue ? 'on' : 'off'}`);
            } catch (err: unknown) {
                this.tccd.logLine(`FnLockWorker: Failed to restore Fn-Lock => ${err}`);
            }
        }

        this.startValue = this.fnLock.getFnLockStatus();
    }

    public async onWork(): Promise<void> {
        const currentValue: boolean = this.fnLock.getFnLockStatus();
        if (currentValue === undefined) {
            return;
        }

        // Without a saved value, only start persisting once the state was changed
        const referenceValue: boolean = this.tccd.settings.fnLock ?? this.startValue;
        if (currentValue !== referenceValue) {
            this.tccd.settings.fnLock = currentValue;
            this.tccd.saveSettings();
        }
    }

    public async onExit(): Promise<void> {}
}
