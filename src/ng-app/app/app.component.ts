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
import { Component, OnInit, OnDestroy, HostBinding, Input } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';

import { ElectronService } from 'ngx-electron';

import { TccPaths } from '../../common/classes/TccPaths';
import { ConfigHandler } from '../../common/classes/ConfigHandler';
import { ITccProfile } from '../../common/models/TccProfile';
import { ITccSettings } from '../../common/models/TccSettings';
import { environment } from '../environments/environment';
import { ConfigService } from './config.service';
import { StateService, IStateInfo } from './state.service';
import { UtilsService } from './utils.service';
import { CompatibilityService } from './compatibility.service';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { I18n } from '@ngx-translate/i18n-polyfill';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, OnDestroy {

    public profileSelect: string;
    public activeProfileName: string;

    private subscriptions: Subscription = new Subscription();

    constructor(
        private electron: ElectronService,
        private config: ConfigService,
        private state: StateService,
        private utils: UtilsService,
        private compat: CompatibilityService,
        private i18n: I18n) { }

    @HostBinding('class') componentThemeCssClass;

    public buttonLanguageLabel: string;

    public ngOnInit(): void {

        this.updateLanguageName();
        this.getSettings();
        // this.subscriptions.add(this.config.observeSettings.subscribe(newSettings => { this.getSettings(); }));
        this.subscriptions.add(this.state.activeProfileObserver.subscribe(activeProfile => { this.getSettings(); }));
        this.subscriptions.add(this.utils.themeClass.subscribe(themeClassName => { this.componentThemeCssClass = themeClassName; }));

        // Wait for the first true/false availability announcement, undefined is ignored
        const availabilitySubscription = this.compat.tccDbusAvailable.subscribe(available => {
          if (available === true) {
            availabilitySubscription.unsubscribe();
          } else if (available === false) {
            this.electron.remote.dialog.showMessageBox(
              this.electron.remote.getCurrentWindow(),
              {
                title: this.i18n({ value: 'Service unavailable' }),
                message: this.i18n({ value: 'Communication with tccd service is unavailable, please restart service and try again.' }),
                type: 'error',
                buttons: ['ok']
              }
            );
            this.electron.remote.getCurrentWindow().close();
          }
        });
        this.subscriptions.add(availabilitySubscription);
    }

    public ngOnDestroy(): void {
        this.subscriptions.unsubscribe();
    }

    public pageDisabled(): boolean {
        return this.utils.pageDisabled;
    }

    public buttonExit(): void {
        this.electron.remote.getCurrentWindow().close();
    }

    public buttonMinimize(): void {
        this.electron.remote.getCurrentWindow().minimize();
    }

    public getSettings(): ITccSettings {
        this.activeProfileName = this.state.getActiveProfile().name;
        return this.config.getSettings();
    }

    public changeLanguage(languageId: string) {
        if (languageId !== this.getCurrentLanguageId()) {
            this.utils.changeLanguage(languageId);
        }
    }

    public getCurrentLanguageId(): string {
        return this.utils.getCurrentLanguageId();
    }

    public getLanguagesMenuArray() {
        return this.utils.getLanguagesMenuArray();
    }

    public getLanguageData(langId: string) {
        return this.utils.getLanguageData(langId);
    }

    public buttonToggleTheme() {
        if (this.utils.getThemeClass() === 'light-theme') {
            this.utils.setThemeDark();
        } else {
            this.utils.setThemeLight();
        }
    }

    public buttonToggleLanguage() {
        this.utils.changeLanguage(this.utils.getLanguagesMenuArray().find(lang => lang.id !== this.utils.getCurrentLanguageId()).id);
        this.updateLanguageName();
    }

    public updateLanguageName(): void {
        this.buttonLanguageLabel = this.utils.getLanguagesMenuArray().find(lang => lang.id !== this.utils.getCurrentLanguageId()).label;
    }

    public getStateInputs(): IStateInfo[] {
        return this.state.getStateInputs();
    }

    public getActiveProfile(): ITccProfile {
        return this.state.getActiveProfile();
    }
}
