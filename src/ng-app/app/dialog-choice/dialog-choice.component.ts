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

import { Component, inject } from "@angular/core";
import { UntypedFormControl } from "@angular/forms";
import { MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog";
import { ElectronService } from "../electron.service";
import { SharedModule } from '../shared/shared.module';

export interface ChoiceDialogData {
    title: string;
    heading?: string;
    description: string;
    linkLabel?: string;
    linkHref?: string;
    labelData: SingleLabelData[];
    showCheckboxNoBother?: boolean;
    checkboxNoBotherLabel?: string;
}

export interface WaitingDialogData {
    title: string;
    description: string;
}

interface SingleLabelData {
    label: string;
    value: string;
}

export interface ConfirmChoiceResult {
    value: string | undefined;
    noBother: boolean;
}

@Component({
  standalone: true,
  imports: [SharedModule], 
    selector: "app-dialog-choice",
    templateUrl: "./dialog-choice.component.html",
    styleUrls: ["./dialog-choice.component.scss"],
    
})
export class DialogChoiceComponent {
    private electron = inject(ElectronService);
    dialogRef = inject<MatDialogRef<DialogChoiceComponent>>(MatDialogRef);
    data = inject<ChoiceDialogData>(MAT_DIALOG_DATA);

    public ctrlCheckboxNoBother: UntypedFormControl;


    constructor() {
        const data = this.data;

        if (data.checkboxNoBotherLabel === undefined) {
            data.checkboxNoBotherLabel = "";
        }
        if (data.showCheckboxNoBother === undefined) {
            data.showCheckboxNoBother = false;
        }
        this.ctrlCheckboxNoBother = new UntypedFormControl(false);
    }

    closeDialog(result?: string) {
        let dialogResult: ConfirmChoiceResult;
        const noBotherValue = this.ctrlCheckboxNoBother.value as boolean;
        if (result != undefined) {
            dialogResult = {
                value: result,
                noBother: noBotherValue,
            };
        } else {
            dialogResult = {
                value: undefined,
                noBother: noBotherValue,
            };
        }
        this.dialogRef.close(dialogResult);
    }

    public async openExternalUrl(url: string) {
        await this.electron.shell.openExternal(url);
    }
}
