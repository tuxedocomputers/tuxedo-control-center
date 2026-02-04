import { Injectable, inject } from "@angular/core";
import { UntypedFormGroup } from "@angular/forms";

import { UtilsService } from "./utils.service";

export interface CanComponentDeactivate {
    webcamFormGroup: UntypedFormGroup;
}

@Injectable({
    providedIn: "root",
})
export class WebcamSettingsGuard
    
{
    private utils = inject(UtilsService);


    loading = false;

    askUnsavedPreset() {
        const config = {
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
