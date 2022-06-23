import { Component, Inject } from '@angular/core';
import { FormControl } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

export interface ConfirmDialogData {
    title: string,
    heading?: string,
    description: string,
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
}
