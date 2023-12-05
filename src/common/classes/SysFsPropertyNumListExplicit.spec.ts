/*!
 * Copyright (c) 2019-2023 TUXEDO Computers GmbH <tux@tuxedocomputers.com>
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
import * as fs from 'fs';

import { SysFsPropertyNumListExplicit } from './SysFsProperties';

describe('SysDevPropertyNumListExplicit', () => {

    const dev = new SysFsPropertyNumListExplicit('/sys/something/numlist');
    const devSeparator = new SysFsPropertyNumListExplicit('/sys/something/numlist', '/sys/something/numlist', ',');

    // Mock file structure in memory
    beforeEach(() => {
        mock({
        });
    });

    afterEach(() => {
        mock.restore();
    });

    it('should read', () => {
        mock({ '/sys/something/numlist' : '1 2 3 2 1' });
        expect(() => { dev.readValue(); }).not.toThrow();
        expect(dev.readValue()).toEqual([1, 2, 3, 2, 1]);
    });

    it('should write', () => {
        mock({ '/sys/something/numlist' : 'something' });
        expect(() => { dev.writeValue([1, 2, 3, 2, 1]); }).not.toThrow();
        expect(fs.readFileSync('/sys/something/numlist').toString()).toBe('1 2 3 2 1');
    });

    it('should read with configurable list separator', () => {
        mock({ '/sys/something/numlist' : '1,2,3,2,1' });
        expect(() => { devSeparator.readValue(); }).not.toThrow();
        expect(devSeparator.readValue()).toEqual([1, 2, 3, 2, 1]);
    });

    it('should write with configurable list separator', () => {
        mock({ '/sys/something/numlist' : 'something' });
        expect(() => { devSeparator.writeValue([1, 2, 3, 2, 1]); }).not.toThrow();
        expect(fs.readFileSync('/sys/something/numlist').toString()).toBe('1,2,3,2,1');
    });
});
