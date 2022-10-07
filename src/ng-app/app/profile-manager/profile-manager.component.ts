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
import { Component, OnInit, ViewChild, OnDestroy } from '@angular/core';
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

    viewDetails: boolean = false;

    @ViewChild('inputFocus', { static: false }) inputFocus: MatInput;

    public buttonCopy: ProfileManagerButton;
    public buttonEdit: ProfileManagerButton;
    public buttonNew: ProfileManagerButton;
    public buttonDelete: ProfileManagerButton;

    private profileIdToCopy: string = "";

    constructor(
        private route: ActivatedRoute,
        private config: ConfigService,
        private state: StateService,
        private utils: UtilsService,
        private router: Router,
        private electron: ElectronService) { }

    ngOnInit() {
        this.defineButtons();

        this.route.params.subscribe(async params => {
            this.inputActive = false;
            if (params.profileId) {
                this.currentProfile = this.config.getProfileById(params.profileId);

                // If not yet available, attempt to wait shortly to see if it appears
                let nrTries = 0;
                while (this.currentProfile === undefined && nrTries < 10) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                    this.currentProfile = this.config.getProfileById(params.profileId);
                }

                if (this.currentProfile === undefined) {
                    this.config.setCurrentEditingProfile(undefined);
                    this.router.navigate(['profile-manager'], { relativeTo: this.route.parent });
                } else if (this.config.getCustomProfileById(this.currentProfile.id) !== undefined) {
                    this.config.setCurrentEditingProfile(this.currentProfile.id);
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

    public isProfileActive(profileId: string): boolean {
        return this.state.getActiveProfile().id === profileId;
    }

    public isProfileUsed(profileId: string): boolean {
        return this.state.getProfileStates(profileId).length > 0;
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
                return Object.values(this.config.getSettings().stateMap).includes(profile.id);
            });
        } else {
            return [];
        }
    }

    public selectProfile(profileId?: string): void {
        setImmediate(() => {
            if (profileId === undefined) {
                this.router.navigate(['profile-manager'], { relativeTo: this.route.parent });
            } else {
                this.router.navigate(['profile-manager', profileId], { relativeTo: this.route.parent });
            }
        });
    }

    public setActiveProfile(profileId: string, stateId: string): void {
        setImmediate(() => {
            this.config.setActiveProfile(profileId, stateId);
        });
    }

    public async onInputSubmit() {
        let newProfileId;

        if (this.inputProfileName.valid) {
            switch (this.currentInputMode) {
                case InputMode.New:
                    this.utils.pageDisabled = true;
                    newProfileId = await this.config.copyProfile(undefined, this.inputProfileName.value);
                    if (newProfileId !== undefined) {
                        this.inputActive = false;
                        await this.router.navigate(['profile-manager', newProfileId], { relativeTo: this.route.parent });
                    }
                    this.utils.pageDisabled = false;
                    break;
                case InputMode.Copy:
                    this.utils.pageDisabled = true;
                    newProfileId = await this.config.copyProfile(this.profileIdToCopy, this.inputProfileName.value);
                    if (newProfileId !== undefined) {
                        this.inputActive = false;
                        await this.router.navigate(['profile-manager', newProfileId], { relativeTo: this.route.parent });
                    }
                    this.utils.pageDisabled = false;
                    break;
                case InputMode.Edit:
                    // TODO: Check if used. Probably old edit name. If needed adjust for ID. If not delete.
                    if (this.config.setCurrentEditingProfile(this.currentProfile.id)) {
                        this.config.getCurrentEditingProfile().name = this.inputProfileName.value;
                        if (this.config.writeCurrentEditingProfile()) {
                            this.inputActive = false;
                            this.router.navigate(['profile-manager', this.inputProfileName.value], { relativeTo: this.route.parent });
                        }
                    }
                    break;
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

    public deleteProfile(profileId): void {
        this.config.deleteCustomProfile(profileId).then((success => {
            if (success) {
                this.router.navigate(['profile-manager'], { relativeTo: this.route.parent });
            }
        }));
    }

    public isCustomProfile(): boolean {
        return this.config.getCustomProfiles().find(profile => profile.id === this.currentProfile.id) !== undefined;
    }

    public isUsedProfile(): boolean {
        return Object.values(this.config.getSettings().stateMap).includes(this.currentProfile.id);
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

    public copyProfile(profileId: string) {
        this.profileIdToCopy = profileId;

        this.currentInputMode = InputMode.Copy;
        this.inputProfileName.setValue('');
        this.inputProfileNameLabel = $localize `:@@cProfMgrCopyProfileLabel:Copy this profile`;
        this.inputActive = true;
        setImmediate(() => { this.inputFocus.focus(); });
    }

    public cancelInput() {
        this.inputActive = false;
        this.profileIdToCopy = "";
    }

    public profileNameExist(profileName: string) {
        return this.getAllProfiles().find(p => p.name === profileName) !== undefined;
    }
}
