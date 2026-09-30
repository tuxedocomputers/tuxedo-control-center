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
const mock: typeof import('mock-fs') = require('mock-fs');

import { CpuController } from './CpuController';

describe('CpuController', (): void => {
    // Mock file structure in memory
    beforeEach((): void => {
        mock({
            '/sys/devices/system/cpu': {
                possible: '0-1',
                present: '0-1',
                cpu0: {
                    online: '1',
                    cpufreq: { scaling_cur_freq: '800000' },
                },
                cpu1: {
                    online: '1',
                    cpufreq: { scaling_cur_freq: '800000' },
                },
            },
        });
    });

    afterEach((): void => {
        mock.restore();
    });

    it('should add paths to properties correctly', (): void => {
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

describe('CpuController without cpufreq', (): void => {
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

    it('should not throw when setting default scaling frequencies', (): void => {
        const cpu = new CpuController('/sys/devices/system/cpu');
        expect(cpu.cores.length).toBe(4);
        expect((): void => cpu.setGovernorScalingMinFrequency()).not.toThrow();
        expect((): void => cpu.setGovernorScalingMaxFrequency()).not.toThrow();
        expect((): void => cpu.setGovernorScalingMaxFrequency(1200000)).not.toThrow();
    });

    it('should still limit the online cores after setting frequencies', (): void => {
        const cpu = new CpuController('/sys/devices/system/cpu');
        cpu.setGovernorScalingMinFrequency();
        cpu.setGovernorScalingMaxFrequency();
        cpu.useCores(2);
        expect(cpu.cores[1].online.readValue()).toBe(true);
        expect(cpu.cores[2].online.readValue()).toBe(false);
        expect(cpu.cores[3].online.readValue()).toBe(false);
    });
});

describe('CpuController with acpi-cpufreq', (): void => {
    const cpufreq = {
        cpuinfo_min_freq: '800000',
        cpuinfo_max_freq: '3000000',
        scaling_min_freq: '800000',
        scaling_max_freq: '2000000',
        scaling_available_frequencies: '3000000 2000000 800000',
        scaling_driver: 'acpi-cpufreq',
    };

    beforeEach((): void => {
        mock({
            '/sys/devices/system/cpu': {
                possible: '0-1',
                present: '0-1',
                online: '0-1',
                cpufreq: { boost: '0' },
                cpu0: { cpufreq: { ...cpufreq } },
                cpu1: { online: '1', cpufreq: { ...cpufreq } },
            },
        });
    });

    afterEach((): void => {
        mock.restore();
    });

    it('should set max frequency and enable boost by default', (): void => {
        const cpu = new CpuController('/sys/devices/system/cpu');
        cpu.setGovernorScalingMaxFrequency();
        expect(cpu.cores[0].scalingMaxFreq.readValue()).toBe(3000000);
        expect(cpu.cores[1].scalingMaxFreq.readValue()).toBe(3000000);
        expect(cpu.boost.readValue()).toBe(true);
    });

    it('should disable boost for a selectable max frequency', (): void => {
        const cpu = new CpuController('/sys/devices/system/cpu');
        cpu.setGovernorScalingMaxFrequency(2000000);
        expect(cpu.cores[0].scalingMaxFreq.readValue()).toBe(2000000);
        expect(cpu.boost.readValue()).toBe(false);
    });
});
