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

@Component({
    selector: 'app-change-crypt-password',
    templateUrl: './change-crypt-password.component.html',
    styleUrls: ['./change-crypt-password.component.scss']
})
export class ChangeCryptPasswordComponent implements OnInit {

    matcher = new FormErrorStateMatcher();

    buttonType = 'password';
    show_password_button_text = 'Show Password';
    errortext_cryptsetup = '';
    errortext_cryptsetup_detail = '';

    passwordFormGroup: FormGroup = new FormGroup({
        cryptPassword: new FormControl('', [Validators.required, Validators.minLength(1), Validators.maxLength(50)]),
        newPassword: new FormControl('', [Validators.required, Validators.minLength(1), Validators.maxLength(50)]),
        confirmPassword: new FormControl('', [Validators.required, Validators.minLength(1), Validators.maxLength(50)])
    }, {validators: [this.confirmValidation]})

    constructor(private electron: ElectronService) { }

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

    async changePassword() {
        console.log("change password")
        console.log("Crypt Password", this.passwordFormGroup.get("cryptPassword").value);
        console.log("New Crypt Password", this.passwordFormGroup.get("newPassword").value);
        console.log("Confirm New Crypt Password", this.passwordFormGroup.get("confirmPassword").value);

        let oldPassword = this.passwordFormGroup.get("cryptPassword").value;
        let newPassword = this.passwordFormGroup.get("newPassword").value;

        // const result = this.electron.ipcRenderer.sendSync(
        //     'exec-cmd-sync', 'pkexec ' + tccdExec + ' --new_settings ' + tmpSettingsPath
        // );

        let crpyt_drives = (await DriveController.getDrives()).filter(x => x.crypt);
        console.log("crpyt_drives");
        console.log(crpyt_drives);

        for(let drive of crpyt_drives) {
            // const result = this.electron.ipcRenderer.sendSync(`echo '${oldPassword} ${newPassword} ${newPassword}' > /tmp/testtccfile.txt`);
            const result_set = this.electron.ipcRenderer.sendSync('exec-cmd-sync', `printf '%s\\n' '${oldPassword}' '${newPassword}' '${newPassword}' | pkexec /usr/sbin/cryptsetup -q luksAddKey --force-password ${drive.devPath}`);
            console.log("result_set", result_set);
            if(result_set.error === undefined) {
                this.errortext_cryptsetup = '';
                this.errortext_cryptsetup_detail = '';
            }
            else {
                this.errortext_cryptsetup = 'Fehler beim setzen eines neuen Cryptpasswort';
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
                this.errortext_cryptsetup = 'Fehler beim entfernen des alten Cryptpassworts';
                this.errortext_cryptsetup_detail = result_remove.error;
                return;
            }
        }
    }

    confirmValidation(group: FormGroup) {
        let pass = group.get("newPassword").value;
        let confirmPass = group.get("confirmPassword").value;

        return pass === confirmPass ? null : { notSame: true } 
    }
}