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
import { Component, OnDestroy, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import { ElectronService } from 'ngx-electron';
import { Subscription } from 'rxjs';
import { ITccProfile } from '../../../common/models/TccProfile';
import { ITccSettings } from '../../../common/models/TccSettings';
import { CompatibilityService } from '../compatibility.service';
import { ConfigService } from '../config.service';
import { IStateInfo, StateService } from '../state.service';
import { UtilsService } from '../utils.service';

@Component({
  selector: 'app-main-gui',
  templateUrl: './main-gui.component.html',
  styleUrls: ['./main-gui.component.scss'],
  encapsulation: ViewEncapsulation.None // allows CSS overriding
})
export class MainGuiComponent implements OnInit, OnDestroy {

    public profileSelect: string;
    public activeProfileName: string;

    private subscriptions: Subscription = new Subscription();

    public useTCCTitleBar = false;

    constructor(
        private electron: ElectronService,
        private config: ConfigService,
        private state: StateService,
        private utils: UtilsService,
        public compat: CompatibilityService) { }

    public buttonLanguageLabel: string;

    public ngOnInit(): void {

        this.updateLanguageName();
        this.getSettings();
        // this.subscriptions.add(this.config.observeSettings.subscribe(newSettings => { this.getSettings(); }));
        this.subscriptions.add(this.state.activeProfile.subscribe(activeProfile => { this.getSettings(); }));

        // Wait for the first true/false availability announcement, undefined is ignored
        const availabilitySubscription = this.compat.tccDbusAvailable.subscribe(available => {
          if (available === true) {
            availabilitySubscription.unsubscribe();
          } else if (available === false) {
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
        });
        this.subscriptions.add(availabilitySubscription);
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

    //old version with only two languages
    /*
    public buttonToggleLanguage() {
        this.utils.changeLanguage(this.utils.getLanguagesMenuArray().find(lang => lang.id !== this.utils.getCurrentLanguageId()).id);
        this.updateLanguageName();
    }
    */

    public buttonCycleLanguage():void  {
        let curLangIndex: number = this.utils.getLanguagesMenuArray().findIndex(lang => lang.id === this.utils.getCurrentLanguageId())
        let newLangIndex: number = (curLangIndex + 1) % this.utils.getLanguagesMenuArray().length
        let newLangID: string = this.utils.getLanguagesMenuArray()[newLangIndex].id
        this.utils.changeLanguage(newLangID);
        this.updateLanguageName();
    }

    // this allows the "mat-select" language list to open while using the existing UI as a trigger, instead of the regular "mat-select-trigger"
    @ViewChild('selectLang') selectLang;
    openSelectLang() {
        this.selectLang.toggle();
    }

    //old version with only two languages
    /* 
    public updateLanguageName(): void {
        this.buttonLanguageLabel = this.utils.getLanguagesMenuArray().find(lang => lang.id !== this.utils.getCurrentLanguageId()).label;
    }
    */

    public updateLanguageName(): void {
        let curLangIndex: number = this.utils.getLanguagesMenuArray().findIndex(lang => lang.id === this.utils.getCurrentLanguageId())
        let nextLangIndex: number = (curLangIndex + 1) % this.utils.getLanguagesMenuArray().length
        let nextLangLabel: string = this.utils.getLanguagesMenuArray()[nextLangIndex].label
        this.buttonLanguageLabel = nextLangLabel;
    }

    public languageOptionDisabled(langId: string){
        return (this.utils.getCurrentLanguageId() === langId ? true : false);
    }

    public getStateInputs(): IStateInfo[] {
        return this.state.getStateInputs();
    }

    public getActiveProfile(): ITccProfile {
        return this.state.getActiveProfile();
    }

    public getStateProfileName(state: IStateInfo) {
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
}
