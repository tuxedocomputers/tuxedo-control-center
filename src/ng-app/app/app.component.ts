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

import { Component, HostBinding, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { fromEvent, Subscription } from 'rxjs';
import { UtilsService } from './utils.service';
import { ActivatedRoute } from '@angular/router';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss'],
    standalone: false
})
export class AppComponent implements OnInit, OnDestroy {

    @HostBinding('class') componentThemeCssClass;

    private subscriptions: Subscription = new Subscription();

    constructor(
        private utils: UtilsService,
    ) {}

    ngOnInit(): void {
        this.subscriptions.add(this.utils.themeClass.subscribe((themeClassName: string): void => { this.componentThemeCssClass = themeClassName; }));

        // Register light/dark update from main process
        window.ipc.onUpdateBrightnessMode(async (): Promise<void> => {
            this.utils.updateBrightnessMode();
          });
        // Trigger manual update for initial state
        this.utils.updateBrightnessMode();
    }

    ngOnDestroy(): void {
        this.subscriptions.unsubscribe();
    }

    public pageDisabled(): boolean {
        return this.utils.pageDisabled;
    }
}
