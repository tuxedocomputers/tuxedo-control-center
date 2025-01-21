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
const mock: any = require('mock-fs');
import * as fs from 'fs';

import { SysFsPropertyNumList } from './SysFsProperties';

describe('SysDevPropertyNumList', (): void => {

    const dev = new SysFsPropertyNumList('/sys/devices/system/cpu/online');

    // Mock file structure in memory
    beforeEach((): void => {
        mock({
            '/sys/devices/system/cpu': {}
        });
    });

    afterEach((): void => {
        mock.restore();
    });

    it('should throw error if file cannot be read', (): void => {
        expect((): void => { dev.readValue(); }).toThrow();
    });

    it('should return empty list if file is empty', (): void => {
        mock({ '/sys/devices/system/cpu/online' : '' });
        expect((): void => { dev.readValue(); }).not.toThrow();
        expect(dev.readValue()).toEqual([]);
    });

    it('should corrently read lists of single numbers', (): void => {
        mock({ '/sys/devices/system/cpu/online' : '1' });
        expect((): void => { dev.readValue(); }).not.toThrow();
        expect(dev.readValue()).toEqual([1]);

        mock({ '/sys/devices/system/cpu/online' : '1,2,3,4' });
        expect((): void => { dev.readValue(); }).not.toThrow();
        expect(dev.readValue()).toEqual([1, 2, 3, 4]);
    });

    it('should corrently read lists of ranges and numbers', (): void => {
        mock({ '/sys/devices/system/cpu/online' : '0-1,3' });
        expect((): void => { dev.readValue(); }).not.toThrow();
        expect(dev.readValue()).toEqual([0, 1, 3]);

        mock({ '/sys/devices/system/cpu/online' : '2,4-7,10-15' });
        expect((): void => { dev.readValue(); }).not.toThrow();
        expect(dev.readValue()).toEqual([2, 4, 5, 6, 7, 10, 11, 12, 13, 14, 15]);
    });

    it('should throw if file cannot be written', (): void => {
        expect((): void => { dev.writeValue([1, 2, 3]); }).toThrow();
    });

    it('should write empty file for an empty input list', (): void => {
        mock({ '/sys/devices/system/cpu/online' : 'something' });
        expect((): void => { dev.writeValue([]); }).not.toThrow();
        expect(fs.readFileSync('/sys/devices/system/cpu/online').toString()).toBe('');
    });

    it('should write list of numbers properly', (): void => {
        mock({ '/sys/devices/system/cpu/online' : 'something' });
        expect((): void => { dev.writeValue([4]); }).not.toThrow();
        expect(fs.readFileSync('/sys/devices/system/cpu/online').toString()).toBe('4');

        mock({ '/sys/devices/system/cpu/online' : 'something' });
        expect((): void => { dev.writeValue([2, 4, 6]); }).not.toThrow();
        expect(fs.readFileSync('/sys/devices/system/cpu/online').toString()).toBe('2,4,6');
    });

    it('should write list of ranges properly', (): void => {
        mock({ '/sys/devices/system/cpu/online' : 'something' });
        expect((): void => { dev.writeValue([0, 1, 3]); }).not.toThrow();
        expect(fs.readFileSync('/sys/devices/system/cpu/online').toString()).toBe('0-1,3');

        mock({ '/sys/devices/system/cpu/online' : 'something' });
        expect((): void => { dev.writeValue([2, 4, 5, 6, 7, 10, 11, 12, 13, 14, 15]); }).not.toThrow();
        expect(fs.readFileSync('/sys/devices/system/cpu/online').toString()).toBe('2,4-7,10-15');
    });
});
