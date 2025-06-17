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

import { DaemonWorker } from './DaemonWorker';
import { TuxedoControlCenterDaemon } from './TuxedoControlCenterDaemon';
import { TccDBusInterface, TccDBusData, TccDBusOptions } from './TccDBusInterface';
import * as dbus from 'dbus-next';

import { TuxedoIOAPI } from '../../native-lib/TuxedoIOAPI';

export class TccDBusService extends DaemonWorker {

    private interface: TccDBusInterface;
    private readonly path: string = '/com/tuxedocomputers/tccd';

    private bus: dbus.MessageBus;

    private started: boolean = false;

    constructor(tccd: TuxedoControlCenterDaemon, private dbusData: TccDBusData) {
        super(1500, "TccDbusServiceWorker", tccd);
        this.dbusData.dbusAvailable = true;

        const options: TccDBusOptions = new TccDBusOptions();
        options.triggerStateCheck = async (): Promise<void> => { this.tccd.triggerStateCheck(); }
        options.chargingWorker = this.tccd.getChargingWorker();

        try {
            this.bus = dbus.systemBus();
            this.interface = new TccDBusInterface(dbusData, options);
        } catch (err: unknown) {
            console.error("TccDBusService: Error initializing DBus service =>", err)
        }
    }

    public async onStart(): Promise<void> {
        if (!this.started) {
            this.bus.requestName('com.tuxedocomputers.tccd', 0).then((name: number): void => {
                try {
                    this.bus.export(this.path, this.interface);
                    this.started = true;
                } catch (err: unknown) {
                    console.error("TccDBusService: Error exporting service: ", err)

                }
            }).catch((err: unknown): void => {
                console.error("TccDBusService: Failed to request bus name =>", err)
            });
        }
    }

    public async onWork(): Promise<void> {
        // Make sure wmiAvailability info is updated. Is done here until it gets its own worker.
        this.dbusData.tuxedoWmiAvailable = TuxedoIOAPI.wmiAvailable();

        if (this.dbusData.modeReapplyPending) {
            this.interface.ModeReapplyPendingChanged();
        }
    }

    public async onExit(): Promise<void> {
        this.dbusData.dbusAvailable = false;

        try {
            this.bus.unexport(this.path, this.interface);
        } catch (err: unknown) {
            console.error("TccDBusService: onExit failed =>", err)
        }
    }
}
