import { Injectable } from "@angular/core";
import { FormGroup } from "@angular/forms";
import { CanDeactivate } from "@angular/router";
import { UtilsService } from "./utils.service";

export interface CanComponentDeactivate {
    webcamFormGroup: FormGroup;
}

@Injectable({
    providedIn: "root",
})
export class WebcamSettingsGuard
    implements CanDeactivate<CanComponentDeactivate>
{
    constructor(private utils: UtilsService) {}
    loading: boolean = false;

    askUnsavedPreset() {
        let config = {
            title: $localize`:@@webcamDialogUnsavedChangesTitle:Unsaved changes`,
            description: $localize`:@@webcamDialogUnsavedChangesDescription:Changes were not saved. Are you sure that you want to leave before saving?`,
            buttonAbortLabel: $localize`:@@dialogReturn:Go back`,
            buttonConfirmLabel: $localize`:@@dialogLeave:Leave`,
        };
        return this.utils.confirmDialog(config);
    }

    public setLoadingStatus(status: boolean) {
        this.loading = status;
    }

    public async canDeactivate(component: CanComponentDeactivate) {
        if (component.webcamFormGroup.dirty) {
            let canRoute: boolean;
            await this.askUnsavedPreset().then((x) => {
                canRoute = x["confirm"];
            });
            return canRoute;
        }

        if (this.loading) {
            return false;
        }

        return true;
    }
}
