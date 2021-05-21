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

import { Component, OnInit } from '@angular/core';
import { ConfigService } from '../config.service';
import { UtilsService } from '../utils.service';

@Component({
    selector: 'app-global-settings',
    templateUrl: './global-settings.component.html',
    styleUrls: ['./global-settings.component.scss']
})
export class GlobalSettingsComponent implements OnInit {
    public gridParams = {
        cols: 9,
        headerSpan: 4,
        valueSpan: 2,
        inputSpan: 3
    };

    public cpuSettingsEnabled: boolean = true;
    public fanControlEnabled: boolean = true;
    public ycbcr420Workaround: boolean = false;

    constructor(
        private config: ConfigService,
        private utils: UtilsService
    ) { }

    ngOnInit() {
        this.cpuSettingsEnabled = this.config.getSettings().cpuSettingsEnabled;
        this.fanControlEnabled = this.config.getSettings().fanControlEnabled;
        this.ycbcr420Workaround = this.config.getSettings().ycbcr420Workaround[0]["eDP-1"];
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

    onYCbCr420WorkaroundChanged(event: any) {
        this.utils.pageDisabled = true;

        for (let card of this.config.getSettings().ycbcr420Workaround) {
            for (let port in card) {
                card[port] = event.checked;
            }
        }
        
        this.config.saveSettings().then(success => {
            if (!success) {
                for (let card of this.config.getSettings().ycbcr420Workaround) {
                    for (let port in card) {
                        card[port] = !event.checked;
                    }
                }
                this.ycbcr420Workaround = !event.checked;
            }
            else {
                this.ycbcr420Workaround = event.checked;
            }

            this.utils.pageDisabled = false;
        });
    }
}
