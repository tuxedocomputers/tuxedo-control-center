/*!
 * Copyright (c) 2019-2026 TUXEDO Computers GmbH <tux@tuxedocomputers.com>
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
// biome-ignore lint: injection token
import { UtilsService } from '../utils.service';

@Component({
    selector: 'app-shutdown-timer',
    templateUrl: './shutdown-timer.component.html',
    styleUrls: ['./shutdown-timer.component.scss'],
    standalone: false,
})
export class ShutdownTimerComponent implements OnInit {
    public hours: Array<number> = [...Array(24).keys()];
    public minutes: Array<number> = [...Array(60).keys()];

    public selectedHour: number = 0;
    public selectedMinute: number = 0;

    public appliedTime: string = '';

    constructor(private utils: UtilsService) {}

    public ngOnInit(): void {
        this.updateTime();
    }

    public async saveTime(): Promise<void> {
        this.utils.pageDisabled = true;
        await window.ipc.setShutdownTime(this.selectedHour, this.selectedMinute);
        await this.updateTime();
        this.utils.pageDisabled = false;
    }

    public async deleteTime(): Promise<void> {
        this.utils.pageDisabled = true;
        window.ipc.cancelShutdown().then((): void => {
            this.updateTime();
            this.utils.pageDisabled = false;
        });
    }

    public async updateTime(): Promise<void> {
        const result: string = await window.ipc.getScheduledShutdown();
        try {
            if (result) {
                const resultJSON: string =
                    `{"${result.toString().replace(/\s+/g, '","').replace(/=/g, '":"')}"}`.replace(/.""}/g, '}');
                const resultDate: Date = new Date(Number.parseInt(JSON.parse(resultJSON).USEC) / 1000);
                this.appliedTime = `${resultDate.getHours().toString().padStart(2, '0')}:${resultDate.getMinutes().toString().padStart(2, '0')}`;
            }
            if (!result) {
                console.log('shutdown-timer: updateTime: getScheduledShutdown() did not return data');
            }
        } catch (err: unknown) {
            console.error(`shutdown-timer: updateTime failed => ${err}`);
            this.appliedTime = '';
        }
    }
}
