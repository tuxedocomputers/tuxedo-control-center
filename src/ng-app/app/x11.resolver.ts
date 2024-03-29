import { Injectable } from "@angular/core";
import { Resolve } from "@angular/router";
import { Observable, from } from "rxjs";
import { filter, first } from "rxjs/operators";
import { TccDBusClientService } from "./tcc-dbus-client.service";

@Injectable({
    providedIn: "root",
})
export class X11StatusResolver implements Resolve<boolean> {
    constructor(private tccdbus: TccDBusClientService) {}

    resolve(): Observable<boolean> {
        return from(this.tccdbus.isX11.asObservable()).pipe(
            filter((value) => value !== undefined),
            first()
        );
    }
}
