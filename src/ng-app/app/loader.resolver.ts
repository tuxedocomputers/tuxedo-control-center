/*!
 * Copyright (c) 2019-2025 TUXEDO Computers GmbH <tux@tuxedocomputers.com>
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
import { Resolve } from '@angular/router';

import { Observable, of, from } from 'rxjs';
import { TccDBusClientService } from './tcc-dbus-client.service';

@Injectable({
    providedIn: 'root'
})
export class LoaderResolver implements Resolve<Observable<boolean>> {
    constructor(private dbus: TccDBusClientService) {}

    resolve(): Observable<boolean> {
        return from(this.waitForLoading());
    }

    /**
     * @returns Promise that resolves to true when loaded, false if timed out
     */
    private async waitForLoading(): Promise<boolean> {
        return await this.waitForDBusData(2000);
    }

    private async waitForDBusData(timeoutMs: number): Promise<boolean> {
        let timedOut: boolean = false;
        setTimeout((): void => { timedOut = true; }, timeoutMs);

        while (!this.dbus.dataLoaded && !timedOut) {
            await new Promise<void>((resolve: () => void): NodeJS.Timeout => setTimeout(resolve, 50));
        }

        if (timedOut) {
            return false;
        } else {
            return true;
        }
    }
}
