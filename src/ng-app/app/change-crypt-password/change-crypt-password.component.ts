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

import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { FormErrorStateMatcher } from 'src/ng-app/common/formErrorStateMatcher';
import { UtilsService } from '../utils.service';
import { IDrive } from "../../../common/models/IDrive";

@Component({
    selector: 'app-change-crypt-password',
    templateUrl: './change-crypt-password.component.html',
    styleUrls: ['./change-crypt-password.component.scss'],
    standalone: false
})
export class ChangeCryptPasswordComponent implements OnInit {
    matcher: FormErrorStateMatcher = new FormErrorStateMatcher();
    buttonType: string = 'password';
    show_password_button_text: string = '';
    successtext_cryptsetup: string = '';
    errortext_cryptsetup: string = '';
    crypt_drives: IDrive[] = [];
    minLength: number = 1;
    maxLength: number = 512;

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

        this.crypt_drives = (await window.driveController.getDrives()).filter((x: IDrive): boolean => x.crypt);

        this.buttonType = "password";
        this.show_password_button_text = $localize `:@@cryptButtonShowPassword:Show Passwords`;
    }

    showPassword(): void {
        if (this.buttonType === "password") {
            this.buttonType = "text";
            this.show_password_button_text = $localize `:@@cryptButtonHidePassword:Hide Passwords`;
        }
        else {
            this.buttonType = "password";
            this.show_password_button_text = $localize `:@@cryptButtonShowPassword:Show Passwords`;
        }
    }

    async changePassword(): Promise<void> {
        this.utils.pageDisabled = true;
        this.changeCryptPassword().then((execStatus: boolean): void => {
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

    private async changeCryptPassword(): Promise<boolean> {
        const newPassword: string = this.passwordFormGroup.get("newPassword").value;
        const oldPassword: string = this.passwordFormGroup.get("cryptPassword").value;
        const confirmPassword: string = this.passwordFormGroup.get("confirmPassword").value;

        if (newPassword === "" || newPassword !== confirmPassword || oldPassword === "") {
            return false;
        }
        
        try {
            await window.ipc.changeCryptPassword(newPassword, oldPassword, confirmPassword);
            this.successtext_cryptsetup = $localize `:@@cryptfinishprocess:Crypt password changed successfully`;
            this.errortext_cryptsetup = '';
            return true;
        } catch (err: unknown) {
            console.error("change-crypt-password: changeCryptPassword failed =>", err)
            this.successtext_cryptsetup = '';
            this.errortext_cryptsetup = $localize `:@@errornewpassword:Error: Could not change crypt password (wrong old crypt password?)`;
            return false;
        }
    }

    confirmValidation(group: FormGroup): { notSame: boolean } {
        const pass: string = group.get("newPassword").value;
        const confirmPass: string = group.get("confirmPassword").value;

        return pass === confirmPass ? null : { notSame: true }
    }
}
