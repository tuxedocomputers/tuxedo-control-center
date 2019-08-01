import 'jasmine';
const mock = require('mock-fs');
import * as fs from 'fs';

import { SysDevPropertyStringList } from './SysDevProperties';

describe('SysDevPropertyStringList', () => {

    const dev = new SysDevPropertyStringList('/sys/devices/system/cpu/cpufreq/policy0/scaling_available_governors');

    // Mock file structure in memory
    beforeEach(() => {
        mock({
            '/sys/devices/system': {}
        });
    });

    afterEach(() => {
        mock.restore();
    });

    it('should throw error if file cannot be read', () => {
        expect(() => { dev.readValue(); }).toThrow();
    });

    it('should return empty list if file is empty', () => {
        mock({ '/sys/devices/system/cpu/cpufreq/policy0/scaling_available_governors' : '' });
        expect(() => { dev.readValue(); }).not.toThrow();
        expect(dev.readValue()).toEqual([]);
    });

    it('should corrently read lists of strings from file', () => {
        mock({ '/sys/devices/system/cpu/cpufreq/policy0/scaling_available_governors' : 'prop1' });
        expect(() => { dev.readValue(); }).not.toThrow();
        expect(dev.readValue()).toEqual(['prop1']);

        mock({ '/sys/devices/system/cpu/cpufreq/policy0/scaling_available_governors' : 'prop1 prop2 prop3' });
        expect(() => { dev.readValue(); }).not.toThrow();
        expect(dev.readValue()).toEqual(['prop1', 'prop2', 'prop3']);
    });

    it('should throw if file cannot be written', () => {
        expect(() => { dev.writeValue(['prop1', 'prop2', 'prop3']); }).toThrow();
    });

    it('should write empty file for an empty input list', () => {
        mock({ '/sys/devices/system/cpu/cpufreq/policy0/scaling_available_governors' : 'something' });
        expect(() => { dev.writeValue([]); }).not.toThrow();
        expect(fs.readFileSync('/sys/devices/system/cpu/cpufreq/policy0/scaling_available_governors').toString()).toBe('');
    });

    it('should write list of strings properly', () => {
        mock({ '/sys/devices/system/cpu/cpufreq/policy0/scaling_available_governors' : 'something' });
        expect(() => { dev.writeValue(['prop1']); }).not.toThrow();
        expect(fs.readFileSync('/sys/devices/system/cpu/cpufreq/policy0/scaling_available_governors').toString()).toBe('prop1');

        mock({ '/sys/devices/system/cpu/cpufreq/policy0/scaling_available_governors' : 'something' });
        expect(() => { dev.writeValue(['prop1', 'prop2', 'prop3']); }).not.toThrow();
        expect(fs.readFileSync('/sys/devices/system/cpu/cpufreq/policy0/scaling_available_governors').toString()).toBe('prop1 prop2 prop3');
    });
});
