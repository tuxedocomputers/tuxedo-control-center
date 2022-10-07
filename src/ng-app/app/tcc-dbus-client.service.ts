/*!
 * Copyright (c) 2019-2020 TUXEDO Computers GmbH <tux@tuxedocomputers.com>
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
import { Injectable, OnDestroy } from '@angular/core';
import { TccDBusController } from '../../common/classes/TccDBusController';
import { BehaviorSubject, Subject } from 'rxjs';
import { FanData } from '../../service-app/classes/TccDBusInterface';
import { ITccProfile, TccProfile } from '../../common/models/TccProfile';
import { UtilsService } from './utils.service';
import { TDPInfo } from '../../native-lib/TuxedoIOAPI';
import { ConfigService } from './config.service';

export interface IDBusFanData {
  cpu: FanData;
  gpu1: FanData;
  gpu2: FanData;
}

@Injectable({
  providedIn: 'root'
})
export class TccDBusClientService implements OnDestroy {

  private tccDBusInterface: TccDBusController;
  private isAvailable: boolean;
  private timeout: NodeJS.Timeout;
  private updateInterval = 500;

  public available = new Subject<boolean>();
  public tuxedoWmiAvailable = new BehaviorSubject<boolean>(true);
  public fanData = new BehaviorSubject<IDBusFanData>({cpu: new FanData(), gpu1: new FanData(), gpu2: new FanData() });

  public webcamSWAvailable = new BehaviorSubject<boolean>(undefined);
  public webcamSWStatus = new BehaviorSubject<boolean>(undefined);

  public forceYUV420OutputSwitchAvailable = new BehaviorSubject<boolean>(false);

  public odmProfilesAvailable = new BehaviorSubject<string[]>([]);
  public odmPowerLimits = new BehaviorSubject<TDPInfo[]>([]);

  public customProfiles = new BehaviorSubject<ITccProfile[]>([]);
  public defaultProfiles = new BehaviorSubject<ITccProfile[]>([]);
  public defaultValuesProfile = new BehaviorSubject<ITccProfile>(undefined);
  private previousCustomProfilesJSON = '';
  private previousDefaultProfilesJSON = '';
  private previousDefaultValuesProfileJSON = '';

  public activeProfile = new BehaviorSubject<TccProfile>(undefined);
  private previousActiveProfileJSON = '';

  public fansMinSpeed = new BehaviorSubject<number>(undefined);
  public fansOffAvailable = new BehaviorSubject<boolean>(undefined);

  constructor(private utils: UtilsService) {
    this.tccDBusInterface = new TccDBusController();
    this.periodicUpdate();
    this.timeout = setInterval(() => { this.periodicUpdate(); }, this.updateInterval);
  }

  private async periodicUpdate() {
    const previousValue = this.isAvailable;
    // Check if still available
    if (this.isAvailable) {
      this.isAvailable = await this.tccDBusInterface.dbusAvailable();
    } else {
      // If not available try to init again
      this.isAvailable = await this.tccDBusInterface.init();
    }
    // Publish availability as necessary
    if (this.isAvailable !== previousValue) { this.available.next(this.isAvailable); }

    // Read and publish data (note: atm polled)
    const wmiAvailability = await this.tccDBusInterface.tuxedoWmiAvailable();
    this.tuxedoWmiAvailable.next(wmiAvailability);

    const fanData: IDBusFanData = {
      cpu: await this.tccDBusInterface.getFanDataCPU(),
      gpu1: await this.tccDBusInterface.getFanDataGPU1(),
      gpu2: await this.tccDBusInterface.getFanDataGPU2()
    };
    this.fanData.next(fanData);

    this.webcamSWAvailable.next(await this.tccDBusInterface.webcamSWAvailable());
    this.webcamSWStatus.next(await this.tccDBusInterface.getWebcamSWStatus());

    this.forceYUV420OutputSwitchAvailable.next(await this.tccDBusInterface.getForceYUV420OutputSwitchAvailable());

    const nextODMProfilesAvailable = await this.tccDBusInterface.odmProfilesAvailable();
    this.odmProfilesAvailable.next(nextODMProfilesAvailable !== undefined ? nextODMProfilesAvailable : []);
    const nextODMPowerLimits = await this.tccDBusInterface.odmPowerLimits();
    this.odmPowerLimits.next(nextODMPowerLimits !== undefined ? nextODMPowerLimits : []);

    // Retrieve and parse profiles
    const activeProfileJSON: string = await this.tccDBusInterface.getActiveProfileJSON();
    if (activeProfileJSON !== undefined) {
        if (activeProfileJSON === undefined) { console.log('tcc-dbus-client.service: unexpected error => no active profile'); }
        try {
            const activeProfile: TccProfile = JSON.parse(activeProfileJSON);
            // this.utils.fillDefaultValuesProfile(activeProfile);
            if (this.previousActiveProfileJSON !== activeProfileJSON) {
                this.utils.fillDefaultProfileTexts(activeProfile);
                this.activeProfile.next(activeProfile);
                this.previousActiveProfileJSON = activeProfileJSON;
            }
        } catch { console.log('tcc-dbus-client.service: unexpected error parsing profile'); }
    }

    const defaultProfilesJSON: string = await this.tccDBusInterface.getDefaultProfilesJSON();
    const defaultValuesProfileJSON: string = await this.tccDBusInterface.getDefaultValuesProfileJSON();
    const customProfilesJSON: string = await this.tccDBusInterface.getCustomProfilesJSON();
    if (defaultProfilesJSON !== undefined && defaultValuesProfileJSON !== undefined && customProfilesJSON !== undefined) {
        try {
            if (this.previousDefaultProfilesJSON !== defaultProfilesJSON) {
                this.defaultProfiles.next(JSON.parse(defaultProfilesJSON));
                this.previousDefaultProfilesJSON = defaultProfilesJSON;
            }
            if (this.previousCustomProfilesJSON !== customProfilesJSON) {
                this.customProfiles.next(JSON.parse(customProfilesJSON));
                this.previousCustomProfilesJSON = customProfilesJSON;
            }
            if (this.previousDefaultValuesProfileJSON !== defaultValuesProfileJSON) {
                this.defaultValuesProfile.next(JSON.parse(defaultValuesProfileJSON));
                this.previousDefaultValuesProfileJSON = defaultValuesProfileJSON;
            }
        } catch (err) {
            console.log('tcc-dbus-client.service: unexpected error parsing profile lists => ' + err);
        }
    }

    this.fansMinSpeed.next(await this.tccDBusInterface.getFansMinSpeed());
    this.fansOffAvailable.next(await this.tccDBusInterface.getFansOffAvailable());
  }

  public async triggerUpdate() {
    await this.periodicUpdate();
  }

  ngOnDestroy() {
    // Cleanup
    if (this.timeout !== undefined) {
      clearInterval(this.timeout);
    }
    this.tccDBusInterface.disconnect();
  }

  public async setTempProfile(profileName: string) {
    const result = await this.tccDBusInterface.dbusAvailable() && await this.tccDBusInterface.setTempProfileName(profileName);
    return result;
  }

  public async setTempProfileById(profileId: string) {
    const result = await this.tccDBusInterface.dbusAvailable() && await this.tccDBusInterface.setTempProfileById(profileId);
    return result;
  }
}
