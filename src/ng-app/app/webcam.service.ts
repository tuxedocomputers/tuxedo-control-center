import { Injectable } from "@angular/core";
import { FormGroup } from "@angular/forms";
import { CanActivate, CanDeactivate } from "@angular/router";
import { UtilsService } from "./utils.service";

@Injectable({ providedIn: "root" })
export class WebcamGuardService implements CanActivate {
    loading: boolean;
    public setLoadingStatus(status: boolean) {
        this.loading = status;
    }

    public canActivate(): boolean {
        if (this.loading) {
            return false;
        }
        return true;
    }
}

export interface CanComponentDeactivate {
    webcamFormGroup: FormGroup;
}

@Injectable({
    providedIn: "root",
})
export class CanDeactivateGuard
    implements CanDeactivate<CanComponentDeactivate>
{
    constructor(private utils: UtilsService) {}

    askUnsavedPreset() {
        let config = {
            title: $localize`:@@webcamDialogUnsavedChangesTitle:Unsaved changes`,
            description: $localize`:@@webcamDialogUnsavedChangesDescription:Changes were not saved. Are you sure that you want to leave before saving?`,
            buttonAbortLabel: $localize`:@@dialogReturn:Go back`,
            buttonConfirmLabel: $localize`:@@dialogLeave:Leave`,
        };
        return this.utils.confirmDialog(config);
    }

    public async canDeactivate(component: CanComponentDeactivate) {
        if (component.webcamFormGroup.dirty) {
            let canRoute: boolean;
            await this.askUnsavedPreset().then((x) => {
                canRoute = x["confirm"];
            });
            return canRoute;
        }
        return true;
    }
}
