import { Injectable, OnDestroy } from '@angular/core';
import { Observable, Subject } from 'rxjs';
const dbus = require('dbus-next');

@Injectable({
  providedIn: 'root'
})
export class DBusService implements OnDestroy {

  private sessionBus: any;
  private dbusProperties: any;

  public observeDisplayBrightness: Observable<number>;
  private displayBrightnessSubject: Subject<number>;
  public currentDisplayBrightness: number;
  public displayBrightnessNotSupported = true;

  constructor() {
    this.displayBrightnessSubject = new Subject<number>();
    this.observeDisplayBrightness = this.displayBrightnessSubject.asObservable();

    this.sessionBus = dbus.sessionBus();

    this.sessionBus.getProxyObject('org.gnome.SettingsDaemon.Power', '/org/gnome/SettingsDaemon/Power').then((obj) => {
      this.dbusProperties = obj.getInterface('org.freedesktop.DBus.Properties');
      this.dbusProperties.Get('org.gnome.SettingsDaemon.Power.Screen', 'Brightness').then((result) => {
        if (result.hasOwnProperty('value')) {
          this.currentDisplayBrightness = result.value;
          this.displayBrightnessSubject.next(this.currentDisplayBrightness);
          this.displayBrightnessNotSupported = false;
        }
      });
      this.dbusProperties.on('PropertiesChanged', (iface, changed, invalidated) => {
        this.screenPropertiesChanged(this, iface, changed, invalidated);
      });
    });
  }

  private screenPropertiesChanged(that: DBusService, iface: string, changed: any, invalidated: any): void {
    if (iface === 'org.gnome.SettingsDaemon.Power.Screen' && changed.hasOwnProperty('Brightness')) {
      that.currentDisplayBrightness = changed.Brightness.value;
      that.displayBrightnessSubject.next(this.currentDisplayBrightness);
    }
  }

  public async setDisplayBrightness(valuePercent: number): Promise<boolean> {
    return new Promise<boolean>(resolve => {
      if (this.dbusProperties) {
        this.dbusProperties.Set('org.gnome.SettingsDaemon.Power.Screen', 'Brightness', new dbus.Variant('i', valuePercent))
        .then(() => {
          resolve(true);
        }).catch(() => {
          resolve(false);
        });
      }
    });
  }

  ngOnDestroy() {
    if (this.dbusProperties) {
      console.log('destroyed');
      this.dbusProperties.removeEventListener(this.screenPropertiesChanged);
    }
  }
}
