/*!
 * Copyright (c) 2020-2022 TUXEDO Computers GmbH <tux@tuxedocomputers.com>
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
import { TccDBusClientService } from './tcc-dbus-client.service';
import { I18n } from '@ngx-translate/i18n-polyfill';

@Injectable({
  providedIn: 'root'
})
export class CompatibilityService {

  constructor(
    private tccDbus: TccDBusClientService,
    private i18n: I18n) { }

  get hasFancontrol(): boolean {
    return this.tccDbus.tuxedoWmiAvailable.value;
  }

  get fanControlCompatibilityMessage(): string {
    return this.i18n({ value: 'This feature is not supported on your model.' });
  }

  get hasWebcamControl(): boolean {
    return this.tccDbus.tuxedoWmiAvailable.value && this.tccDbus.webcamSWAvailable.value;
  }

  get webcamControlCompatibilityMessage(): string {
    return this.i18n({ value: 'This feature is not supported on your model.' });
  }

  get hasODMProfileControl(): boolean {
      return this.tccDbus.tuxedoWmiAvailable.value &&
        this.tccDbus.odmProfilesAvailable.value !== undefined &&
        this.tccDbus.odmProfilesAvailable.value.length > 0;
  }

  get hasODMPowerLimitControl(): boolean {
      return this.tccDbus.tuxedoWmiAvailable.value &&
        this.tccDbus.odmPowerLimits.value !== undefined &&
        this.tccDbus.odmPowerLimits.value.length > 0;
  }

  get uwLEDOnlyMode(): boolean {
      return this.hasODMPowerLimitControl &&
        this.hasODMProfileControl;
  }

  get tccDbusAvailable() {
    return this.tccDbus.available;
  }
}
