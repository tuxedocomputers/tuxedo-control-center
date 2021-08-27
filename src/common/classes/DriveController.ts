/*!
 * Copyright (c) 2019-2020 TUXEDO Computers GmbH <tux@tuxedocomputers.com>
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

import * as path from 'path';
import * as fs from 'fs';
import * as child_process from 'child_process';

import { IDrive } from "../models/IDrive";
import { SysFsPropertyInteger } from './SysFsProperties';

export class DriveController {

    private static _sysBlockDir = "/sys/block/";

    public static async getDrives(includeLoopDevices: boolean = false): Promise<IDrive[]> {
        let drives: IDrive[] = [];

        let dirs = fs.readdirSync(this._sysBlockDir);
        for (let d of dirs) {
            let dr = await this.getChildDevices(path.join(this._sysBlockDir, d));
            if (dr !== undefined) {
                for (let drive of dr) {
                    if (!includeLoopDevices && !drive.name.startsWith("loop")) {
                        drives.push(drive);
                    }
                }
            }
        }

        return drives;
    }

    public static async getDrivesWorkaround(includeLoopDevices: boolean = false): Promise<IDrive[]> {
        // Workaround for suse. Suse need a first call of blkid with sudo, to create the map for normal users
        child_process.execSync(`pkexec blkid -o value -s TYPE`);

        return this.getDrives(includeLoopDevices);
    }

    public static async getDeviceInfo(devicePath: string): Promise<IDrive> {
        let name = path.basename(devicePath);
        let size = new SysFsPropertyInteger(path.join(devicePath, "size")).readValue();

        let isParent = !fs.existsSync(path.join(devicePath, "partition"));
        let devPath = "";

        if (fs.existsSync(path.join("/dev/", name))) {
            devPath = path.join("/dev/", name);
        }

        let result = child_process.execSync(`blkid -o value -s TYPE ${devPath}`);
        const isCrpyt = result.toString().trim() == "crypto_LUKS";

        return {
            name: name,
            path: devicePath,
            devPath: devPath,
            crypt: isCrpyt,
            size: size,
            isParent: isParent
        }
    }

    public static async getChildDevices(devicePath: string): Promise<IDrive[]> {
        let childDevices: IDrive[] = [];

        let name = path.basename(devicePath);
        for (let f of fs.readdirSync(devicePath)) {
            if (f.startsWith(name)) {
                childDevices.push(await this.getDeviceInfo(path.join(devicePath, f)));
            }
        }

        return childDevices;
    }
}
