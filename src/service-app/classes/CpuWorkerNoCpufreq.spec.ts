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

import 'jasmine';
import * as fs from 'node:fs';
const mock: typeof import('mock-fs') = require('mock-fs');

import type { ITccProfile } from '../../common/models/TccProfile';
import { CpuWorker } from './CpuWorker';
import type { TuxedoControlCenterDaemon } from './TuxedoControlCenterDaemon';

describe('CpuWorker without cpufreq', (): void => {
    // Logical cores are present but no cpufreq driver is bound, so there is no cpufreq directory
    beforeEach((): void => {
        mock({
            '/sys/devices/system/cpu': {
                possible: '0-3',
                present: '0-3',
                online: '0-3',
                cpu0: {},
                cpu1: { online: '1' },
                cpu2: { online: '1' },
                cpu3: { online: '1' },
            },
        });
    });

    afterEach((): void => {
        mock.restore();
    });

    function createWorker(): CpuWorker {
        const tccd = {
            identifyDevice: (): undefined => undefined,
            settings: { cpuSettingsEnabled: true },
            logLine: (): void => {},
        } as unknown as TuxedoControlCenterDaemon;
        return new CpuWorker(tccd);
    }

    it('should apply the online core count of the profile', async (): Promise<void> => {
        const worker = createWorker();
        worker.updateProfile({ cpu: { onlineCores: 2 } } as ITccProfile);
        await worker.start();
        expect(fs.readFileSync('/sys/devices/system/cpu/cpu1/online', 'utf8')).toBe('1');
        expect(fs.readFileSync('/sys/devices/system/cpu/cpu2/online', 'utf8')).toBe('0');
        expect(fs.readFileSync('/sys/devices/system/cpu/cpu3/online', 'utf8')).toBe('0');
    });

    it('should not report an error when choosing a governor', (): void => {
        const worker = createWorker();
        spyOn(console, 'error');
        expect(worker.findDefaultGovernor()).toBeUndefined();
        expect(worker.findPerformanceGovernor()).toBeUndefined();
        expect(console.error).not.toHaveBeenCalled();
    });
});
