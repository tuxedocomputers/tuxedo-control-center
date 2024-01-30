/*!
 * Copyright (c) 2019-2023 TUXEDO Computers GmbH <tux@tuxedocomputers.com>
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

import { Component, OnInit } from '@angular/core';
import { ConfigService } from '../config.service';
import { UtilsService } from '../utils.service';
import { Subscription } from 'rxjs';
import { TccDBusClientService } from '../tcc-dbus-client.service';
import { FormControl } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AvailabilityService } from "../../../common/classes/availability.service";

@Component({
    selector: 'app-global-settings',
    templateUrl: './global-settings.component.html',
    styleUrls: ['./global-settings.component.scss']
})
export class GlobalSettingsComponent implements OnInit {
    Object = Object;

    public gridParams = {
        cols: 9,
        headerSpan: 4,
        valueSpan: 2,
        inputSpan: 3
    };

    public cpuSettingsEnabled: boolean = true;
    public fanControlEnabled: boolean = true;
    public keyboardBacklightControlEnabled: boolean = true;
    public forceYUV420OutputSwitchAvailable: boolean = false;
    public ycbcr420Workaround: Array<Object> = [];

    public ctrlBrightnessMode = new FormControl();

    public hasChargingSettings = false;

    private subscriptions: Subscription = new Subscription();

    public primeState: string = "iGPU";
    public expandPrimeSelect: Boolean = false;

    constructor(
        private config: ConfigService,
        private utils: UtilsService,
        private tccdbus: TccDBusClientService,
        private router: Router,
        private route: ActivatedRoute,
        public availability: AvailabilityService
    ) { }

    ngOnInit() {
        this.setValuesFromResolverRoute();
    
        const routingFromDashboard = this.route.snapshot.paramMap.get("routingFromDashboard");
        if (routingFromDashboard) {
            this.expandPrimeSelect = true;
        }

        this.subscriptions.add(this.tccdbus.forceYUV420OutputSwitchAvailable.subscribe(
            forceYUV420OutputSwitchAvailable => { this.forceYUV420OutputSwitchAvailable = forceYUV420OutputSwitchAvailable; }
        ));

        this.cpuSettingsEnabled = this.config.getSettings().cpuSettingsEnabled;
        this.fanControlEnabled = this.config.getSettings().fanControlEnabled;
        this.keyboardBacklightControlEnabled = this.config.getSettings().keyboardBacklightControlEnabled;
        for (let card = 0; card < this.config.getSettings().ycbcr420Workaround.length; card++) {
            this.ycbcr420Workaround[card] = {};
            for (let port in this.config.getSettings().ycbcr420Workaround[card]) {
                this.ycbcr420Workaround[card][port] = this.config.getSettings().ycbcr420Workaround[card][port];
            }
        }

        this.utils.getBrightnessMode().then((mode) => { this.ctrlBrightnessMode.setValue(mode) });
    }

    setValuesFromResolverRoute() {
        const paramMap = this.route.snapshot.paramMap;
        const data = this.route.snapshot.data;

        const routingFromDashboard = paramMap.get("routingFromDashboard");
        this.expandPrimeSelect = Boolean(routingFromDashboard);

        this.forceYUV420OutputSwitchAvailable =
            data.forceYUV420OutputSwitchAvailable;

        this.hasChargingSettings =
            Array.isArray(data.chargingProfilesAvailable) &&
            data.chargingProfilesAvailable.length > 0;

        this.primeState = data.primeSelectAvailable;
    }
    
    onCPUSettingsEnabledChanged(event: any) {
        this.utils.pageDisabled = true;

        this.config.getSettings().cpuSettingsEnabled = event.checked;
        
        this.config.saveSettings().then(success => {
            if (!success) {
                this.config.getSettings().cpuSettingsEnabled = !event.checked;
            }
            
            this.cpuSettingsEnabled = this.config.getSettings().cpuSettingsEnabled

            this.utils.pageDisabled = false;
        });
    }

    onFanControlEnabledChanged(event: any) {
        this.utils.pageDisabled = true;

        this.config.getSettings().fanControlEnabled = event.checked;
        
        this.config.saveSettings().then(success => {
            if (!success) {
                this.config.getSettings().fanControlEnabled = !event.checked;
            }

            this.fanControlEnabled = this.config.getSettings().fanControlEnabled;

            this.utils.pageDisabled = false;
        });
    }

    onKeyboardBacklightControlEnabledChanged(event: any) {
        this.utils.pageDisabled = true;

        this.config.getSettings().keyboardBacklightControlEnabled = event.checked;
        
        this.config.saveSettings().then(success => {
            if (!success) {
                this.config.getSettings().keyboardBacklightControlEnabled = !event.checked;
            }

            this.keyboardBacklightControlEnabled = this.config.getSettings().keyboardBacklightControlEnabled;

            this.utils.pageDisabled = false;
        });
    }

    onYCbCr420WorkaroundChanged(event: any, card: number, port: string) {
        if (this.config.getSettings().ycbcr420Workaround.length > card && port in this.config.getSettings().ycbcr420Workaround[card]) {
            this.utils.pageDisabled = true;

            this.config.getSettings().ycbcr420Workaround[card][port] = event.checked;

            this.config.saveSettings().then(success => {
                if (!success) {
                    this.config.getSettings().ycbcr420Workaround[card][port] = !event.checked;
                    this.ycbcr420Workaround[card][port] = !event.checked;
                }

                this.ycbcr420Workaround[card][port] = this.config.getSettings().ycbcr420Workaround[card][port];

                this.utils.pageDisabled = false;
            });
        }
    }

    public async onBrightnessModeCtrlChange() {
        await this.utils.setBrightnessMode(this.ctrlBrightnessMode.value);
    }

    public gotoComponent(component: string) {
        this.router.navigate([component], { relativeTo: this.route.parent });
    }

    public onPrimeStateChanged(newPrimeState: string) {
        this.primeState = newPrimeState;
    }
}