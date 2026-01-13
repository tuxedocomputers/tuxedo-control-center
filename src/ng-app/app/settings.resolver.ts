/*!
 * Copyright (c) 2019-2026 TUXEDO Computers GmbH <tux@tuxedocomputers.com>
 *
 * This file is part of TUXEDO Control Center.
 *
 * TUXEDO Control Center is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * TUXEDO Control Center is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with TUXEDO Control Center.  If not, see <https://www.gnu.org/licenses/>.
 */

import { Injectable } from '@angular/core';
import type { Resolve } from '@angular/router';
import type { Observable } from 'rxjs';
import { TccDBusClientService } from './tcc-dbus-client.service';
import { filter, first } from 'rxjs/operators';

@Injectable({
    providedIn: 'root',
})
export class ForceYUV420OutputSwitchResolver implements Resolve<boolean> {
    constructor(private tccdbus: TccDBusClientService) {}

    resolve(): Observable<boolean> {
        return this.tccdbus.forceYUV420OutputSwitchAvailable.asObservable().pipe(
            filter((value: boolean): boolean => value !== undefined),
            first(),
        );
    }
}

@Injectable({
    providedIn: 'root',
})
export class ChargingProfilesAvailableResolver implements Resolve<string[]> {
    constructor(private tccdbus: TccDBusClientService) {}

    resolve(): Observable<string[]> {
        return this.tccdbus.chargingProfilesAvailable.asObservable().pipe(
            filter((value: string[]): boolean => value !== undefined),
            first(),
        );
    }
}

@Injectable({
    providedIn: 'root',
})
export class PrimeSelectAvailableResolver implements Resolve<string> {
    constructor(private tccdbus: TccDBusClientService) {}

    resolve(): Observable<string> {
        return this.tccdbus.primeState.asObservable().pipe(
            filter((value: string): boolean => value !== undefined),
            first(),
        );
    }
}
