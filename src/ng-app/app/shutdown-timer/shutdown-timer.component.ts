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
import { UtilsService } from '../utils.service';

@Component({
    selector: 'app-shutdown-timer',
    templateUrl: './shutdown-timer.component.html',
    styleUrls: ['./shutdown-timer.component.scss']
})
export class ShutdownTimerComponent implements OnInit {
    public hours: Array<number> = [...Array(24).keys()];
    public minutes: Array<number> = [...Array(60).keys()];

    public selectedHour: number = 0;
    public selectedMinute: number = 0;

    public appliedTime: string = "";

    constructor(
        private utils: UtilsService
    ) { }

    ngOnInit() {
        this.updateTime();
    }

    public saveTime() {
        this.utils.pageDisabled = true;
        this.utils.execCmdAsync("pkexec shutdown -h " + this.selectedHour + ":" + this.selectedMinute).then(() => {
            this.updateTime();
            this.utils.pageDisabled = false;
        }).catch(() => {
            this.updateTime();
            this.utils.pageDisabled = false;
        });
    }

    public deleteTime() {
        this.utils.pageDisabled = true;
        this.utils.execCmdAsync("pkexec shutdown -c").then(() => {
            this.updateTime();
            this.utils.pageDisabled = false;
        }).catch(() => {
            this.updateTime();
            this.utils.pageDisabled = false;
        });
    }

    public updateTime() {
        this.utils.execCmdAsync("cat /run/systemd/shutdown/scheduled").then((result) => {
            let resultJSON = ('{"' + result.toString().replace(/\s+/g, '","').replace(/=/g, '":"') + '"}').replace(/.""}/g, '}');
            let resultDate = new Date(parseInt(JSON.parse(resultJSON).USEC) / 1000);
            this.appliedTime = resultDate.getHours().toString().padStart(2, "0") + ":" + resultDate.getMinutes().toString().padStart(2, "0");
        }).catch(() => {
            this.appliedTime = ""
        });
    }
}