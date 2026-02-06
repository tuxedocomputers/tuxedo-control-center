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
import { Component, HostListener, OnInit, OnDestroy, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from "@angular/material/dialog";
import { ITccProfile } from 'src/common/models/TccProfile';
import { UntypedFormControl, Validators } from '@angular/forms';
import { UtilsService } from '../utils.service';
import { IGeneralCPUInfo , SysFsService } from '../sys-fs.service';
import { Subscription } from 'rxjs';
import { CompatibilityService } from '../compatibility.service';
import { SharedModule } from '../shared/shared.module';
export interface IProfileConflictDialogResult {
    action: string;
    newName: string;
}
@Component({
  standalone: true,
  imports: [SharedModule], 
    selector: 'app-profile-conflict-dialog',
    templateUrl: './profile-conflict-dialog.component.html',
    styleUrls: ['./profile-conflict-dialog.component.scss'],
    
})


export class ProfileConflictComponent implements OnInit, OnDestroy {
    data = inject<{
    oldProfile: ITccProfile;
    newProfile: ITccProfile;
}>(MAT_DIALOG_DATA);
    private mdDialogRef = inject<MatDialogRef<ProfileConflictComponent>>(MatDialogRef);
    compat = inject(CompatibilityService);
    private utils = inject(UtilsService);
    private sysfs = inject(SysFsService);


    public variable;
    public rename = false;
    public inputNewProfileName: UntypedFormControl = new UntypedFormControl('', [Validators.required, Validators.minLength(1), Validators.maxLength(50)]);
    
    public cpuInfo: IGeneralCPUInfo;
    private subscriptions: Subscription = new Subscription();

    constructor() 
    {
        const mdDialogRef = this.mdDialogRef;
 
        mdDialogRef.disableClose = true;
    }

    ngOnInit() 
    {
        this.subscriptions.add(this.sysfs.generalCpuInfo.subscribe(cpuInfo => { this.cpuInfo = cpuInfo; }));
     }

    ngOnDestroy() {
        this.subscriptions.unsubscribe();
    }
    
    // we need those two functions to properly display the overview tiles 
    // for now they are dublicates of the ones in profile-overview-tile
    // maybe in the future we will put them in a more centralized spot
    public get hasMaxFreqWorkaround() { return this.compat.hasMissingMaxFreqBoostWorkaround; }
    
    public formatCpuFrequency(frequency: number): string {
        return this.utils.formatCpuFrequency(frequency);
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
        const newname = this.inputNewProfileName.value; 
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