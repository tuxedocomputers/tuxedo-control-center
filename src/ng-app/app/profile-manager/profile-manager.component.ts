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
import { Component, OnInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ConfigService } from '../config.service';
import { ITccProfile } from '../../../common/models/TccProfile';
import { UtilsService } from '../utils.service';
import { FormControl, Validators } from '@angular/forms';
import { MatInput } from '@angular/material/input';
import { ElectronService } from 'ngx-electron';
import { StateService, IStateInfo } from '../state.service';
import { Subscription } from 'rxjs';
import { ITccSettings } from '../../../common/models/TccSettings';

enum InputMode {
    New, Copy, Edit
}

class ProfileManagerButton {
    constructor(
        public show: () => boolean,
        public disable: () => boolean,
        public click: () => void,
        public label: () => string,
        public tooltip: () => string) { }
}

@Component({
    selector: 'app-profile-manager',
    templateUrl: './profile-manager.component.html',
    styleUrls: ['./profile-manager.component.scss']
})
export class ProfileManagerComponent implements OnInit, OnDestroy {

    public currentProfile: ITccProfile;

    public inputActive = false;
    public currentInputMode: InputMode;
    public inputProfileName: FormControl = new FormControl('', [Validators.required, Validators.minLength(1), Validators.maxLength(50)]);
    public inputProfileNameLabel: string;

    private subscriptions: Subscription = new Subscription();

    public stateInputArray: IStateInfo[];

    public inputProfileFilter = 'all';

    @ViewChild('inputFocus') inputFocus: MatInput;

    public buttonCopy: ProfileManagerButton;
    public buttonEdit: ProfileManagerButton;
    public buttonNew: ProfileManagerButton;
    public buttonDelete: ProfileManagerButton;

    private profileToCopy: string = "";

    constructor(
        private route: ActivatedRoute,
        private config: ConfigService,
        private state: StateService,
        private utils: UtilsService,
        private router: Router,
        private electron: ElectronService) { }

    ngOnInit() {
        this.defineButtons();

        this.route.params.subscribe(params => {
            this.inputActive = false;
            if (params.profileName) {
                this.currentProfile = this.config.getProfileByName(params.profileName);
                if (this.currentProfile === undefined) {
                    this.config.setCurrentEditingProfile(undefined);
                    this.router.navigate(['profile-manager'], { relativeTo: this.route.parent });
                } else if (this.config.getCustomProfileByName(this.currentProfile.name) !== undefined) {
                    this.config.setCurrentEditingProfile(this.currentProfile.name);
                } else {
                    this.config.setCurrentEditingProfile(undefined);
                }
            } else {
                this.config.setCurrentEditingProfile(undefined);
                this.router.navigate(['profile-manager'], { relativeTo: this.route.parent });
            }
        });

        this.stateInputArray = this.state.getStateInputs();
    }

    ngOnDestroy() {
        this.subscriptions.unsubscribe();
    }

    public isProfileActive(profileName: string): boolean {
        return this.state.getActiveProfile().name === profileName;
    }

    public isProfileUsed(profileName: string): boolean {
        return this.state.getProfileStates(profileName).length > 0;
    }

    public getSettings(): ITccSettings {
        return this.config.getSettings();
    }

    public getAllProfiles(): ITccProfile[] {
        return this.config.getAllProfiles();
    }

    public getProfilesForList(): ITccProfile[] {
        if (this.inputProfileFilter === 'all') {
            return this.config.getAllProfiles();
        } else if (this.inputProfileFilter === 'default') {
            return this.config.getDefaultProfiles();
        } else if (this.inputProfileFilter === 'custom') {
            return this.config.getCustomProfiles();
        } else if (this.inputProfileFilter === 'used') {
            return this.config.getAllProfiles().filter(profile => {
                return Object.values(this.config.getSettings().stateMap).includes(profile.name);
            });
        } else {
            return [];
        }
    }

    public selectProfile(profileName?: string): void {
        setImmediate(() => {
            if (profileName === undefined) {
                this.router.navigate(['profile-manager'], { relativeTo: this.route.parent });
            } else {
                this.router.navigate(['profile-manager', profileName], { relativeTo: this.route.parent });
            }
        });
    }

    public setActiveProfile(profileName: string, stateId: string): void {
        setImmediate(() => {
            this.config.setActiveProfile(profileName, stateId);
        });
    }

    public onInputSubmit(): void {
        if (this.inputProfileName.valid) {
            switch (this.currentInputMode) {
                case InputMode.New:
                    if (this.config.copyProfile('Default', this.inputProfileName.value)) {
                        this.inputActive = false;
                        this.router.navigate(['profile-manager', this.inputProfileName.value], { relativeTo: this.route.parent });
                    }
                    break;
                case InputMode.Copy:
                    // if (this.config.copyProfile(this.currentProfile.name, this.inputProfileName.value)) {
                    if (this.config.copyProfile(this.profileToCopy, this.inputProfileName.value)) {
                        this.inputActive = false;
                        this.router.navigate(['profile-manager', this.inputProfileName.value], { relativeTo: this.route.parent });
                    }
                    break;
                case InputMode.Edit:
                    if (this.config.setCurrentEditingProfile(this.currentProfile.name)) {
                        this.config.getCurrentEditingProfile().name = this.inputProfileName.value;
                        if (this.config.writeCurrentEditingProfile()) {
                            this.inputActive = false;
                            this.router.navigate(['profile-manager', this.inputProfileName.value], { relativeTo: this.route.parent });
                        }
                        break;
                    }
            }
        } else {
            const choice = this.electron.remote.dialog.showMessageBox(
                this.electron.remote.getCurrentWindow(),
                {
                    title: $localize `:@@cProfMgrInvalidNameTitle:Invalid input`,
                    message: $localize `:@@cProfMgrInvalidNameMessage:A name for the profile is required`,
                    type: 'info',
                    buttons: ['ok']
                }
            );
        }
    }

    public deleteProfile(profileName): void {
        if (this.config.deleteCustomProfile(profileName)) {
            this.router.navigate(['profile-manager'], { relativeTo: this.route.parent });
        }
    }

    public isCustomProfile(): boolean {
        return this.config.getCustomProfiles().find(profile => profile.name === this.currentProfile.name) !== undefined;
    }

    public isUsedProfile(): boolean {
        return Object.values(this.config.getSettings().stateMap).includes(this.currentProfile.name);
    }

    public formatFrequency(frequency: number): string {
        return this.utils.formatFrequency(frequency);
    }

    public defineButtons(): void {
        this.buttonNew = new ProfileManagerButton(
            // Show
            () => true,
            // Disable
            () => false,
            // Click
            () => {
                this.currentInputMode = InputMode.New;
                this.inputProfileName.setValue('');
                this.inputProfileNameLabel = $localize `:@@cProfMgrNewProfileLabel:New profile`;
                this.inputActive = true;
                setImmediate(() => { this.inputFocus.focus(); });
            },
            // Label
            () => '',
            // Tooltip
            () => $localize `:@@cProfMgrNewButtonTooltip:Create a new profile with default settings`,
        );
    }

    public copyProfile(profileName: string) {
        this.profileToCopy = profileName;

        this.currentInputMode = InputMode.Copy;
        this.inputProfileName.setValue('');
        this.inputProfileNameLabel = $localize `:@@cProfMgrCopyProfileLabel:Copy this profile`;
        this.inputActive = true;
        setImmediate(() => { this.inputFocus.focus(); });
    }

    public cancelInput() {
        this.inputActive = false;
        this.profileToCopy = "";
    }

    public profileNameExist(profileName: string) {
        return this.getAllProfiles().find(p => p.name === profileName) !== undefined;
    }
}
