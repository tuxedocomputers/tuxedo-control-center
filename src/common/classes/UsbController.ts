/*!
 * Copyright (c) 2019-2026 TUXEDO Computers GmbH <tux@tuxedocomputers.com>
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

import type { Dirent } from 'node:fs';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { SysFsController } from './SysFsController';
import { SysFsPropertyIntegerHex, SysFsPropertyString } from './SysFsProperties';

export class UsbController extends SysFsController {
    private static readonly USB_DEVICES_PATH: string = '/sys/bus/usb/devices';
    private static readonly USB_DRIVER_PATH: string = '/sys/bus/usb/drivers/usb';

    // Static stuff
    public static getUsbDeviceList(): string[] {
        const completeDeviceList: string[] = SysFsController.getDeviceList(UsbController.USB_DEVICES_PATH);
        return completeDeviceList.filter((devIdString: string): boolean => !devIdString.includes(':'));
    }

    public static getUsbDriverDeviceList(): string[] {
        return SysFsController.getDeviceListDirent(UsbController.USB_DRIVER_PATH)
            .filter((dirent: Dirent): boolean => dirent.isDirectory() || dirent.isSymbolicLink())
            .map((dirent: Dirent): string => dirent.name);
    }
    // End static stuff

    public readonly deviceIdString: string;

    public readonly idProduct: SysFsPropertyIntegerHex;
    public readonly idVendor: SysFsPropertyIntegerHex;
    public readonly product: SysFsPropertyString;
    public readonly manufacturer: SysFsPropertyString;

    constructor(public readonly devicePath: string) {
        super();
        this.deviceIdString = path.basename(this.devicePath);

        this.idProduct = new SysFsPropertyIntegerHex(path.join(this.devicePath, 'idProduct'));
        this.idVendor = new SysFsPropertyIntegerHex(path.join(this.devicePath, 'idVendor'));
        this.product = new SysFsPropertyString(path.join(this.devicePath, 'product'));
        this.manufacturer = new SysFsPropertyString(path.join(this.devicePath, 'manufacturer'));
    }

    public enableDevice(): boolean {
        try {
            fs.writeFileSync(path.join(UsbController.USB_DRIVER_PATH, 'bind'), this.deviceIdString);
            return true;
        } catch (err: unknown) {
            console.error(`UsbController: enableDevice failed => ${err}`);
            return false;
        }
    }

    public disableDevice(): boolean {
        try {
            fs.writeFileSync(path.join(UsbController.USB_DRIVER_PATH, 'unbind'), this.deviceIdString);
            return true;
        } catch (err: unknown) {
            console.error(`UsbController: disableDevice failed => ${err}`);
            return false;
        }
    }

    public isEnabled(): boolean {
        const driverDeviceList: string[] = UsbController.getUsbDriverDeviceList();

        return driverDeviceList.includes(this.deviceIdString);
    }
}
