import { Injectable } from "@angular/core";
import { Resolve } from "@angular/router";
import { Observable } from "rxjs";
import { TccDBusClientService } from "./tcc-dbus-client.service";
import { filter, first } from "rxjs/operators";

@Injectable({
    providedIn: "root",
})
export class ForceYUV420OutputSwitchResolver implements Resolve<boolean> {
    constructor(private tccdbus: TccDBusClientService) {}

    resolve(): Observable<boolean> {
        return this.tccdbus.forceYUV420OutputSwitchAvailable
            .asObservable()
            .pipe(
                filter((value) => value !== undefined),
                first()
            );
    }
}

@Injectable({
    providedIn: "root",
})
export class ChargingProfilesAvailableResolver implements Resolve<string[]> {
    constructor(private tccdbus: TccDBusClientService) {}

    resolve(): Observable<string[]> {
        return this.tccdbus.chargingProfilesAvailable.asObservable().pipe(
            filter((value) => value !== undefined),
            first()
        );
    }
}

@Injectable({
    providedIn: "root",
})
export class PrimeSelectAvailableResolver implements Resolve<string> {
    constructor(private tccdbus: TccDBusClientService) {}

    resolve(): Observable<string> {
        return this.tccdbus.primeState.asObservable().pipe(
            filter((value) => value !== undefined),
            first()
        );
    }
}
