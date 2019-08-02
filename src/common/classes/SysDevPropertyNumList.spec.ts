import 'jasmine';
const mock = require('mock-fs');
import * as fs from 'fs';

import { SysDevPropertyNumList } from './SysDevProperties';

describe('SysDevPropertyStringList', () => {

    const dev = new SysDevPropertyNumList('/sys/devices/system/cpu/online');

    // Mock file structure in memory
    beforeEach(() => {
        mock({
            '/sys/devices/system/cpu': {}
        });
    });

    afterEach(() => {
        mock.restore();
    });

    it('should throw error if file cannot be read', () => {
        expect(() => { dev.readValue(); }).toThrow();
    });

    it('should return empty list if file is empty', () => {
        mock({ '/sys/devices/system/cpu/online' : '' });
        expect(() => { dev.readValue(); }).not.toThrow();
        expect(dev.readValue()).toEqual([]);
    });

    it('should corrently read lists of single numbers', () => {
        mock({ '/sys/devices/system/cpu/online' : '1' });
        expect(() => { dev.readValue(); }).not.toThrow();
        expect(dev.readValue()).toEqual([1]);

        mock({ '/sys/devices/system/cpu/online' : '1,2,3,4' });
        expect(() => { dev.readValue(); }).not.toThrow();
        expect(dev.readValue()).toEqual([1, 2, 3, 4]);
    });

    it('should corrently read lists of ranges and numbers', () => {
        mock({ '/sys/devices/system/cpu/online' : '0-1,3' });
        expect(() => { dev.readValue(); }).not.toThrow();
        expect(dev.readValue()).toEqual([0, 1, 3]);

        mock({ '/sys/devices/system/cpu/online' : '2,4-7,10-15' });
        expect(() => { dev.readValue(); }).not.toThrow();
        expect(dev.readValue()).toEqual([2, 4, 5, 6, 7, 10, 11, 12, 13, 14, 15]);
    });

    it('should throw if file cannot be written', () => {
        expect(() => { dev.writeValue([1, 2, 3]); }).toThrow();
    });

    it('should write empty file for an empty input list', () => {
        mock({ '/sys/devices/system/cpu/online' : 'something' });
        expect(() => { dev.writeValue([]); }).not.toThrow();
        expect(fs.readFileSync('/sys/devices/system/cpu/online').toString()).toBe('');
    });

    it('should write list of numbers properly', () => {
        mock({ '/sys/devices/system/cpu/online' : 'something' });
        expect(() => { dev.writeValue([4]); }).not.toThrow();
        expect(fs.readFileSync('/sys/devices/system/cpu/online').toString()).toBe('4');

        mock({ '/sys/devices/system/cpu/online' : 'something' });
        expect(() => { dev.writeValue([2, 4, 6]); }).not.toThrow();
        expect(fs.readFileSync('/sys/devices/system/cpu/online').toString()).toBe('2,4,6');
    });

    it('should write list of ranges properly', () => {
        mock({ '/sys/devices/system/cpu/online' : 'something' });
        expect(() => { dev.writeValue([0, 1, 3]); }).not.toThrow();
        expect(fs.readFileSync('/sys/devices/system/cpu/online').toString()).toBe('0-1,3');

        mock({ '/sys/devices/system/cpu/online' : 'something' });
        expect(() => { dev.writeValue([2, 4, 5, 6, 7, 10, 11, 12, 13, 14, 15]); }).not.toThrow();
        expect(fs.readFileSync('/sys/devices/system/cpu/online').toString()).toBe('2,4-7,10-15');
    });
});
