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

    public cpuSettingsEnabled: boolean;
    public fanControlEnabled: boolean;

    constructor(private config: ConfigService) { }

    ngOnInit() {
        this.cpuSettingsEnabled = this.config.getSettings().cpuSettingsEnabled;
        this.fanControlEnabled = this.config.getSettings().fanControlEnabled;
    }

    onCPUSettingsEnabledChanged(event: any) {
        let checked = event.checked;

        this.config.getSettings().cpuSettingsEnabled = checked;

        this.config.saveSettings().then(success => {
            if (!success) {
                this.config.getSettings().cpuSettingsEnabled = !checked;
            }
            this.cpuSettingsEnabled = this.config.getSettings().cpuSettingsEnabled;
        });
    }

    onFanControlEnabledChanged(event: any) {
        let checked = event.checked;

        this.config.getSettings().fanControlEnabled = checked;
        
        this.config.saveSettings().then(success => {
            if (!success) {
                this.config.getSettings().fanControlEnabled = !checked;
            }
            this.fanControlEnabled = this.config.getSettings().fanControlEnabled;
        });
    }
}