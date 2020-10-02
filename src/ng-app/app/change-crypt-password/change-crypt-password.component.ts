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

@Component({
    selector: 'app-change-crypt-password',
    templateUrl: './change-crypt-password.component.html',
    styleUrls: ['./change-crypt-password.component.scss']
})
export class ChangeCryptPasswordComponent implements OnInit {

    matcher = new FormErrorStateMatcher();

    buttonType = "password";
    show_password_button_text = "Show Password";

    passwordFormGroup: FormGroup = new FormGroup({
        cryptPassword: new FormControl('', [Validators.required, Validators.minLength(1), Validators.maxLength(50)]),
        newPassword: new FormControl('', [Validators.required, Validators.minLength(1), Validators.maxLength(50)]),
        confirmPassword: new FormControl('', [Validators.required, Validators.minLength(1), Validators.maxLength(50)])
    }, {validators: [this.confirmValidation]})

    constructor() { }

    ngOnInit() {
    }

    showPassword() {
        if (this.buttonType == "password") {
            this.buttonType = "text";
            this.show_password_button_text = "Hide Password";
        }
        else {
            this.buttonType = "password";
            this.show_password_button_text = "Show Password";
        }
    }

    changePassword() {
        console.log("change password")
        console.log("Crypt Password", this.passwordFormGroup.get("cryptPassword").value);
        console.log("New Crypt Password", this.passwordFormGroup.get("newPassword").value);
        console.log("Confirm New Crypt Password", this.passwordFormGroup.get("confirmPassword").value);
    }

    confirmValidation(group: FormGroup) {
        let pass = group.get("newPassword").value;
        let confirmPass = group.get("confirmPassword").value;

        return pass === confirmPass ? null : { notSame: true } 
    }
}