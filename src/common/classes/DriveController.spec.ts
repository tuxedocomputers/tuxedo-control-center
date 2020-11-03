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
const mock = require('mock-fs');

import { DriveController } from "./DriveController";

describe('DriveControll', () => {
    beforeEach(() => {});
    afterEach(() => {});

    it('get devices', () => {
        const devices = new DriveController();
        let d = devices.getDrives();
        console.log(d);
    });

    it('get parent info', () => {
        const controller = new DriveController();
        const parent = controller.getDeviceInfo("/sys/class/block/sda");
        console.log(parent);
        expect(parent.isParent).toBe(true);
    });

    it('get child info', () => {
        const controller = new DriveController();
        const parent = controller.getDeviceInfo("/sys/class/block/sda1");
        console.log(parent);
        expect(parent.isParent).toBe(false);
    });
});