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
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

export interface InputDialogData {
    title: string,
    heading: string,
    description: string,
    prefill: string,
    buttonAbortLabel: string,
    buttonConfirmLabel: string
}

@Component({
    selector: 'app-dialog-input-text',
    templateUrl: './dialog-input-text.component.html',
    styleUrls: ['./dialog-input-text.component.scss']
})
export class DialogInputTextComponent {

    constructor(
        public dialogRef: MatDialogRef<DialogInputTextComponent>,
        @Inject(MAT_DIALOG_DATA) public data: InputDialogData) {}

    closeDialog(result?: string) {
        this.dialogRef.close(result);
    }
}
