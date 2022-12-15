/*!
 * Copyright (c) 2022 TUXEDO Computers GmbH <tux@tuxedocomputers.com>
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
import { Component, OnDestroy, OnInit } from "@angular/core";
import { TccDBusClientService } from "../tcc-dbus-client.service";

@Component({
    selector: 'app-charging-settings',
    templateUrl: './charging-settings.component.html',
    styleUrls: ['./charging-settings.component.scss']
})
export class ChargingSettingsComponent implements OnInit, OnDestroy {

    public chargingPriosAvailable: string[] = [];
    public chargingProfilesAvailable: string[] = [];

    public currentChargingProfile = '';
    public currentChargingPriority = '';

    public chargingProfileProgress = false;
    public chargingPriorityProgress = false;

    private updateInterval = 1000;
    private timeout;

    constructor(
        private tccdbus: TccDBusClientService
    ) { }

    ngOnInit() {
        this.periodicUpdate().then(() => {
            this.timeout = setInterval(async () => { await this.periodicUpdate(); }, this.updateInterval);
        });
    }

    ngOnDestroy() {
        if (this.timeout !== undefined) {
            clearInterval(this.timeout);
        }
    }

    private async periodicUpdate() {
        await this.readAvailableSettings();
    }

    public async readAvailableSettings() {
        const dbus = this.tccdbus.getInterface();
        if (dbus === undefined) {
            return false;
        }

        this.chargingProfilesAvailable = await dbus.getChargingProfilesAvailable();
        this.currentChargingProfile = await dbus.getCurrentChargingProfile();

        this.chargingPriosAvailable = await dbus.getChargingPrioritiesAvailable();
        this.currentChargingPriority = await dbus.getCurrentChargingPriority();

        return true;
    }

    public async setChargingProfile(chargingProfileDescriptor: string) {
        const dbus = this.tccdbus.getInterface();
        if (dbus === undefined) {
            return false;
        }
        this.chargingProfileProgress = true;
        const result = await dbus.setChargingProfile(chargingProfileDescriptor);
        await this.readAvailableSettings();
        this.chargingProfileProgress = false;

        return result;
    }

    public async setChargingPriority(chargingPriorityDescriptor: string) {
        const dbus = this.tccdbus.getInterface();
        if (dbus === undefined) {
            return false;
        }
        this.chargingPriorityProgress = true;
        const result = await dbus.setChargingPriority(chargingPriorityDescriptor);
        await this.readAvailableSettings();
        this.chargingPriorityProgress = false;

        return result;
    }
}
