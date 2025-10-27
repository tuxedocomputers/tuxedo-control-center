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

import 'jasmine';
const mock: typeof import("mock-fs") = require('mock-fs');
import * as fs from 'node:fs';

import { SysFsPropertyStringList } from './SysFsProperties';

describe('SysDevPropertyStringList', (): void => {

    const dev = new SysFsPropertyStringList('/sys/devices/system/cpu/cpufreq/policy0/scaling_available_governors');

    // Mock file structure in memory
    beforeEach((): void => {
        mock({
            '/sys/devices/system': {}
        });
    });

    afterEach((): void => {
        mock.restore();
    });

    it('should throw error if file cannot be read', (): void => {
        expect((): void => { dev.readValue(); }).toThrow();
    });

    it('should return empty list if file is empty', (): void => {
        mock({ '/sys/devices/system/cpu/cpufreq/policy0/scaling_available_governors' : '' });
        expect((): void => { dev.readValue(); }).not.toThrow();
        expect(dev.readValue()).toEqual([]);
    });

    it('should corrently read lists of strings from file', (): void => {
        mock({ '/sys/devices/system/cpu/cpufreq/policy0/scaling_available_governors' : 'prop1' });
        expect((): void => { dev.readValue(); }).not.toThrow();
        expect(dev.readValue()).toEqual(['prop1']);

        mock({ '/sys/devices/system/cpu/cpufreq/policy0/scaling_available_governors' : 'prop1 prop2 prop3' });
        expect((): void => { dev.readValue(); }).not.toThrow();
        expect(dev.readValue()).toEqual(['prop1', 'prop2', 'prop3']);
    });

    it('should throw if file cannot be written', (): void => {
        expect((): void => { dev.writeValue(['prop1', 'prop2', 'prop3']); }).toThrow();
    });

    it('should write empty file for an empty input list', (): void => {
        mock({ '/sys/devices/system/cpu/cpufreq/policy0/scaling_available_governors' : 'something' });
        expect((): void => { dev.writeValue([]); }).not.toThrow();
        expect(fs.readFileSync('/sys/devices/system/cpu/cpufreq/policy0/scaling_available_governors').toString()).toBe('');
    });

    it('should write list of strings properly', (): void => {
        mock({ '/sys/devices/system/cpu/cpufreq/policy0/scaling_available_governors' : 'something' });
        expect((): void => { dev.writeValue(['prop1']); }).not.toThrow();
        expect(fs.readFileSync('/sys/devices/system/cpu/cpufreq/policy0/scaling_available_governors').toString()).toBe('prop1');

        mock({ '/sys/devices/system/cpu/cpufreq/policy0/scaling_available_governors' : 'something' });
        expect((): void => { dev.writeValue(['prop1', 'prop2', 'prop3']); }).not.toThrow();
        expect(fs.readFileSync('/sys/devices/system/cpu/cpufreq/policy0/scaling_available_governors').toString()).toBe('prop1 prop2 prop3');
    });
});
