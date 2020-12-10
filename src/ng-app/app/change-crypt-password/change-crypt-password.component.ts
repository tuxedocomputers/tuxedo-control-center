// Copyright (c) 2019-2020 TUXEDO Computers GmbH <tux@tuxedocomputers.com>

// This file is part of TUXEDO Control Center.

// TUXEDO Control Center is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

// TUXEDO Control Center is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.

// You should have received a copy of the GNU General Public License
// along with TUXEDO Control Center.  If not, see <https://www.gnu.org/licenses/>.

import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { FormErrorStateMatcher } from 'src/ng-app/common/formErrorStateMatcher';
import { ElectronService } from 'ngx-electron';

import { DriveController } from "../../../common/classes/DriveController";
import { I18n } from '@ngx-translate/i18n-polyfill';

@Component({
    selector: 'app-change-crypt-password',
    templateUrl: './change-crypt-password.component.html',
    styleUrls: ['./change-crypt-password.component.scss']
})
export class ChangeCryptPasswordComponent implements OnInit {

    matcher = new FormErrorStateMatcher();

    buttonType = 'password';
    show_password_button_text = '';
    errortext_cryptsetup = '';
    errortext_cryptsetup_detail = '';
    crpyt_drives = [];
    work_process = false;

    passwordFormGroup: FormGroup = new FormGroup({
        cryptPassword: new FormControl('', [Validators.required, Validators.minLength(1), Validators.maxLength(50)]),
        newPassword: new FormControl('', [Validators.required, Validators.minLength(1), Validators.maxLength(50)]),
        confirmPassword: new FormControl('', [Validators.required, Validators.minLength(1), Validators.maxLength(50)])
    }, {validators: [this.confirmValidation]})

    constructor(private electron: ElectronService, private i18n: I18n) { }

    async ngOnInit() {
        this.crpyt_drives = (await DriveController.getDrivesWorkaround()).filter(x => x.crypt);
        this.work_process = false;

        this.buttonType = "password";
        this.show_password_button_text = this.i18n({ value: 'Show Password', id: 'cryptButtonShowPassword' });
    }

    showPassword() {
        console.log("Before text", this.buttonType);
        if (this.buttonType == "password") {
            this.buttonType = "text";
            this.show_password_button_text = this.i18n({ value: 'Hide Password', id: 'cryptButtonHidePassword' });
        }
        else {
            this.buttonType = "password";
            this.show_password_button_text = this.i18n({ value: 'Show Password', id: 'cryptButtonShowPassword' });
        }

        console.log("after text", this.buttonType);
    }

    async changePassword() {
        this.work_process = true;
        
        this.changeCryptPassword();

        this.work_process = false;
    }

    private changeCryptPassword() {
        if(!this.passwordFormGroup.valid) {
            this.errortext_cryptsetup = this.i18n({ value: 'Error at remove old Crypt Password', id: 'checkinputs' });
            this.errortext_cryptsetup_detail = '';

            return;
        }

        let oldPassword = this.passwordFormGroup.get("cryptPassword").value;
        let newPassword = this.passwordFormGroup.get("newPassword").value;

        for(let drive of this.crpyt_drives) {
            const result_set = this.electron.ipcRenderer.sendSync('exec-cmd-sync', `printf '%s\\n' '${oldPassword}' '${newPassword}' '${newPassword}' | pkexec /usr/sbin/cryptsetup -q luksAddKey --force-password ${drive.devPath}`);
            if(result_set.error === undefined) {
                this.errortext_cryptsetup = '';
                this.errortext_cryptsetup_detail = '';
            }
            else {
                this.errortext_cryptsetup = this.i18n({ value: 'Error at set new Crypt Password', id: 'errornewpassword' });
                this.errortext_cryptsetup_detail = result_set.error;
                return;
            }

            const result_remove = this.electron.ipcRenderer.sendSync('exec-cmd-sync', `printf '%s\\n' '${oldPassword}' | pkexec /usr/sbin/cryptsetup -q luksRemoveKey ${drive.devPath}`);
            console.log("result", result_remove);
            if(result_remove.error === undefined) {
                this.errortext_cryptsetup = '';
                this.errortext_cryptsetup_detail = '';
            }
            else {
                this.errortext_cryptsetup = this.i18n({ value: 'Error at remove old Crypt Password', id: 'erroroldpassword' });
                this.errortext_cryptsetup_detail = result_remove.error;
                return;
            }

            this.errortext_cryptsetup = this.i18n({ value: 'Finish - Crypt password was successfully changed', id: 'cryptfinishprocess' });
            this.errortext_cryptsetup_detail = '';
        }
    }

    confirmValidation(group: FormGroup) {
        let pass = group.get("newPassword").value;
        let confirmPass = group.get("confirmPassword").value;

        return pass === confirmPass ? null : { notSame: true }
    }
}