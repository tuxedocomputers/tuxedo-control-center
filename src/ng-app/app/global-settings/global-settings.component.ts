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

import { Component, type OnInit } from '@angular/core';
import { ConfigService } from '../config.service';
import { UtilsService } from '../utils.service';
import { filter, firstValueFrom, Subscription } from 'rxjs';
import { TccDBusClientService } from '../tcc-dbus-client.service';
import { FormControl } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import type { MatCheckboxChange } from '@angular/material/checkbox';
import type { BrightnessModeString } from 'src/e-app/backendAPIs/brightnessAPI';
import { GridParamsSettings, type IGridParams } from "src/common/models/IGridParams";
import { Mutex } from 'async-mutex';

@Component({
    selector: 'app-global-settings',
    templateUrl: './global-settings.component.html',
    styleUrls: ['./global-settings.component.scss'],
    standalone: false
})
export class GlobalSettingsComponent implements OnInit {
    Object: ObjectConstructor = Object;

    public gridParams: IGridParams = GridParamsSettings;

    public cpuSettingsEnabled: boolean = true;
    public fanControlEnabled: boolean = true;
    public keyboardBacklightControlEnabled: boolean = true;
    public forceYUV420OutputSwitchAvailable: boolean = false;
    public ycbcr420Workaround: Array<Object> = [];
    public temperatureDisplayFahrenheit: boolean;
    public ctrlBrightnessMode: FormControl = new FormControl();

    public hasChargingSettings: boolean = false;

    private subscriptions: Subscription = new Subscription();

    public primeState: string = "iGPU";
    public expandPrimeSelect: boolean = false;
    public isX11: number = -1;
    public aptInstalled: boolean = false;
    
    public chargingProfilesUrlHref: string = $localize `:@@chargingProfilesInfoLinkHref:https\://www.tuxedocomputers.com/en/Battery-charging-profiles-inside-the-TUXEDO-Control-Center.tuxedo`;
    private mutex: Mutex = new Mutex();

    constructor(
        private config: ConfigService,
        private utils: UtilsService,
        private tccdbus: TccDBusClientService,
        private router: Router,
        private route: ActivatedRoute,
    ) { }

    // todo: move this.config.getSettings() into a variable in every function, too many calls
    public ngOnInit(): void {
        this.setVariablesWithRouteSnapshot();

        const routingFromDashboard: string = this.route.snapshot.paramMap.get("routingFromDashboard");
        if (routingFromDashboard) {
            this.expandPrimeSelect = true;
        }

        this.subscriptions.add(this.tccdbus.forceYUV420OutputSwitchAvailable.subscribe(
            (forceYUV420OutputSwitchAvailable: boolean): void => {
                if (forceYUV420OutputSwitchAvailable) {
                    this.forceYUV420OutputSwitchAvailable = forceYUV420OutputSwitchAvailable;
                }
            }
        ));

        this.cpuSettingsEnabled = this.config.getSettings().cpuSettingsEnabled;
        this.temperatureDisplayFahrenheit = this.config?.getSettings()?.fahrenheit ?? false;
        this.fanControlEnabled = this.config.getSettings().fanControlEnabled;
        this.keyboardBacklightControlEnabled = this.config.getSettings().keyboardBacklightControlEnabled;
        for (let card: number = 0; card < this.config.getSettings().ycbcr420Workaround?.length; card++) {
            this.ycbcr420Workaround[card] = {};
            for (const port in this.config.getSettings().ycbcr420Workaround[card]) {
                this.ycbcr420Workaround[card][port] = this.config.getSettings().ycbcr420Workaround[card][port];
            }
        }

        this.utils.getBrightnessMode().then((mode: BrightnessModeString): void => { this.ctrlBrightnessMode.setValue(mode) });
        this.subscribeIsX11();
    }

    private setVariablesWithRouteSnapshot(): void {
        const paramMap = this.route.snapshot.paramMap;
        const data = this.route.snapshot.data;

        const routingFromDashboard: string = paramMap.get("routingFromDashboard");
        this.expandPrimeSelect = Boolean(routingFromDashboard);

        this.forceYUV420OutputSwitchAvailable =
            data.forceYUV420OutputSwitchAvailable;

        this.hasChargingSettings =
            Array.isArray(data.chargingProfilesAvailable) &&
            data.chargingProfilesAvailable?.length > 0;

        this.primeState = data.primeSelectAvailable;
        this.isX11 = data.x11Status;
        
        this.aptInstalled = data.aptInstalled;
    }
    
    private subscribeIsX11(): void {
        this.subscriptions.add(
            this.tccdbus.isX11
                .pipe(
                    filter((value: number): boolean => value !== undefined && value !== -1)
                )
                .subscribe((isX11: number): void => {
                    this.isX11 = isX11;
                }
            )
        );
    }
    
    public async onCPUSettingsEnabledChanged(event:  MatCheckboxChange): Promise<void> {
        await this.mutex.runExclusive(async (): Promise<void> => {
            this.utils.pageDisabled = true;

            this.config.getSettings().cpuSettingsEnabled = event.checked;

            this.config.saveSettings().then(async (success: boolean): Promise<void> => {
                if (!success) {
                    this.config.getSettings().cpuSettingsEnabled = !event.checked;
                }

                await firstValueFrom(this.tccdbus.dbusAvailable);
                this.config.updateConfigData();

                this.cpuSettingsEnabled = this.config.getSettings().cpuSettingsEnabled

                this.utils.pageDisabled = false;
            });
        })
    }

    public async onTemperatureDisplayChanged(event: boolean): Promise<void> {
        await this.mutex.runExclusive(async (): Promise<void> => {
            this.utils.pageDisabled = true;
            this.config.getSettings().fahrenheit = event;
            this.config.saveSettings().then(async (success: boolean): Promise<void> => {
                if (!success) {
                    this.config.getSettings().fahrenheit = !event;
                }

                await firstValueFrom(this.tccdbus.dbusAvailable);
                this.config.updateConfigData();
                
                this.temperatureDisplayFahrenheit = this.config?.getSettings()?.fahrenheit ?? false;

                this.utils.pageDisabled = false;
            });
        })
    }

    public async onFanControlEnabledChanged(event: MatCheckboxChange): Promise<void> {
        await this.mutex.runExclusive(async (): Promise<void> => {
            this.utils.pageDisabled = true;

            this.config.getSettings().fanControlEnabled = event.checked;

            this.config.saveSettings().then(async (success: boolean): Promise<void> => {
                if (!success) {
                    this.config.getSettings().fanControlEnabled = !event.checked;
                }

                await firstValueFrom(this.tccdbus.dbusAvailable);
                this.config.updateConfigData();
                
                this.fanControlEnabled = this.config.getSettings().fanControlEnabled;

                this.utils.pageDisabled = false;
            });
        })
    }

    public async onKeyboardBacklightControlEnabledChanged(event: MatCheckboxChange): Promise<void> {
        await this.mutex.runExclusive(async (): Promise<void> => {
            this.utils.pageDisabled = true;

            this.config.getSettings().keyboardBacklightControlEnabled = event.checked;

            this.config.saveSettings().then(async (success: boolean): Promise<void> => {
                if (!success) {
                    this.config.getSettings().keyboardBacklightControlEnabled = !event.checked;
                }

                await firstValueFrom(this.tccdbus.dbusAvailable);
                this.config.updateConfigData();
                
                this.keyboardBacklightControlEnabled = this.config.getSettings().keyboardBacklightControlEnabled;

                this.utils.pageDisabled = false;
            });
        })
    }

    public async onYCbCr420WorkaroundChanged(event: MatCheckboxChange, card: number, port: string): Promise<void> {
        await this.mutex.runExclusive(async (): Promise<void> => {
            if (this.config.getSettings().ycbcr420Workaround?.length > card && port in this.config.getSettings().ycbcr420Workaround[card]) {
                this.utils.pageDisabled = true;

                this.config.getSettings().ycbcr420Workaround[card][port] = event.checked;

                this.config.saveSettings().then(async (success: boolean): Promise<void> => {
                    if (!success) {
                        this.config.getSettings().ycbcr420Workaround[card][port] = !event.checked;
                        this.ycbcr420Workaround[card][port] = !event.checked;
                    }

                    await firstValueFrom(this.tccdbus.dbusAvailable);
                    this.config.updateConfigData();
                    
                    this.ycbcr420Workaround[card][port] = this.config.getSettings().ycbcr420Workaround[card][port];

                    this.utils.pageDisabled = false;
                });
            }
        })
    }

    public async onBrightnessModeCtrlChange(): Promise<void> {
        await this.utils.setBrightnessMode(this.ctrlBrightnessMode.value);
    }

    public gotoComponent(component: string): void {
        this.router.navigate([component], { relativeTo: this.route.parent });
    }

    public onPrimeStateChanged(newPrimeState: string): void {
        this.primeState = newPrimeState;
    }

    public isDGpuAvailable(): boolean {
        return window.power.isDGpuAvailable();
    }

    public isIGpuAvailable(): boolean {
        return window.power.isIGpuAvailable();
    }
    
    public async openExternalUrl(url: string): Promise<void> {
        await this.utils.openExternal(url);
    }
}