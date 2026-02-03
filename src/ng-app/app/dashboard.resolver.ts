import { Injectable } from "@angular/core";

import { Observable, from } from "rxjs";
import { filter, first } from "rxjs/operators";
import { PowerStateService } from "./power-state.service";

@Injectable({
    providedIn: "root",
})
export class PowerStateStatusResolver  {
    constructor(private power: PowerStateService) {}

    resolve(): Observable<string> {
        return from(this.power.getDGpuPowerState()).pipe(
            filter((value) => value !== undefined),
            first()
        );
    }
}
