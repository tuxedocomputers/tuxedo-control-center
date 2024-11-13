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
import { UtilsService } from '../utils.service';
import { DriveController } from "../../../common/classes/DriveController";

@Component({
    selector: 'app-change-crypt-password',
    templateUrl: './change-crypt-password.component.html',
    styleUrls: ['./change-crypt-password.component.scss']
})
export class ChangeCryptPasswordComponent implements OnInit {
    matcher = new FormErrorStateMatcher();
    buttonType = 'password';
    show_password_button_text = '';
    successtext_cryptsetup = '';
    errortext_cryptsetup = '';
    crypt_drives = [];
    minLength = 1;
    maxLength = 512;

    passwordFormGroup: FormGroup;

    constructor(
        private utils: UtilsService
    ) { }

    async ngOnInit(): Promise<void> {
        this.passwordFormGroup = new FormGroup({
            cryptPassword: new FormControl('', [Validators.required, Validators.minLength(this.minLength), Validators.maxLength(this.maxLength)]),
            newPassword: new FormControl('', [Validators.required, Validators.minLength(this.minLength), Validators.maxLength(this.maxLength)]),
            confirmPassword: new FormControl('', [Validators.required, Validators.minLength(this.minLength), Validators.maxLength(this.maxLength)])
        }, { validators: [this.confirmValidation] })

        this.crypt_drives = (await DriveController.getDrives()).filter(x => x.crypt);

        this.buttonType = "password";
        this.show_password_button_text = $localize `:@@cryptButtonShowPassword:Show Passwords`;
    }

    showPassword() {
        if (this.buttonType == "password") {
            this.buttonType = "text";
            this.show_password_button_text = $localize `:@@cryptButtonHidePassword:Hide Passwords`;
        }
        else {
            this.buttonType = "password";
            this.show_password_button_text = $localize `:@@cryptButtonShowPassword:Show Passwords`;
        }
    }

    async changePassword() {
        this.utils.pageDisabled = true;
        this.changeCryptPassword().then((execStatus) => {
            if (execStatus) {
                this.passwordFormGroup.setValue({
                    cryptPassword: "",
                    newPassword: "",
                    confirmPassword: ""
                });

                // clearing error status, otherwise input fields are marked as errors after success
                this.passwordFormGroup.get("cryptPassword").setErrors(null);
                this.passwordFormGroup.get("newPassword").setErrors(null);
                this.passwordFormGroup.get("confirmPassword").setErrors(null);
            }

            this.utils.pageDisabled = false;
        });
    }

    private async changeCryptPassword() {
        let oldPassword = this.passwordFormGroup.get("cryptPassword").value;
        let newPassword = this.passwordFormGroup.get("newPassword").value;
        let confirmPassword = this.passwordFormGroup.get("confirmPassword").value;

        // Just to be sure that sane values are read to not brick the encryption when gui logic failed
        if (oldPassword === "" || newPassword === "" || newPassword !== confirmPassword) {
            return;
        }

        let oneliner = "";
        for (let drive of this.crypt_drives) {
            oneliner += `printf '%s\\n' '${oldPassword}' | /usr/sbin/cryptsetup open --type luks -q --test-passphrase ${drive.devPath} && `
        }
        for (let drive of this.crypt_drives) {
            oneliner += `printf '%s\\n' '${oldPassword}' '${newPassword}' '${confirmPassword}' | /usr/sbin/cryptsetup -q luksChangeKey --force-password ${drive.devPath} && `
        }
        oneliner = oneliner.slice(0, -4); // remove the tailing " && "

        return this.utils.execCmdAsync(`pkexec /bin/sh -c "` + oneliner + `"`).then(() => {
            this.successtext_cryptsetup = $localize `:@@cryptfinishprocess:Crypt password changed successfully`;
            this.errortext_cryptsetup = '';
            return true;
        }).catch(() => {
            this.successtext_cryptsetup = '';
            this.errortext_cryptsetup = $localize `:@@errornewpassword:Error: Could not change crypt password (wrong old crypt password?)`;
            return false;
        });
    }

    confirmValidation(group: FormGroup) {
        let pass = group.get("newPassword").value;
        let confirmPass = group.get("confirmPassword").value;

        return pass === confirmPass ? null : { notSame: true }
    }
}
