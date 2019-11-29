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
import { DaemonWorker } from './DaemonWorker';
import { TuxedoControlCenterDaemon } from './TuxedoControlCenterDaemon';
import { TccDBusInterface, TccDBusData } from './TccDBusInterface';
import * as dbus from 'dbus-next';

export class TccDBusService extends DaemonWorker {

    private interface: TccDBusInterface;
    private readonly path = '/com/tuxedocomputers/tccd';

    private bus: dbus.MessageBus;

    private started = false;

    constructor(tccd: TuxedoControlCenterDaemon, dbusData: TccDBusData) {
        super(10000, tccd);

        try {
            this.bus = dbus.systemBus();
            this.interface = new TccDBusInterface(dbusData);
        } catch (err) {
            this.tccd.logLine('TccDBusService: Error initializing DBus service => ' + err);
        }
    }

    public onStart(): void {
        if (!this.started) {
            this.bus.requestName('com.tuxedocomputers.tccd', 0).then(name => {
                try {
                    this.bus.export(this.path, this.interface);
                    this.started = true;
                } catch (err) {
                    this.tccd.logLine('TccDBusService: Error exporting service => ' + err);
                }
            }).catch(err => {
                this.tccd.logLine('TccDBusInterface: Failed to request bus name => ' + err);
            });
        }
    }

    public onWork(): void {

    }

    public onExit(): void {
        try {
            this.bus.unexport(this.path, this.interface);
        } catch (err) {
            this.tccd.logLine('TccDBusService: Error unexporting interface => ' + err);
        }
    }
}
