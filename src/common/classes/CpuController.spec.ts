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
