import 'jasmine';
const mock = require('mock-fs');
import * as fs from 'fs';

import { SysDevPropertyInteger } from './SysDevPropertyInteger';

describe('SysDevPropertyInteger', () => {

    const dev = new SysDevPropertyInteger(
        '/sys/class/backlight/intel_backlight/actual_brightness',
        '/sys/class/backlight/intel_backlight/brightness'
    );

    // Mock file structure in memory
    beforeEach(() => {
        mock({
            '/sys/class/backlight/': {}
        });
    });

    afterEach(() => {
        mock.restore();
    });

    it('should throw error if file cannot be read', () => {
        expect(() => { dev.readValue(); }).toThrow();
    });

    it('should not throw and return NaN if value is not an integer', () => {
        mock({ '/sys/class/backlight/intel_backlight/actual_brightness' : 'no numbers here' });
        expect(() => { dev.readValue(); }).not.toThrow();
        expect(dev.readValue()).toBeNaN();
    });

    it('should correctly read an integer from file', () => {
        mock({ '/sys/class/backlight/intel_backlight/actual_brightness' : '1234' });
        expect(() => { dev.readValue(); }).not.toThrow();
        expect(dev.readValue()).toBe(1234);
    });

    it('should throw if file cannot be written', () => {
        expect(() => { dev.writeValue(1234); }).toThrow();
    });

    it('should write number as a string if file exists', () => {
        mock({ '/sys/class/backlight/intel_backlight/brightness' : '' });
        expect( () => { dev.writeValue(1234); }).not.toThrow();
        expect(fs.readFileSync('/sys/class/backlight/intel_backlight/brightness').toString()).toBe('1234');
    });
});
