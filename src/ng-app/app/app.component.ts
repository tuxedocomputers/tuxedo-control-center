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
import { Component, HostBinding, OnInit, OnDestroy, ChangeDetectorRef, AfterContentChecked, inject, NgZone } from '@angular/core';
import { ElectronService } from './electron.service';
import { Subscription } from 'rxjs';
import { UtilsService } from './utils.service';
import { ActivatedRoute } from '@angular/router';
import { SharedModule } from './shared/shared.module';

@Component({
  standalone: true,
  imports: [SharedModule], 
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss'],
    
})
export class AppComponent implements OnInit, OnDestroy, AfterContentChecked {
    private utils = inject(UtilsService);
    private electron = inject(ElectronService);
    private cdref = inject(ChangeDetectorRef);
    private ngZone = inject(NgZone);


    @HostBinding('class') componentThemeCssClass;

    private subscriptions: Subscription = new Subscription();

    // Store IPC listener reference for cleanup
    private brightnessUpdateListener: ((event: any, ...args: any[]) => void) | null = null;


    ngOnInit(): void {
        this.subscriptions.add(this.utils.themeClass.subscribe(themeClassName => { this.componentThemeCssClass = themeClassName; }));

        // Register light/dark update from main process using direct IPC listener
        if (this.electron.ipcRenderer) {
            this.brightnessUpdateListener = (_event: any) => {
                // Run inside Angular zone to ensure change detection
                this.ngZone.run(() => {
                    this.utils.updateBrightnessMode();
                });
            };
            this.electron.ipcRenderer.on('update-brightness-mode', this.brightnessUpdateListener);
        }

        // Trigger manual update for initial state
        this.utils.updateBrightnessMode();
    }

    ngAfterContentChecked() {
        this.cdref.detectChanges();
    }

    ngOnDestroy(): void {
        this.subscriptions.unsubscribe();
        // Clean up IPC listener
        if (this.electron.ipcRenderer && this.brightnessUpdateListener) {
            this.electron.ipcRenderer.removeListener('update-brightness-mode', this.brightnessUpdateListener);
        }
    }

    public pageDisabled(): boolean {
        return this.utils.pageDisabled;
    }
}
