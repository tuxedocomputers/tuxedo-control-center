import { Injectable } from "@angular/core";
import { Resolve } from "@angular/router";
import { Observable, from } from "rxjs";
import { filter, first } from "rxjs/operators";
import { PowerStateService } from "./power-state.service";
import { TccDBusClientService } from "./tcc-dbus-client.service";

@Injectable({
    providedIn: "root",
})
export class PowerStateStatusResolver implements Resolve<string> {
    constructor(private power: PowerStateService) {}

    resolve(): Observable<string> {
        return from(this.power.getDGpuPowerState()).pipe(
            filter((value: string): boolean => value !== undefined),
            first()
        );
    }
}
@Injectable({
    providedIn: "root",
})
export class DGpuStatusResolver implements Resolve<boolean> {
    // todo: constructor is unnecessary
    constructor() {}

    resolve(): boolean {
        return window.power.isDGpuAvailable();
    }
}
@Injectable({
    providedIn: "root",
})
export class IGpuStatusResolver implements Resolve<boolean> {
    // todo: constructor is unnecessary
    constructor() {}

    resolve(): boolean {
        return window.power.isIGpuAvailable();
    }
}
@Injectable({
    providedIn: "root",
})
export class AmdGpuCountResolver implements Resolve<number> {
    // todo: constructor is unnecessary
    constructor() {}

    resolve(): number {
        return window.power.getAmdDGpuCount();
    }
}
// Prime state already in settings resolver
// x11 has it's own resolver
@Injectable({
    providedIn: "root",
})
export class CpuVendorResolver implements Resolve<string> {
    constructor() {}

    resolve(): Observable<string> {
        return from(window.vendor.getCpuVendor()).pipe(
            filter((value: string): boolean => value !== undefined),
            first()
        );
    }
}


