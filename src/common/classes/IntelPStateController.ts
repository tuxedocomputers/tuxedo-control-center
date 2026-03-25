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

import * as path from 'node:path';
import { SysFsPropertyBoolean, SysFsPropertyInteger, SysFsPropertyString } from './SysFsProperties';

export class IntelPstateController {
    constructor(public readonly basePath: string) {
        this.noTurbo = new SysFsPropertyBoolean(path.join(basePath, 'no_turbo'));
        this.maxPerfPct = new SysFsPropertyInteger(path.join(basePath, 'max_perf_pct'));
        this.minPerfPct = new SysFsPropertyInteger(path.join(basePath, 'min_perf_pct'));
        this.numPstates = new SysFsPropertyInteger(path.join(basePath, 'num_pstates'));
        this.status = new SysFsPropertyString(path.join(basePath, 'status'));
        this.turboPct = new SysFsPropertyInteger(path.join(basePath, 'turbo_pct'));
    }

    public readonly noTurbo: SysFsPropertyBoolean;
    public readonly maxPerfPct: SysFsPropertyInteger;
    public readonly minPerfPct: SysFsPropertyInteger;
    public readonly numPstates: SysFsPropertyInteger;
    public readonly status: SysFsPropertyString;
    public readonly turboPct: SysFsPropertyInteger;
}
