/*!
 * Copyright (c) 2019-2023 TUXEDO Computers GmbH <tux@tuxedocomputers.com>
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
import { ITccSettings, KeyboardBacklightCapabilitiesInterface, KeyboardBacklightStateInterface } from '../../common/models/TccSettings';
import { TDPInfo } from '../../native-lib/TuxedoIOAPI';
import { ICpuPower } from 'src/common/models/TccPowerSettings';
import { IdGpuInfo, IiGpuInfo } from 'src/common/models/TccGpuValues';

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
  public dataLoaded = false;
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

  public settings = new BehaviorSubject<ITccSettings>(undefined);
  private previousSettingsJSON = '';

  public keyboardBacklightCapabilities = new BehaviorSubject<KeyboardBacklightCapabilitiesInterface>(undefined);
  public keyboardBacklightStates = new BehaviorSubject<Array<KeyboardBacklightStateInterface>>(undefined);

  public fansMinSpeed = new BehaviorSubject<number>(undefined);
  public fansOffAvailable = new BehaviorSubject<boolean>(undefined);

  public dGpuInfo = new BehaviorSubject<IdGpuInfo>(undefined);
  public iGpuInfo = new BehaviorSubject<IiGpuInfo>(undefined);
  public cpuPower = new BehaviorSubject<ICpuPower>(undefined);

  public iGpuLogging = new BehaviorSubject<Boolean>(undefined);

  constructor(private utils: UtilsService) {
    this.tccDBusInterface = new TccDBusController();
    this.periodicUpdate();
    this.timeout = setInterval(() => { this.periodicUpdate(); }, this.updateInterval);
  }

  ngOnDestroy() {
    // Cleanup
    if (this.timeout !== undefined) {
      clearInterval(this.timeout);
    }
    this.tccDBusInterface.disconnect();
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

    if (!this.isAvailable) {
        return;
    }

    // Read and publish data (note: atm polled)
    const wmiAvailability = await this.tccDBusInterface.tuxedoWmiAvailable();
    this.tuxedoWmiAvailable.next(wmiAvailability);

    const fanData: IDBusFanData = {
      cpu: await this.tccDBusInterface.getFanDataCPU(),
      gpu1: await this.tccDBusInterface.getFanDataGPU1(),
      gpu2: await this.tccDBusInterface.getFanDataGPU2()
    };
    this.fanData.next(fanData);

    const dGpuInfoValuesJSON = await this.tccDBusInterface.getDGpuInfoValuesJSON();
    const iGpuInfoValuesJSON = await this.tccDBusInterface.getIGpuInfoValuesJSON();

    if (dGpuInfoValuesJSON) {
        this.dGpuInfo.next(JSON.parse(dGpuInfoValuesJSON));
    }

    if (iGpuInfoValuesJSON) {
        this.iGpuInfo.next(JSON.parse(iGpuInfoValuesJSON));
    }

    this.iGpuLogging.next(await this.tccDBusInterface.getDGpuLoggingStatus())

    const cpuPowerValuesJSON = await this.tccDBusInterface.getCpuPowerValuesJSON();
    if (cpuPowerValuesJSON) {
        this.cpuPower.next(JSON.parse(cpuPowerValuesJSON));
    }

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

        this.dataLoaded = true;
    }
    const settingsJSON: string = await this.tccDBusInterface.getSettingsJSON();
    if (settingsJSON !== undefined) {
        try {
            if (this.previousSettingsJSON !== settingsJSON) {
                this.settings.next(JSON.parse(settingsJSON));
                this.previousSettingsJSON = settingsJSON;
            }
        } catch (err) { console.log('tcc-dbus-client.service: unexpected error parsing settings => ' + err); }
    }

    const keyboardBacklightCapabilitiesJSON: string = await this.tccDBusInterface.getKeyboardBacklightCapabilitiesJSON();
    if (keyboardBacklightCapabilitiesJSON !== undefined) {
        try {
            this.keyboardBacklightCapabilities.next(JSON.parse(keyboardBacklightCapabilitiesJSON));
        } catch { console.log('tcc-dbus-client.service: unexpected error parsing keyboard backlight capabilities'); }
    }

    const keyboardBacklightStatesJSON: string = await this.tccDBusInterface.getKeyboardBacklightStatesJSON();
    if (keyboardBacklightStatesJSON !== undefined) {
        try {
            this.keyboardBacklightStates.next(JSON.parse(keyboardBacklightStatesJSON));
        } catch { console.log('tcc-dbus-client.service: unexpected error parsing keyboard backlight states'); }
    }

    this.fansMinSpeed.next(await this.tccDBusInterface.getFansMinSpeed());
    this.fansOffAvailable.next(await this.tccDBusInterface.getFansOffAvailable());
  }

  public setKeyboardBacklightStates(keyboardBacklightStates: Array<KeyboardBacklightStateInterface>) {
    this.tccDBusInterface.setKeyboardBacklightStatesJSON(JSON.stringify(keyboardBacklightStates));
  }

  public async triggerUpdate() {
    await this.periodicUpdate();
  }

  public async setTempProfile(profileName: string) {
    const result = await this.tccDBusInterface.dbusAvailable() && await this.tccDBusInterface.setTempProfileName(profileName);
    return result;
  }

  public async setTempProfileById(profileId: string) {
    const result = await this.tccDBusInterface.dbusAvailable() && await this.tccDBusInterface.setTempProfileById(profileId);
    return result;
  }

  public async setDGpuLoggingStatus(status: boolean): Promise<void> {
    await this.tccDBusInterface.dbusAvailable() && await this.tccDBusInterface.setDGpuLoggingStatus(status)
  }

  public getInterface(): TccDBusController | undefined {
    if (this.isAvailable) {
        return this.tccDBusInterface;
    } else {
        return undefined;
    }
  }
}