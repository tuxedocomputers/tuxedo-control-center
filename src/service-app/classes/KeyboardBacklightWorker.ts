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

import * as fs from 'fs';

import { DaemonWorker } from './DaemonWorker';
import { TuxedoControlCenterDaemon } from './TuxedoControlCenterDaemon';

export class KeyboardBacklightWorker extends DaemonWorker {
    constructor(tccd: TuxedoControlCenterDaemon) {
        super(100000, tccd);
    }

    public onStart(): void {
        let path: string = "/sys/devices/platform/tuxedo_keyboard/brightness"
        fs.appendFileSync(path, this.tccd.settings.keyboardBacklightBrightness.toString());
    }

    public onWork(): void {
        //noop
    }

    public onExit(): void {
        //noop
    }
}
