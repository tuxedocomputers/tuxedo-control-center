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
import { from, type Observable } from 'rxjs';
import { filter, first } from 'rxjs/operators';
// biome-ignore lint: deb does build with type, but creates constructor dependency injection error
import { PowerStateService } from './power-state.service';

@Injectable({
    providedIn: 'root',
})
export class PowerStateStatusResolver implements Resolve<string> {
    constructor(private power: PowerStateService) {}

    resolve(): Observable<string> {
        return from(this.power.getDGpuPowerState()).pipe(
            filter((value: string): boolean => value !== undefined),
            first(),
        );
    }
}
@Injectable({
    providedIn: 'root',
})
export class DGpuStatusResolver implements Resolve<boolean> {
    resolve(): boolean {
        return window.power.isDGpuAvailable();
    }
}
@Injectable({
    providedIn: 'root',
})
export class IGpuStatusResolver implements Resolve<boolean> {
    resolve(): boolean {
        return window.power.isIGpuAvailable();
    }
}
@Injectable({
    providedIn: 'root',
})
export class AmdGpuCountResolver implements Resolve<number> {
    resolve(): number {
        return window.power.getAmdDGpuCount();
    }
}

@Injectable({
    providedIn: 'root',
})
export class CpuVendorResolver implements Resolve<string> {
    resolve(): Observable<string> {
        return from(window.vendor.getCpuVendor()).pipe(
            filter((value: string): boolean => value !== undefined),
            first(),
        );
    }
}
