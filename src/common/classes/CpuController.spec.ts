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
import 'jasmine';
const mock = require('mock-fs');

import { CpuController } from './CpuController';

describe('CpuController', () => {

    // Mock file structure in memory
    beforeEach(() => {
        mock({
            '/sys/devices/system/cpu': {
                'possible': '0-1',
                'present': '0-1',
                'cpu0': {
                    'online': '1',
                    cpufreq: { 'scaling_cur_freq': '800000' }
                },
                'cpu1': {
                    'online': '1',
                    cpufreq: { 'scaling_cur_freq': '800000' }
                }
            }
        });
    });

    afterEach(() => {
        mock.restore();
    });

    it('should add paths to properties correctly', () => {
        const cpu = new CpuController('/sys/devices/system/cpu');
        expect(cpu.basePath).toBe('/sys/devices/system/cpu');
        expect(cpu.online.readPath).toBe('/sys/devices/system/cpu/online');
        expect(cpu.cores.length).toBe(2);
        expect(cpu.cores[0].cpuPath).toBe('/sys/devices/system/cpu/cpu0');
        expect(cpu.cores[0].online.readPath).toBe('/sys/devices/system/cpu/cpu0/online');
        expect(cpu.cores[0].online.readValue()).toBe(true);
        expect(cpu.cores[1].online.readValue()).toBe(true);
        expect(cpu.cores[1].scalingGovernor.readPath).toBe('/sys/devices/system/cpu/cpu1/cpufreq/scaling_governor');
    });
});
