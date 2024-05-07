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
import { ITccProfile } from '../../../common/models/TccProfile';
import { ProfileStates } from '../../../common/models/TccSettings';
import { CompatibilityService } from '../compatibility.service';
import { IStateInfo, StateService } from '../state.service';
import { UtilsService } from '../utils.service';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';

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
        this.state.initializeProfileNames()

        if (!this.dataLoaded) {
            // We need a blocking dialog box here or everything goes to hell.
            var result = confirm($localize `:@@msgboxMessageServiceUnavailable:Communication with tccd service is unavailable, please restart service and try again.`);
            this.utils.quit();
        }
    }

    public ngOnDestroy(): void {
        this.subscriptions.unsubscribe();
    }

    public buttonExit(): void {
        this.utils.closeWindow();
    }

    public buttonMinimize(): void {
        this.utils.minimizeWindow();
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
        window.webcam.closeWebcamPreview();
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
    
    public getStateProfileName(state: IStateInfo): string {
        if (state.value === ProfileStates.AC) {
            return this.state.getCurrentChargingProfileName()
        }
        
        if (state.value === ProfileStates.BAT) {
            return this.state.getCurrentBatteryProfileName()
        }
    }

    public getProfileLink(state: IStateInfo): string {
        if (state.value === ProfileStates.AC) {
            return 'profile-manager/' + this.state.getCurrentChargingProfileId()
        }
        
        if (state.value === ProfileStates.BAT) {
            return 'profile-manager/' + this.state.getCurrentBatteryProfileId()
        }
    }
}
