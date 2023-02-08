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
import { ChangeDetectionStrategy, Component, HostListener, Inject, Output, OnInit, OnDestroy } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from "@angular/material/dialog";
import { ITccProfile } from 'src/common/models/TccProfile';
import { FormControl, Validators } from '@angular/forms';
import { UtilsService } from '../utils.service';
import { IGeneralCPUInfo , SysFsService } from '../sys-fs.service';
import { Subscription } from 'rxjs';
import { CompatibilityService } from '../compatibility.service';
export interface IProfileConflictDialogResult {
    action: string;
    newName: string;
}
@Component({
    selector: 'profile-conflict-dialog',
    templateUrl: './profile-conflict-dialog.component.html',
    styleUrls: ['./profile-conflict-dialog.component.scss']
})


export class ProfileConflictComponent implements OnInit, OnDestroy {

    public variable;
    public rename = false;
    public inputNewProfileName: FormControl = new FormControl('', [Validators.required, Validators.minLength(1), Validators.maxLength(50)]);
    
    public cpuInfo: IGeneralCPUInfo;
    private subscriptions: Subscription = new Subscription();
    constructor(@Inject(MAT_DIALOG_DATA) public data: {
        oldProfile: ITccProfile,
        newProfile: ITccProfile
    },  private mdDialogRef: MatDialogRef<ProfileConflictComponent>, 
        public compat: CompatibilityService,
        private utils: UtilsService,
        private sysfs: SysFsService
        ) 
    { 
        mdDialogRef.disableClose = true;
    }

    ngOnInit() 
    {
        this.subscriptions.add(this.sysfs.generalCpuInfo.subscribe(cpuInfo => { this.cpuInfo = cpuInfo; }));
     }

    ngOnDestroy() { }
    
    // we need those two functions to properly display the overview tiles 
    // for now they are dublicates of the ones in profile-overview-tile
    // maybe in the future we will put them in a more centralized spot
    public get hasMaxFreqWorkaround() { return this.compat.hasMissingMaxFreqBoostWorkaround; }
    
    public formatFrequency(frequency: number): string {
        return this.utils.formatFrequency(frequency);
    }
    
    public cancel() 
    {
        this.close({action:"cancel",newName:""});
    }

    public close(result: IProfileConflictDialogResult) 
    {
        this.mdDialogRef.close(result);
    }

    public action(action: string)
    {
        let newname = this.inputNewProfileName.value; // TODO get from text input field
        this.close({action: action, newName: newname});
    }

    public async submitNewname() {
        if (this.inputNewProfileName.valid) 
        {
            this.action("newName");
        }
    }

    public profileNameExist(profileName: string) {
        return this.data.oldProfile.name === profileName;
    }

    public renameProfile()
    {
        this.rename = true;
    }

    public cancelRename()
    {
        this.rename = false;
    }

    @HostListener("keydown.esc") 
    public onEsc() 
    {
        this.cancel();
    }

}