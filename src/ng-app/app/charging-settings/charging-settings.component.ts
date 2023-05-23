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
import { ElectronService } from "ngx-electron";

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

    public chargingProfilesUrlHref = $localize `:@@chargingProfilesInfoLinkHref:https\://www.tuxedocomputers.com/en/Battery-charging-profiles-inside-the-TUXEDO-Control-Center.tuxedo`;

    constructor(
        private tccdbus: TccDBusClientService,
        private electron: ElectronService
    ) {
        this.chargingProfileLabels.set('high_capacity', $localize `:@@chargingProfileHighCapacityLabel:Full capacity`);
        this.chargingProfileLabels.set('balanced', $localize `:@@chargingProfileBalancedLabel:Reduced capacity`);
        this.chargingProfileLabels.set('stationary', $localize `:@@chargingProfileStationaryLabel:Stationary use`);

        this.chargingProfileDescriptions.set('high_capacity', $localize `:@@chargingProfileHighCapacityDescription:This is the default setting. Fastest charging speed and 100% battery capacity for best possible runtimes.`);
        this.chargingProfileDescriptions.set('balanced', $localize `:@@chargingProfileBalancedDescription:Reduced charging speed and battery capacity (~90 %) for better battery lifespan.`);
        this.chargingProfileDescriptions.set('stationary', $localize `:@@chargingProfileStationaryDescription:Very significant reduced charging speed and battery capacity (~80 %) for best possible battery lifespan. This is recommended if you use your TUXEDO almost only stationary connected to a wall outlet.`);

        this.chargingPriorityLabels.set('charge_battery', $localize `:@@chargingPriorityChargeBatteryLabel:Priorize battery charging speed`);
        this.chargingPriorityLabels.set('performance', $localize `:@@chargingPriorityPerformanceLabel:Priorize performance`);

        this.chargingPriorityDescriptions.set('charge_battery', $localize `:@@chargingPriorityChargeBatteryDescription:Fast battery charging is priorized at the expense of system performance. Once the battery is charged, full performance is available.`);
        this.chargingPriorityDescriptions.set('performance', $localize `:@@chargingPriorityPerformanceDescription:Performance is priorized over battery charging speed. Under high system load charging speed is reduced for best performance. At low loads full charging speed is available.`);
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

    public async openExternalUrl(url: string) {
        await this.electron.shell.openExternal(url);
    }
}
