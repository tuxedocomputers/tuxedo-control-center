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
const mock: typeof import('mock-fs') = require('mock-fs');
import * as fs from 'node:fs';

import { SysFsPropertyInteger } from './SysFsProperties';

describe('SysDevPropertyInteger', (): void => {
    const dev = new SysFsPropertyInteger(
        '/sys/class/backlight/intel_backlight/actual_brightness',
        '/sys/class/backlight/intel_backlight/brightness',
    );

    // Mock file structure in memory
    beforeEach((): void => {
        mock({
            '/sys/class/backlight/': {},
        });
    });

    afterEach((): void => {
        mock.restore();
    });

    it('should throw error if file cannot be read', (): void => {
        expect((): void => {
            dev.readValue();
        }).toThrow();
    });

    it('should not throw and return NaN if value is not an integer', (): void => {
        mock({ '/sys/class/backlight/intel_backlight/actual_brightness': 'no numbers here' });
        expect((): void => {
            dev.readValue();
        }).not.toThrow();
        expect(dev.readValue()).toBeNaN();
    });

    it('should correctly read an integer from file', (): void => {
        mock({ '/sys/class/backlight/intel_backlight/actual_brightness': '1234' });
        expect((): void => {
            dev.readValue();
        }).not.toThrow();
        expect(dev.readValue()).toBe(1234);
    });

    it('should throw if file cannot be written', (): void => {
        expect((): void => {
            dev.writeValue(1234);
        }).toThrow();
    });

    it('should write number as a string if file exists', (): void => {
        mock({ '/sys/class/backlight/intel_backlight/brightness': '' });
        expect((): void => {
            dev.writeValue(1234);
        }).not.toThrow();
        expect(fs.readFileSync('/sys/class/backlight/intel_backlight/brightness').toString()).toBe('1234');
    });

    it('should correctly identify readable properties', (): void => {
        mock({ '/sys/class/backlight/intel_backlight/actual_brightness': mock.file({ content: '1234', mode: 0o444 }) });
        expect(dev.isReadable()).toBeTruthy();

        mock({ '/sys/class/backlight/intel_backlight/actual_brightness': mock.file({ content: '1234', mode: 0o222 }) });
        expect(dev.isReadable()).toBeFalsy();
    });

    it('should correctly identify writable properties', (): void => {
        mock({ '/sys/class/backlight/intel_backlight/brightness': mock.file({ content: '1234', mode: 0o444 }) });
        expect(dev.isWritable()).toBeFalsy();

        mock({ '/sys/class/backlight/intel_backlight/brightness': mock.file({ content: '1234', mode: 0o222 }) });
        expect(dev.isWritable()).toBeTruthy();
    });
});
