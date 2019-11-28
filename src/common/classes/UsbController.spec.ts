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

import { UsbController } from './UsbController';

describe('UsbController', () => {

    let dev: UsbController;

    // Mock file structure in memory
    beforeEach(() => {
        mock({
            '/realpath': {
                '1-11': {},
                '1-11.1': {},
                '1-11.2': {},
                '1-11.3': {},
                '1-11.2:1.0': {},
                '1-11.2:1.1': {},
                '1-2': {
                    idProduct: 'b59e',
                    idVendor: '04f2',
                    product: 'Chicony USB2.0 Camera',
                    manufacturer: 'Chicony Electronics Co.,Ltd.'
                },
                '1-2:1.0': {},
                '1-2:1.1': {},
            },
            '/sys/bus/usb/devices': {
                '1-11': mock.symlink({path: '/realpath/1-11'}),
                '1-11.1': mock.symlink({path: '/realpath/1-11.1'}),
                '1-11.2': mock.symlink({path: '/realpath/1-11.2'}),
                '1-11.3': mock.symlink({path: '/realpath/1-11.3'}),
                '1-11.2:1.0': mock.symlink({path: '/realpath/1-11.2:1.0'}),
                '1-11.2:1.1': mock.symlink({path: '/realpath/1-11.2:1.1'}),
                '1-2': mock.symlink({path: '/realpath/1-2'}),
                '1-2:1.0': mock.symlink({path: '/realpath/1-2:1.0'}),
                '1-2:1.1': mock.symlink({path: '/realpath/1-2:1.1'}),
            },
            '/sys/bus/usb/drivers/usb': {
                bind: '',
                unbind: ''
            }
        });

        dev = new UsbController('/sys/bus/usb/devices/1-2');
    });

    afterEach(() => {
        dev = undefined;
        mock.restore();
    });

    it('should get device list for devices and ignore interfaces', () => {
        // Test avoided for now due to mock-fs not supported option 'withFileTypes' with readdirSync
        /* const deviceList = UsbController.getUsbDeviceList();
        expect(deviceList.includes('1-11')).toBe(true);
        expect(deviceList.includes('1-11.1')).toBe(true);
        expect(deviceList.includes('1-11.2')).toBe(true);
        expect(deviceList.includes('1-11.3')).toBe(true);
        expect(deviceList.includes('1-11.2:1.0')).toBe(false);
        expect(deviceList.includes('1-11.2:1.1')).toBe(false);
        expect(deviceList.includes('1-2')).toBe(true);
        expect(deviceList.includes('1-2:1.0')).toBe(false);
        expect(deviceList.includes('1-2:1.1')).toBe(false);*/
    });

    it('should read device properties', () => {
        expect(() => { dev.idProduct.readValue(); }).not.toThrow();
        expect(dev.idProduct.readValue()).toBe(46494);
        expect(() => { dev.idVendor.readValue(); }).not.toThrow();
        expect(dev.idVendor.readValue()).toBe(1266);
        expect(() => { dev.product.readValue(); }).not.toThrow();
        expect(dev.product.readValue()).toBe('Chicony USB2.0 Camera');
        expect(() => { dev.manufacturer.readValue(); }).not.toThrow();
        expect(dev.manufacturer.readValue()).toBe('Chicony Electronics Co.,Ltd.');
    });

    it('should write to bind to enable device', () => {
        expect(fs.readFileSync('/sys/bus/usb/drivers/usb/bind').toString()).toBe('');
        dev.enableDevice();
        expect(fs.readFileSync('/sys/bus/usb/drivers/usb/bind').toString()).toBe('1-2');
    });

    it('should write to unbind to disable device', () => {
        expect(fs.readFileSync('/sys/bus/usb/drivers/usb/unbind').toString()).toBe('');
        dev.disableDevice();
        expect(fs.readFileSync('/sys/bus/usb/drivers/usb/unbind').toString()).toBe('1-2');
    });
});
