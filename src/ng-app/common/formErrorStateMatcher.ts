import { FormControl, FormGroupDirective, NgForm } from '@angular/forms';
import { ErrorStateMatcher } from '@angular/material/core';

export class FormErrorStateMatcher implements ErrorStateMatcher {
    isErrorState(control: FormControl | null, form: FormGroupDirective | NgForm | null): boolean {
        const invalidCtrl: boolean = !!(control && control.invalid && control.parent.dirty);
        const invalidParent: boolean = !!(control && control.parent && control.parent.invalid && control.parent.dirty);

        return (invalidCtrl || invalidParent);
    }
}
