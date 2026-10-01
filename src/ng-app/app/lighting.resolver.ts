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
import type { KeyboardCapabilitiesInterface, LightbarCapabilitiesInterface } from 'src/common/models/TccSettings';
// biome-ignore lint: injection token
import { TccDBusClientService } from './tcc-dbus-client.service';

@Injectable({
    providedIn: 'root',
})
export class KeyboardCapabilitiesResolver implements Resolve<KeyboardCapabilitiesInterface> {
    constructor(private tccd: TccDBusClientService) {}

    resolve(): Observable<KeyboardCapabilitiesInterface> {
        return this.tccd.keyboardCapabilities.pipe(
            filter((value: KeyboardCapabilitiesInterface): boolean => value !== undefined),
            first(),
        );
    }
}

@Injectable({
    providedIn: 'root',
})
export class LightbarCapabilitiesResolver implements Resolve<LightbarCapabilitiesInterface> {
    constructor(private tccd: TccDBusClientService) {}

    resolve(): Observable<LightbarCapabilitiesInterface> {
        return this.tccd.lightbarCapabilities.pipe(
            filter((value: LightbarCapabilitiesInterface): boolean => value !== undefined),
            first(),
        );
    }
}
