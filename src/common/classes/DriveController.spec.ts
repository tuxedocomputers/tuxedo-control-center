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

import 'jasmine';
const mockfs = require('mock-fs');

import { DriveController } from "./DriveController";
import * as child_process from 'child_process';

const sizeDriveSda: number = 488397168;
const sizeDriveSda1: number = 162799056;
const sizeDriveSda2: number = 162799056;
const sizeDriveSda3: number = 162799056;

describe('DriveController', async () => {
    beforeEach(() => {
        mockfs({
            '/sys/class/block/': {
                'sda': {
                    'size': sizeDriveSda.toString()
                },
                'sda1': {
                    'size': sizeDriveSda1.toString(),
                    'partition': '1'
                },
                'sda2': {
                    'size': sizeDriveSda2.toString(),
                    'partition': '2'
                }
            },
            '/sys/block/': {
                'dm-0': {},
                'dm-1': {},
                'dm-2': {},
                'loop0': {},
                'loop1': {},
                'loop2': {},
                'sda': {}
            },
            '/dev/': {
                'dm-0': {},
                'dm-1': {},
                'dm-2': {},
                'loop0': {},
                'loop1': {},
                'loop2': {},
                'sda': {},
                'sda1': {},
                'sda2': {},
                'sda3': {},
            }
        });
    });

    afterEach(() => {
        mockfs.restore();
    });

    it('get devices', async () => {
        let d = await DriveController.getDrives();
        console.log(d);
    });

    it('get devices without loop drives', async () => {
        let d = await DriveController.getDrives(false);
        console.log(d);
    });

    it('get parent info', async () => {
        const parent = await DriveController.getDeviceInfo("/sys/class/block/sda");
        console.log(parent);
        expect(parent.isParent).toBe(true);
    });

    it('get child info', async () => {
        spyOn(child_process, "execSync").and.returnValue(Buffer.from("ext4"));

        const drive = await DriveController.getDeviceInfo("/sys/class/block/sda1");
        console.log(drive);
        expect(drive.isParent).toBe(false);
        expect(drive.crypt).toBe(false);
        expect(drive.size).toBe(sizeDriveSda1);
    });

    it('get child info - crypt', async () => {
        spyOn(child_process, "execSync").and.returnValue(Buffer.from("crypto_LUKS"));

        const drive = await DriveController.getDeviceInfo("/sys/class/block/sda2");
        console.log(drive);
        expect(drive.isParent).toBe(false);
        expect(drive.crypt).toBe(true);
    });
});