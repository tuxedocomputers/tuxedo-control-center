import 'jasmine';
const mock = require('mock-fs');
import * as fs from 'fs';

import { SysFsPropertyIntegerHex } from './SysFsProperties';

describe('SysDevPropertyInteger', () => {

    const dev = new SysFsPropertyIntegerHex(
        '/sys/bus/usb/drivers/usb/1-2/idProduct',
        '/sys/bus/usb/drivers/usb/1-2/idProduct'
    );

    // Mock file structure in memory
    beforeEach(() => {
        mock({
            '/sys/bus/usb/drivers/usb/1-2/': {}
        });
    });

    afterEach(() => {
        mock.restore();
    });

    it('should throw error if file cannot be read', () => {
        expect(() => { dev.readValue(); }).toThrow();
    });

    it('should not throw and return NaN if value is not an integer', () => {
        mock({ '/sys/bus/usb/drivers/usb/1-2/idProduct' : 'no numbers here' });
        expect(() => { dev.readValue(); }).not.toThrow();
        expect(dev.readValue()).toBeNaN();
    });

    it('should correctly read an integer from file', () => {
        mock({ '/sys/bus/usb/drivers/usb/1-2/idProduct' : '04f2' });
        expect(() => { dev.readValue(); }).not.toThrow();
        expect(dev.readValue()).toBe(1266);
    });

    it('should throw if file cannot be written', () => {
        expect(() => { dev.writeValue(1234); }).toThrow();
    });

    it('should write number as a string if file exists', () => {
        mock({ '/sys/bus/usb/drivers/usb/1-2/idProduct' : '' });
        expect( () => { dev.writeValue(1234); }).not.toThrow();
        expect(fs.readFileSync('/sys/bus/usb/drivers/usb/1-2/idProduct').toString()).toBe('4d2');
    });
});
