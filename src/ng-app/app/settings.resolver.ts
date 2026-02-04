import { Injectable, inject } from "@angular/core";

import { Observable } from "rxjs";
import { TccDBusClientService } from "./tcc-dbus-client.service";
import { filter, first } from "rxjs/operators";

@Injectable({
    providedIn: "root",
})
export class ForceYUV420OutputSwitchResolver  {
    private tccdbus = inject(TccDBusClientService);



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
export class ChargingProfilesAvailableResolver  {
    private tccdbus = inject(TccDBusClientService);



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
export class PrimeSelectAvailableResolver  {
    private tccdbus = inject(TccDBusClientService);



    resolve(): Observable<string> {
        return this.tccdbus.primeState.asObservable().pipe(
            filter((value) => value !== undefined),
            first()
        );
    }
}
