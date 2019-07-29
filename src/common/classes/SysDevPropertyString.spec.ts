import 'jasmine';
const mock = require('mock-fs');
import * as fs from 'fs';

import { SysDevPropertyString } from './SysDevPropertyString';

describe('SysDevPropertyString', () => {

    const dev = new SysDevPropertyString('/sys/class/backlight/intel_backlight/type');

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
