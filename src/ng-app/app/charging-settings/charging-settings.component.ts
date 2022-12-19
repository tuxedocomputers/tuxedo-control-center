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
import { Component, EventEmitter, OnDestroy, OnInit, Output } from "@angular/core";
import { TccDBusClientService } from "../tcc-dbus-client.service";

@Component({
    selector: 'app-charging-settings',
    templateUrl: './charging-settings.component.html',
    styleUrls: ['./charging-settings.component.scss']
})
export class ChargingSettingsComponent implements OnInit, OnDestroy {

    @Output() hasFeature = new EventEmitter<boolean>();

    public chargingPriosAvailable: string[] = [];
    public chargingProfilesAvailable: string[] = [];

    public currentChargingProfile = '';
    public currentChargingPriority = '';

    public chargingProfileProgress = false;
    public chargingPriorityProgress = false;

    private updateInterval = 1000;
    private timeout;

    public chargingProfileLabels: Map<string, string> = new Map();
    public chargingProfileDescriptions: Map<string, string> = new Map();
    public chargingPriorityLabels: Map<string, string> = new Map();
    public chargingPriorityDescriptions: Map<string, string> = new Map();

    constructor(
        private tccdbus: TccDBusClientService
    ) {
        this.chargingProfileLabels.set('high_capacity', $localize `:@@chargingProfileHighCapacityLabel:High capacity`);
        this.chargingProfileLabels.set('balanced', $localize `:@@chargingProfileBalancedLabel:Balanced`);
        this.chargingProfileLabels.set('stationary', $localize `:@@chargingProfileStationaryLabel:Stationary`);

        this.chargingProfileDescriptions.set('high_capacity', $localize `:@@chargingProfileHighCapacityDescription:Optimize for charging speed and maximum capacity.`);
        this.chargingProfileDescriptions.set('balanced', $localize `:@@chargingProfileBalancedDescription:Balance between battery capacity and battery lifetime. Charging speed and peak capacity reduced.`);
        this.chargingProfileDescriptions.set('stationary', $localize `:@@chargingProfileStationaryDescription:Further reduced charging speed and peak capacity. Suitable when using external power supply almost extensively.`);

        this.chargingPriorityLabels.set('charge_battery', $localize `:@@chargingPriorityChargeBatteryLabel:Charge battery`);
        this.chargingPriorityLabels.set('performance', $localize `:@@chargingPriorityPerformanceLabel:Performance`);

        this.chargingPriorityDescriptions.set('charge_battery', $localize `:@@chargingPriorityChargeBatteryDescription:Prioritizes battery charging at the expense of performance.`);
        this.chargingPriorityDescriptions.set('performance', $localize `:@@chargingPriorityPerformanceDescription:Prioritizes performance at the expense of battery charge speed.`);
    }

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
        if (this.chargingPriosAvailable.length > 0 || this.chargingProfilesAvailable.length > 0) {
            this.hasFeature.emit(true);
        }
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
