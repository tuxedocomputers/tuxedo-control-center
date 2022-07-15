/*!
 * Copyright (c) 2019-2022 TUXEDO Computers GmbH <tux@tuxedocomputers.com>
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
import { Component, HostBinding, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { UtilsService } from './utils.service';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, OnDestroy {

    @HostBinding('class') componentThemeCssClass;

    private subscriptions: Subscription = new Subscription();

    constructor(private utils: UtilsService) {}

    ngOnInit(): void {
        this.subscriptions.add(this.utils.themeClass.subscribe(themeClassName => { this.componentThemeCssClass = themeClassName; }));
    }

    ngOnDestroy(): void {
        this.subscriptions.unsubscribe();
    }

    public pageDisabled(): boolean {
        return this.utils.pageDisabled;
    }
}
