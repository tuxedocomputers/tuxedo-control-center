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
    return this.i18n({ value: 'This feature is not (yet) supported on this model.' });
  }

  get hasWebcamControl(): boolean {
    return this.tccDbus.tuxedoWmiAvailable.value;
  }

  get webcamControlCompatibilityMessage(): string {
    return this.i18n({ value: 'This feature is not (yet) supported on this model.' });
  }
}
