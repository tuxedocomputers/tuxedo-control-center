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

import * as fs from 'node:fs';
import { fileOK } from '../../common/classes/Utils';
import { DaemonWorker } from './DaemonWorker';
import type { TuxedoControlCenterDaemon } from './TuxedoControlCenterDaemon';

export class YCbCr420WorkaroundWorker extends DaemonWorker {
    constructor(tccd: TuxedoControlCenterDaemon) {
        // todo: only run worker once, no timeout should be required
        super(100000, 'YCbCr420WorkaroundWorker', tccd);

        if (this.tccd.settings.ycbcr420Workaround?.length > 0) {
            const card: number = 0;
            const port: string = Object.keys(this.tccd.settings.ycbcr420Workaround[card])[0];
            const path: string = `/sys/kernel/debug/dri/${card}/${port}/force_yuv420_output`;
            this.tccd.dbusData.forceYUV420OutputSwitchAvailable = fileOK(path);
        } else {
            this.tccd.dbusData.forceYUV420OutputSwitchAvailable = false;
        }
    }

    public async onStart(): Promise<void> {
        let settings_changed: boolean = false;

        for (let card: number = 0; card < this.tccd.settings.ycbcr420Workaround?.length; card++) {
            for (const port in this.tccd.settings.ycbcr420Workaround[card]) {
                const path: string = `/sys/kernel/debug/dri/${card}/${port}/force_yuv420_output`;
                if (fileOK(path)) {
                    const oldValue: boolean = fs.readFileSync(path).toString(undefined, undefined, 1) === '1';
                    if (oldValue != this.tccd.settings.ycbcr420Workaround[card][port]) {
                        settings_changed = true;
                        fs.appendFileSync(path, this.tccd.settings.ycbcr420Workaround[card][port] ? '1' : '0');
                    }
                }
            }
        }

        if (settings_changed) {
            this.tccd.dbusData.modeReapplyPending = true;
        }
    }

    public async onWork(): Promise<void> {
        //noop
    }

    public async onExit(): Promise<void> {
        //noop
    }
}
