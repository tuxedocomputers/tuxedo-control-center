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
import * as fs from 'fs';

import { SysFsPropertyString } from './SysFsProperties';

describe('SysDevPropertyString', () => {

    const dev = new SysFsPropertyString('/sys/class/backlight/intel_backlight/type');

    // Mock file structure in memory
    beforeEach(() => {
        mock({
            '/sys/class': {}
        });
    });

    afterEach(() => {
        mock.restore();
    });

    it('when read should throw error if file does not exist', () => {
        expect(() => { dev.readValue(); }).toThrow();
    });

    it('when written should throw error if file does not exist', () => {
        expect(() => { dev.writeValue('something'); }).toThrow();
    });

    it('should throw error if writing to file while not the owner', () => {
        mock({
            '/sys/class/backlight/intel_backlight/type': mock.file({
                content: '',
                uid: 0,
                gid: 0,
                mode: 0o644
            })
        });
        expect(() => { dev.writeValue('something'); }).toThrow();
    });

    it('should not throw error if writing to file while the owner', () => {
        mock({
            '/sys/class/backlight/intel_backlight/type': mock.file({
                content: 'something',
                mode: 0o644
            })
        });
        expect(() => { dev.writeValue('something else'); }).not.toThrow();
        expect(fs.readFileSync('/sys/class/backlight/intel_backlight/type').toString()).toBe('something else');
    });
});
