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

import * as path from 'path';
import * as fs from 'fs';
import * as child_process from 'child_process';

import { IDrive } from "../models/IDrive";
import { SysFsPropertyInteger } from './SysFsProperties';

export class DriveController {

    private static _sysBlockDir: string = "/sys/block/";

    public static async getDrives(includeLoopDevices: boolean = false): Promise<IDrive[]> {
        const drives: IDrive[] = [];

        const dirs: string[] = fs.readdirSync(this._sysBlockDir);
        for (const d of dirs) {
            const dr: IDrive[] = await this.getChildDevices(path.join(this._sysBlockDir, d));
            if (dr !== undefined) {
                for (const drive of dr) {
                    if (!includeLoopDevices && !drive.name.startsWith("loop")) {
                        drives.push(drive);
                    }
                }
            }
        }

        return drives;
    }

    /*
    // todo: remove, unused
    public static async getDrivesWorkaround(includeLoopDevices: boolean = false): Promise<IDrive[]> {
        // Workaround for suse. Suse need a first call of blkid with sudo, to create the map for normal users
        child_process.execSync(`pkexec blkid -o value -s TYPE`);

        return this.getDrives(includeLoopDevices);
    }
    */

    public static async getDeviceInfo(devicePath: string): Promise<IDrive> {
        const name: string = path.basename(devicePath);
        const size: number = new SysFsPropertyInteger(path.join(devicePath, "size")).readValue();

        const isParent: boolean = !fs.existsSync(path.join(devicePath, "partition"));
        let devPath: string = "";

        if (fs.existsSync(path.join("/dev/", name))) {
            devPath = path.join("/dev/", name);
        }

        const result: Buffer = child_process.execSync(`lsblk --noheadings --nodeps --output FSTYPE ${devPath}`);
        const isCrpyt: boolean = result.toString().trim() == "crypto_LUKS";

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
        const childDevices: IDrive[] = [];

        const name: string = path.basename(devicePath);
        for (const f of fs.readdirSync(devicePath)) {
            if (f.startsWith(name)) {
                childDevices.push(await this.getDeviceInfo(path.join(devicePath, f)));
            }
        }

        return childDevices;
    }
}
