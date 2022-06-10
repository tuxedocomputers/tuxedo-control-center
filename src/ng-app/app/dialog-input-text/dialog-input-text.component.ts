import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

export interface InputDialogData {
    title: string,
    heading: string,
    description: string
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
        if (result !== undefined) {
            if (result.trim().length === 0) {
                return;
            }
        }
        this.dialogRef.close(result);
    }
}
