/*!
 * Copyright (c) 2022 TUXEDO Computers GmbH <tux@tuxedocomputers.com>
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
import { Component, Inject } from '@angular/core';
import { FormControl } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { ElectronService } from 'ngx-electron';

export interface ConfirmDialogData {
    title: string,
    heading?: string,
    description: string,
    linkLabel?: string,
    linkHref?: string,
    buttonAbortLabel: string,
    buttonConfirmLabel: string,
    showCheckboxNoBother?: boolean,
    checkboxNoBotherLabel?: string
}

export interface ConfirmDialogResult {
    confirm: boolean;
    noBother: boolean;
}

@Component({
    selector: 'app-dialog-confirm',
    templateUrl: './dialog-confirm.component.html',
    styleUrls: ['./dialog-confirm.component.scss']
})
export class DialogConfirmComponent {

    public ctrlCheckboxNoBother: FormControl;

    constructor(
        private electron: ElectronService,
        public dialogRef: MatDialogRef<DialogConfirmComponent>,
        @Inject(MAT_DIALOG_DATA) public data: ConfirmDialogData) {
            
            if (data.checkboxNoBotherLabel === undefined) {
                data.checkboxNoBotherLabel = '';
            }
            if (data.showCheckboxNoBother === undefined) {
                data.showCheckboxNoBother = false;
            }
            this.ctrlCheckboxNoBother = new FormControl(false);
        }

    closeDialog(result?: boolean) {
        let dialogResult: ConfirmDialogResult;
        const noBotherValue = this.ctrlCheckboxNoBother.value as boolean;
        if (result === true) {
            dialogResult = {
                confirm: true,
                noBother: noBotherValue
            };
        } else {
            dialogResult = {
                confirm: false,
                noBother: noBotherValue
            };
        }
        this.dialogRef.close(dialogResult);
    }

    public async openExternalUrl(url: string) {
        await this.electron.shell.openExternal(url);
    }
}
