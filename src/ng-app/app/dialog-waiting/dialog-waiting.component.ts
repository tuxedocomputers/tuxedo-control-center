/*!
 * Copyright (c) 2023 TUXEDO Computers GmbH <tux@tuxedocomputers.com>
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

import { Component, Inject, OnInit } from "@angular/core";
import { FormControl } from "@angular/forms";
import { MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog";
import {
    DialogChoiceComponent,
    WaitingDialogData,
} from "../dialog-choice/dialog-choice.component";

@Component({
    selector: "app-dialog-waiting",
    templateUrl: "./dialog-waiting.component.html",
    styleUrls: ["./dialog-waiting.component.scss"],
})
export class DialogWaitingComponent {
    public ctrlCheckboxNoBother: FormControl;

    constructor(
        public dialogRef: MatDialogRef<DialogChoiceComponent>,
        @Inject(MAT_DIALOG_DATA) public data: WaitingDialogData
    ) {
        this.ctrlCheckboxNoBother = new FormControl(false);
    }
}
