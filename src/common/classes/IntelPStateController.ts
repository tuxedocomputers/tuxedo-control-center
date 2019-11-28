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
import * as path from 'path';
import { SysFsPropertyBoolean, SysFsPropertyInteger, SysFsPropertyString } from './SysFsProperties';

export class IntelPstateController {
    constructor(public readonly basePath: string) {}

    public readonly noTurbo = new SysFsPropertyBoolean(path.join(this.basePath, 'no_turbo'));
    public readonly maxPerfPct = new SysFsPropertyInteger(path.join(this.basePath, 'max_perf_pct'));
    public readonly minPerfPct = new SysFsPropertyInteger(path.join(this.basePath, 'min_perf_pct'));
    public readonly numPstates = new SysFsPropertyInteger(path.join(this.basePath, 'num_pstates'));
    public readonly status = new SysFsPropertyString(path.join(this.basePath, 'status'));
    public readonly turboPct = new SysFsPropertyInteger(path.join(this.basePath, 'turbo_pct'));
}
