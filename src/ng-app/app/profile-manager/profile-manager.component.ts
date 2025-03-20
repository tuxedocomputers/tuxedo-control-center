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

import { Component, OnInit, ViewChild, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ConfigService } from '../config.service';
import { ITccProfile } from '../../../common/models/TccProfile';
import { UtilsService } from '../utils.service';
import { FormControl, Validators } from '@angular/forms';
import { MatInput } from '@angular/material/input';
import { StateService, IStateInfo } from '../state.service';
import { Subscription } from 'rxjs';
import { ITccSettings } from '../../../common/models/TccSettings';
import { ProfileConflictDialogService } from "../profile-conflict-dialog/profile-conflict-dialog.service";
import { ConfirmDialogResult } from '../dialog-confirm/dialog-confirm.component';
import { IProfileConflictDialogResult } from '../profile-conflict-dialog/profile-conflict-dialog.component';


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
    styleUrls: ['./profile-manager.component.scss'],
    standalone: false
})
export class ProfileManagerComponent implements OnInit, OnDestroy {

    public currentProfile: ITccProfile;

    public inputActive: boolean = false;
    public currentInputMode: InputMode;
    public inputProfileName: FormControl = new FormControl('', [Validators.required, Validators.minLength(1), Validators.maxLength(50)]);
    public inputProfileNameLabel: string;
    private subscriptions: Subscription = new Subscription();

    public stateInputArray: IStateInfo[];

    public inputProfileFilter: string = 'all';

    public viewDetails: boolean = false;

    @ViewChild('inputFocus', { static: false }) public inputFocus: MatInput;

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
        private dialogService: ProfileConflictDialogService,
        ) { }


    public ngOnInit(): void {
        this.defineButtons();

        this.route.params.subscribe(async (params: any): Promise<void> => {
            this.inputActive = false;
            if (params.profileId) {
                this.currentProfile = this.config.getProfileById(params.profileId);

                // If not yet available, attempt to wait shortly to see if it appears
                const nrTries: number = 0;
                while (this.currentProfile === undefined && nrTries < 10) {
                    await new Promise<void>((resolve: () => void): NodeJS.Timeout => setTimeout(resolve, 100));
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

    public ngOnDestroy(): void {
        this.subscriptions.unsubscribe();
    }

    public isProfileActive(profileId: string): boolean {
        return this.state.getActiveProfile().id === profileId;
    }

    public isProfileUsed(profileId: string): boolean {
        return this.state.getProfileStates(profileId)?.length > 0;
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
            return this.config.getAllProfiles().filter((profile: ITccProfile): boolean => {
                return Object.values(this.config.getSettings().stateMap).includes(profile.id);
            });
        } else {
            return [];
        }
    }

    public selectProfile(profileId?: string): void {
        setTimeout((): void => {
            if (profileId === undefined) {
                this.router.navigate(['profile-manager'], { relativeTo: this.route.parent });
            } else {
                this.router.navigate(['profile-manager', profileId], { relativeTo: this.route.parent });
            }
        }, 0);
    }

    public setActiveProfile(profileId: string, stateId: string): void {
        setTimeout((): void => {
            this.config.setActiveProfile(profileId, stateId);
        }, 0);
    }

    public async onInputSubmit(): Promise<void> {
        let newProfileId: string;

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
            }
        }
    }


    public async exportProfiles(): Promise<void>
    {
        try{
            const documentsPath: string = await this.utils.getPath('documents');
            const res: string = await this.utils.saveFileDialog({defaultPath: documentsPath + "/TCC_Profiles_Backup_" + Date.now().toString() + ".json"});
            const profiles: ITccProfile[] = this.config.getCustomProfiles();
            const txt: string = JSON.stringify(profiles);
            await this.utils.writeTextFile("" + res, txt);
        }
        catch(err: unknown)
        {
            console.error("profile-manager: exportProfiles failed =>", err)
        }

    }


    public async importProfiles(): Promise<void>
    {
        this.utils.pageDisabled = true;
        const documentsPath: string = await this.utils.getPath('documents');
        const importLabel: string = $localize `:@@pMgrImportLabelFileDialoge:Import`;
        let res: string[];
        let txt: string;
        try
        {
            res = await this.utils.openFileDialog({ defaultPath: documentsPath, buttonLabel: importLabel, filters:[{name: "JSON Files", extensions: ["json"]} , { name: "All Files", extensions: ["*"] }], properties: ['openFile', 'multiSelections'] });
            txt = await this.utils.readTextFile(res[0] + "");
        }
        catch (err: unknown)
        {
            console.error("profile-manager: importProfiles readTextFile failed =>", err)
            this.utils.pageDisabled = false;
            return;
        }

        let profiles: ITccProfile[];
        try
        {
            profiles = JSON.parse(txt);
        }
        catch(err: unknown)
        {
            console.error("profile-manager: importProfiles parse failed =>", err)
            this.utils.pageDisabled = false;
            return;
        }
        const oldProfiles: ITccProfile[] = this.config.getCustomProfiles();
        let newProfiles: ITccProfile[] = [];
        for (var i: number = 0; i < profiles?.length; i++)
        {
            const conflictProfileIndex:number = oldProfiles.findIndex((x: ITccProfile): boolean => x.id === profiles[i].id);
            if (conflictProfileIndex !== -1)
            {
                const res: IProfileConflictDialogResult = await this.dialogService.openConflictModal(oldProfiles[conflictProfileIndex],profiles[i]);
                if(res.action === "keepNew")
                {
                    newProfiles = newProfiles.concat(profiles[i]);
                }
                else if (res.action === "keepOld") // basically same thing as cancel
                {
                    continue;
                }
                else if (res.action === "keepBoth")
                {
                    const newProfile: ITccProfile = profiles[i];
                    newProfile.id = "generateNewID";
                    newProfiles = newProfiles.concat(newProfile);
                }
                else if (res.action === "newName")
                {
                    const newProfile: ITccProfile = profiles[i];
                    newProfile.name = res.newName;
                    newProfile.id = "generateNewID";
                    newProfiles = newProfiles.concat(newProfile);
                }
            }
            else
            {
                newProfiles = newProfiles.concat(profiles[i]);
            }
        }
        if(newProfiles?.length > 0)
        {
            const importSuccess: boolean = await this.config.importProfiles(newProfiles);
            if (!importSuccess)
            {
                console.error("profile-manager: importing of Profiles failed =>")
            }
        }
        this.utils.pageDisabled = false;
    }





    public deleteProfile(profileId: string): void {
        this.config.deleteCustomProfile(profileId).then(((success: boolean): void => {
            if (success) {
                this.router.navigate(['profile-manager'], { relativeTo: this.route.parent });
            }
        }));
    }

    public isCustomProfile(): boolean {
        return this.config.getCustomProfiles().find((profile: ITccProfile): boolean => profile.id === this.currentProfile.id) !== undefined;
    }

    public isUsedProfile(): boolean {
        return Object.values(this.config.getSettings().stateMap).includes(this.currentProfile.id);
    }

    public formatCpuFrequency(frequency: number): string {
        return this.utils.formatCpuFrequency(frequency);
    }

    public defineButtons(): void {
        this.buttonNew = new ProfileManagerButton(
            // Show
            (): true => true,
            // Disable
            (): false => false,
            // Click
            (): void => {
                this.currentInputMode = InputMode.New;
                this.inputProfileName.setValue('');
                this.inputProfileNameLabel = $localize `:@@cProfMgrNewProfileLabel:New profile`;
                this.inputActive = true;
                setTimeout((): void => { this.inputFocus.focus(); },0);
            },
            // Label
            (): string => '',
            // Tooltip
            (): string => $localize `:@@cProfMgrNewButtonTooltip:Create a new profile with default settings`,
        );
    }

    public copyProfile(profileId: string): void {
        this.profileIdToCopy = profileId;

        this.currentInputMode = InputMode.Copy;
        this.inputProfileName.setValue('');
        this.inputProfileNameLabel = $localize `:@@cProfMgrCopyProfileLabel:Copy this profile`;
        this.inputActive = true;
        setTimeout((): void => { this.inputFocus.focus(); }, 0);
    }

    public cancelInput(): void {
        this.inputActive = false;
        this.profileIdToCopy = "";
    }

    public profileNameExist(profileName: string): boolean {
        return this.getAllProfiles().find((p: ITccProfile): boolean => p.name === profileName) !== undefined;
    }
}
