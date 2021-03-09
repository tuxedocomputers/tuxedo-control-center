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
    selector: 'app-shutdown-timer',
    templateUrl: './shutdown-timer.component.html',
    styleUrls: ['./shutdown-timer.component.scss']
})
export class ShutdownTimerComponent implements OnInit {

    public hours: Array<number> = [...Array(24).keys()];
    public minutes: Array<number> = [...Array(60).keys()];

    public selectedHour: number = null;
    public selectedMinute: number = null;

    public shutdownTime: Date;

    constructor(private config: ConfigService) { }

    ngOnInit() {
        let savedShutdown = this.config.getSettings().shutdownTime;
        if (savedShutdown != null) {
            let convertDatetime = new Date(savedShutdown);
            this.selectedHour = convertDatetime.getHours();
            this.selectedMinute = convertDatetime.getMinutes();
            this.shutdownTime = convertDatetime;
        }
    }

    public saveTime() {
        console.log(`selectedHour: ${this.selectedHour}`);
        console.log(`selectedHour: ${this.selectedMinute}`);

        this.shutdownTime = new Date();
        this.shutdownTime.setMilliseconds(0);
        this.shutdownTime.setSeconds(0);
        this.shutdownTime.setHours(this.selectedHour);
        this.shutdownTime.setMinutes(this.selectedMinute);
        if (this.shutdownTime < new Date()) {
            this.shutdownTime.setDate(this.shutdownTime.getDate() + 1)
        }

        console.log(this.shutdownTime.toISOString());
        this.config.getSettings().shutdownTime = this.shutdownTime.toISOString();
        this.config.saveSettings();
    }

    public deleteTimer() {
        this.shutdownTime = null;

        this.config.getSettings().shutdownTime = null;
        this.config.saveSettings();
    }
}
