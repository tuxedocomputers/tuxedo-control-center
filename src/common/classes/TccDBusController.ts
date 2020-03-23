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
import * as dbus from 'dbus-next';
import { FanData } from '../../service-app/classes/TccDBusInterface';

export class TccDBusController {
    private busName = 'com.tuxedocomputers.tccd';
    private path = '/com/tuxedocomputers/tccd';
    private interfaceName = 'com.tuxedocomputers.tccd';
    private bus: dbus.MessageBus;
    private interface: dbus.ClientInterface;

    constructor() {
        this.bus = dbus.systemBus();
    }

    async init(): Promise<boolean> {
        try {
            const proxyObject = await this.bus.getProxyObject(this.busName, this.path);
            this.interface = proxyObject.getInterface(this.interfaceName);
            return true;
        } catch (err) {
            return false;
        }
    }

    async tuxedoWmiAvailable(): Promise<boolean> {
        try {
            return await this.interface.TuxedoWmiAvailable();
        } catch (err) {
            return false;
        }
    }

    async getFanDataCPU(): Promise<FanData> {
        try {
            return await this.interface.GetFanDataCPU();
        } catch (err) {
            return new FanData();
        }
    }

    async getFanDataGPU1(): Promise<FanData> {
        try {
            return await this.interface.GetFanDataGPU1();
        } catch (err) {
            return new FanData();
        }
    }

    async getFanDataGPU2(): Promise<FanData> {
        try {
            return await this.interface.GetFanDataGPU2();
        } catch (err) {
            return new FanData();
        }
    }
}
