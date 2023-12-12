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
import { Component, OnDestroy, OnInit } from '@angular/core';
import { ElectronService } from 'ngx-electron';
import { Subscription } from 'rxjs';
import { ITccProfile } from '../../../common/models/TccProfile';
import { ITccSettings } from '../../../common/models/TccSettings';
import { CompatibilityService } from '../compatibility.service';
import { ConfigService } from '../config.service';
import { IStateInfo, StateService } from '../state.service';
import { UtilsService } from '../utils.service';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-main-gui',
  templateUrl: './main-gui.component.html',
  styleUrls: ['./main-gui.component.scss']
})
export class MainGuiComponent implements OnInit, OnDestroy {

    public profileSelect: string;
    public activeProfileName: string;

    private subscriptions: Subscription = new Subscription();

    public useTCCTitleBar = false;

    public dataLoaded: boolean;

    constructor(
        private electron: ElectronService,
        private config: ConfigService,
        private state: StateService,
        private utils: UtilsService,
        public compat: CompatibilityService,
        private route: ActivatedRoute,
        ) {
            const data = this.route.snapshot.data;
            this.dataLoaded = data.loaded === true;
        }

    public buttonLanguageLabel: string;

    public ngOnInit(): void {

        this.updateLanguageName();
        this.getSettings();
        // this.subscriptions.add(this.config.observeSettings.subscribe(newSettings => { this.getSettings(); }));
        this.subscriptions.add(this.state.activeProfile.subscribe(activeProfile => { this.getSettings(); }));

        if (!this.dataLoaded) {
            this.electron.remote.dialog.showMessageBox(
                this.electron.remote.getCurrentWindow(),
                {
                  title: $localize `:@@msgboxTitleServiceUnavailable:Service unavailable`,
                  message: $localize `:@@msgboxMessageServiceUnavailable:Communication with tccd service is unavailable, please restart service and try again.`,
                  type: 'error',
                  buttons: ['ok']
                }
              );
              this.electron.remote.getCurrentWindow().close();
        }
    }

    public ngOnDestroy(): void {
        this.subscriptions.unsubscribe();
    }

    public buttonExit(): void {
        this.electron.remote.getCurrentWindow().close();
    }

    public buttonMinimize(): void {
        this.electron.remote.getCurrentWindow().minimize();
    }

    public getSettings(): ITccSettings {
        if (this.state.getActiveProfile()) {
            this.activeProfileName = this.state.getActiveProfile().name;
        }
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

    public buttonToggleLanguage() {
        this.electron.ipcRenderer.send("close-webcam-preview");
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

    public getStateProfileName(state: IStateInfo) {
        if (!this.getSettings()) {
            return undefined
        }

        const stateProfileId = this.getSettings().stateMap[state.value];
        const defaultProfileName = this.utils.getDefaultProfileName(stateProfileId);
        if (defaultProfileName !== undefined) {
            return defaultProfileName;
        } else {
            const profile = this.config.getProfileById(stateProfileId);
            if (profile !== undefined) {
                return profile.name;
            } else {
                return undefined;
            }
        }
    }

    public getProfileLink(state: any) {
        if (!this.getSettings()) {
            return 'profile-manager/'
        }
        return 'profile-manager/' + this.getSettings()?.stateMap[state.value]
    }
}
