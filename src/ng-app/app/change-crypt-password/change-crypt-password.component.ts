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
import { windowWhen } from 'rxjs/operators';
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

    passwordFormGroup: FormGroup = new FormGroup({
        cryptPassword: new FormControl('', [Validators.required, Validators.minLength(1), Validators.maxLength(50)]),
        newPassword: new FormControl('', [Validators.required, Validators.minLength(1), Validators.maxLength(50)]),
        confirmPassword: new FormControl('', [Validators.required, Validators.minLength(1), Validators.maxLength(50)])
    }, { validators: [this.confirmValidation] })

    constructor(
        private utils: UtilsService
    ) { }

    async ngOnInit(): Promise<void> {
        this.crypt_drives = (await window.driveController.getDrives()).filter(x => x.crypt);

        this.buttonType = "password";
        this.show_password_button_text = $localize `:@@cryptButtonShowPassword:Show Passwords`;
    }

    showPassword(): void {
        if (this.buttonType == "password") {
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

        this.changeCryptPassword().then((): void => {
            this.passwordFormGroup.setValue({
                cryptPassword: "",
                newPassword: "",
                confirmPassword: ""
            });
            this.utils.pageDisabled = false;
        });
    }

    private async changeCryptPassword(): Promise<void> {
        const oldPassword: string = this.passwordFormGroup.get("cryptPassword").value;
        const newPassword: string = this.passwordFormGroup.get("newPassword").value;
        const confirmPassword: string = this.passwordFormGroup.get("confirmPassword").value;

        // Just to be sure that sane values are read to not brick the encryption when gui logic failed
        if (oldPassword === "" || newPassword === "" || newPassword !== confirmPassword) {
            return;
        }
        return window.ipc.changeCryptPassword(oldPassword, newPassword, confirmPassword).then(() => {
            this.successtext_cryptsetup = $localize `:@@cryptfinishprocess:Crypt password changed successfully`;
            this.errortext_cryptsetup = '';
        }).catch((err: unknown): void => {
            console.error("change-crypt-password: changeCryptPassword failed =>", err)
            this.successtext_cryptsetup = '';
            this.errortext_cryptsetup = $localize `:@@errornewpassword:Error: Could not change crypt password (wrong old crypt password?)`;
        });
    }

    confirmValidation(group: FormGroup): { notSame: boolean } {
        const pass: string = group.get("newPassword").value;
        const confirmPass: string = group.get("confirmPassword").value;

        return pass === confirmPass ? null : { notSame: true }
    }
}