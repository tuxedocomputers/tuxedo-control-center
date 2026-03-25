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

import 'jasmine';
const mock: typeof import('mock-fs') = require('mock-fs');

import { SysFsPropertyInteger } from '../../common/classes/SysFsProperties';
import type { IFanTempData } from '../../common/models/ITccFans';
import { FanControlPwm } from './FanControlPwm';

describe('FanControlPwm', (): void => {
    it('Pulse Gen 4: check pwm available', async (): Promise<void> => {
        mock({
            '/sys/class/hwmon/hwmon0/name': 'ADP1',
            '/sys/class/hwmon/hwmon1/name': 'acpitz',
            '/sys/class/hwmon/hwmon2/name': 'BAT0',
            '/sys/class/hwmon/hwmon3/name': 'nvme',
            '/sys/class/hwmon/hwmon4/name': 'k10temp',
            '/sys/class/hwmon/hwmon5/name': 'tuxedo',
            '/sys/class/hwmon/hwmon6/name': 'iwlwifi_1',
            '/sys/class/hwmon/hwmon7/name': 'amdgpu',
            '/sys/bus/platform/devices/tuxedo_fan_control/': {},
        });

        const fanApi = new FanControlPwm(undefined);

        expect(await fanApi.checkAvailable()).toEqual([true, true]);
    });

    it('Pulse Gen 4: check pwm with only read available', async (): Promise<void> => {
        mock({
            '/sys/class/hwmon/hwmon0/name': 'ADP1',
            '/sys/class/hwmon/hwmon1/name': 'acpitz',
            '/sys/class/hwmon/hwmon2/name': 'BAT0',
            '/sys/class/hwmon/hwmon3/name': 'nvme',
            '/sys/class/hwmon/hwmon4/name': 'k10temp',
            '/sys/class/hwmon/hwmon5/name': 'tuxedo',
            '/sys/class/hwmon/hwmon6/name': 'iwlwifi_1',
            '/sys/class/hwmon/hwmon7/name': 'amdgpu',
        });

        const fanApi = new FanControlPwm(undefined);

        expect(await fanApi.checkAvailable()).toEqual([true, false]);
    });

    it('Pulse Gen 4: check pwm with only write available', async (): Promise<void> => {
        mock({
            '/sys/class/hwmon/hwmon0/name': 'ADP1',
            '/sys/class/hwmon/hwmon1/name': 'acpitz',
            '/sys/class/hwmon/hwmon2/name': 'BAT0',
            '/sys/class/hwmon/hwmon3/name': 'nvme',
            '/sys/class/hwmon/hwmon4/name': 'k10temp',
            '/sys/class/hwmon/hwmon6/name': 'iwlwifi_1',
            '/sys/class/hwmon/hwmon7/name': 'amdgpu',
            '/sys/bus/platform/devices/tuxedo_fan_control/': {},
        });

        const fanApi = new FanControlPwm(undefined);

        expect(await fanApi.checkAvailable()).toEqual([false, false]);
    });

    it('Pulse Gen 4: check fan control not available', async (): Promise<void> => {
        mock({
            '/sys/class/hwmon/hwmon0/name': 'ADP1',
            '/sys/class/hwmon/hwmon1/name': 'acpitz',
            '/sys/class/hwmon/hwmon2/name': 'BAT0',
            '/sys/class/hwmon/hwmon3/name': 'nvme',
            '/sys/class/hwmon/hwmon4/name': 'k10temp',
            '/sys/class/hwmon/hwmon6/name': 'iwlwifi_1',
            '/sys/class/hwmon/hwmon7/name': 'amdgpu',
        });

        const fanApi = new FanControlPwm(undefined);

        expect(await fanApi.checkAvailable()).toEqual([false, false]);
    });

    it('Pulse Gen 4: hwmon label match', async (): Promise<void> => {
        mock({});

        const fanApi = new FanControlPwm(undefined);

        const fanLabelMap: Map<number, string> = new Map<number, string>();
        fanLabelMap.set(1, 'cpu0');
        fanLabelMap.set(2, 'cpu1');

        const tempLabelMap: Map<number, string> = new Map<number, string>();
        tempLabelMap.set(1, 'cpu0');

        const tempInputMap: Map<number, SysFsPropertyInteger> = new Map<number, SysFsPropertyInteger>();
        tempInputMap.set(1, new SysFsPropertyInteger('/sys/class/hwmon/hwmon5/temp1_input'));

        fanApi.setFanLabelMap(fanLabelMap);
        fanApi.setTempLabelMap(tempLabelMap);
        fanApi.setTempInputMap(tempInputMap);

        const fanTempMap: Map<number, IFanTempData> = new Map<number, IFanTempData>();
        fanTempMap.set(1, {
            tempLabel: 'cpu0',
            tempInput: new SysFsPropertyInteger('/sys/class/hwmon/hwmon5/temp1_input'),
        });
        fanTempMap.set(2, {
            tempLabel: 'cpu0',
            tempInput: new SysFsPropertyInteger('/sys/class/hwmon/hwmon5/temp1_input'),
        });

        expect(fanApi.testMatchLabels()).toEqual(fanTempMap);
    });
});
