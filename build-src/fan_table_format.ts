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

import { SIGINT } from 'node:constants';
import * as process from 'node:process';

const dataList: string[] = [];

process.stdin.on('data', (dataChunk: Buffer) => {
    dataList.push(dataChunk.toString());
});

process.on('SIGINT', () => {
    const data = dataList.join('');
    const lines: string[] = data.split('\n');
    let pairs = lines.map((line) => line.split(RegExp('[ \t]+')));
    pairs = pairs.filter((pair) => pair?.length === 2);
    const stringEntries = pairs.map((pair) => ({ temp: pair[0].trim(), speed: pair[1].trim() }));
    for (const entry of stringEntries) {
        if (entry.speed === '') {
            entry.speed = '0';
        }
        process.stdout.write('{ temp: ' + entry.temp + ', speed: ' + entry.speed + ' },\n');
    }
    process.exit(SIGINT);
});
