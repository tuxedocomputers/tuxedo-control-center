import { Injectable } from "@angular/core";
import { CanActivate } from "@angular/router";

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
        console.log("routing!!");
        return true;
    }
}
