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
import { SysFsController } from './SysFsController';
import { SysFsPropertyIntegerHex, SysFsPropertyString } from './SysFsProperties';
import * as path from 'path';
import * as fs from 'fs';

export class UsbController extends SysFsController {

    private static readonly USB_DEVICES_PATH = '/sys/bus/usb/devices';
    private static readonly USB_DRIVER_PATH = '/sys/bus/usb/drivers/usb';

    public readonly idProduct = new SysFsPropertyIntegerHex(path.join(this.devicePath, 'idProduct'));
    public readonly idVendor = new SysFsPropertyIntegerHex(path.join(this.devicePath, 'idVendor'));
    public readonly product = new SysFsPropertyString(path.join(this.devicePath, 'product'));
    public readonly manufacturer = new SysFsPropertyString(path.join(this.devicePath, 'manufacturer'));

    public readonly deviceIdString: string;

    // Static stuff
    public static getUsbDeviceList(): string[] {
        const completeDeviceList = SysFsController.getDeviceList(UsbController.USB_DEVICES_PATH);
        return completeDeviceList.filter(devIdString => !devIdString.includes(':'));
    }

    public static getUsbDriverDeviceList(): string[] {
        return SysFsController.getDeviceListDirent(UsbController.USB_DRIVER_PATH)
            .filter(dirent => dirent.isDirectory() || dirent.isSymbolicLink())
            .map(dirent => dirent.name);
    }
    // End static stuff

    constructor(public readonly devicePath: string) {
        super();
        this.deviceIdString = path.basename(this.devicePath);
    }

    public enableDevice(): boolean {
        try {
            fs.writeFileSync(path.join(UsbController.USB_DRIVER_PATH, 'bind'), this.deviceIdString);
            return true;
        } catch (err) {
            return false;
        }
    }

    public disableDevice(): boolean {
        try {
            fs.writeFileSync(path.join(UsbController.USB_DRIVER_PATH, 'unbind'), this.deviceIdString);
            return true;
        } catch (err) {
            return false;
        }
    }

    public isEnabled(): boolean {
        const driverDeviceList = UsbController.getUsbDriverDeviceList();

        return driverDeviceList.includes(this.deviceIdString);
    }
}
