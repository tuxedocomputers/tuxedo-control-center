/*!
 * Copyright (c) 2019-2024 TUXEDO Computers GmbH <tux@tuxedocomputers.com>
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
import { BehaviorSubject, observable, Observable, Subject } from 'rxjs';
import { FanData, IDBusFanData } from '../../common/models/IFanData';
import { ITccProfile, TccProfile } from '../../common/models/TccProfile';
import { UtilsService } from './utils.service';
import { ITccSettings, KeyboardBacklightCapabilitiesInterface, KeyboardBacklightStateInterface } from '../../common/models/TccSettings';
import { TDPInfo } from '../../native-lib/TuxedoIOAPI';
import { ICpuPower } from '../../common/models/TccPowerSettings';
import { IdGpuInfo, IiGpuInfo } from '../../common/models/TccGpuValues';
import { IDisplayFreqRes } from '../../common/models/DisplayFreqRes';
import { TUXEDODevice } from '../../common/models/DefaultProfiles';
import { IDbusClientAPI } from '../../e-app/preloadAPIs/DbusClientAPI';
import { parseDn } from 'builder-util-runtime';

@Injectable({
  providedIn: 'root'
})
export class TccDBusClientService implements OnDestroy {
  private isAvailable: boolean = true;
  private timeout: NodeJS.Timeout;
  private updateInterval = 500;

  public available = new Subject<boolean>();
  public tuxedoWmiAvailable = new BehaviorSubject<boolean>(true);
  public fanHwmonAvailable = new BehaviorSubject<boolean>(true);
  public dataLoaded = false;
  public fanData = new BehaviorSubject<IDBusFanData>({cpu: new FanData(), gpu1: new FanData(), gpu2: new FanData() });

  public webcamSWAvailable = new BehaviorSubject<boolean>(undefined);
  public webcamSWStatus = new BehaviorSubject<boolean>(undefined);

  public forceYUV420OutputSwitchAvailable = new BehaviorSubject<boolean>(false);
  public chargingProfilesAvailable = new BehaviorSubject<string[]>([]);

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
  public sensorDataCollectionStatus = new BehaviorSubject<boolean>(undefined);

  public primeState = new BehaviorSubject<string>(undefined);

  public displayModes = new BehaviorSubject<IDisplayFreqRes>(undefined);
  public refreshRateSupported = new BehaviorSubject<boolean>(undefined);
  public isX11 = new BehaviorSubject<boolean>(undefined);
  public device: TUXEDODevice = 0;
  public hasAquaris: boolean = true;

  // put all observables that need to parse json data in here and they will be updated automatically in next
  // periodicUpdate()
    private observableUpdateListJSON = new Map<BehaviorSubject<any>,string>()
    .set(this.fanData, "getFanData")
    .set(this.iGpuInfo, "getIGpuInfoValuesJSON")
    .set(this.dGpuInfo, "getDGpuInfoValuesJSON")
    .set(this.cpuPower, "getCpuPowerValuesJSON")
    .set(this.displayModes, "getDisplayModesJSON")
    .set(this.keyboardBacklightCapabilities, "getKeyboardBacklightCapabilitiesJSON")
    .set(this.keyboardBacklightStates, "getKeyboardBacklightStatesJSON")

  constructor(private utils: UtilsService) {
    this.updateTuxedoDevice();
    this.periodicUpdate();
    this.timeout = setInterval(() => { this.periodicUpdate(); }, this.updateInterval);
  }

  // updates an observable that wants parsed JSON input
  private async updateJSONObservable(observable: BehaviorSubject<any>, updateFunction: string) {
    // https://stackoverflow.com/questions/1723287/calling-a-javascript-function-named-in-a-variable
    const data = await window.dbusAPI[updateFunction]();
    try{
        let parsedData = JSON.parse(data);
        observable.next(parsedData);
    }
    catch(err) {
        // TODO, set stuff to default values? Do more error handling? Check if dbus is even up?
        //console.error("Could not update observable through function " + updateFunction +"\n" + err);
    }
  }

  // Display Brightness Gnome Workarounds

  displayBrightnessNotSupportedGnome()
  {
    return window.ipc.displayBrightnessNotSupportedGnome()
  }

  async setDisplayBrightnessGnome(valuePercent: number): Promise<void>
  {
     return window.ipc.setDisplayBrightnessGnome(valuePercent)
  }

  private async updateTuxedoDevice() {
    const deviceJSON = await window.dbusAPI.getDeviceJSON();
    if (deviceJSON) {
        this.device = JSON.parse(deviceJSON);
    }
  }

  private async periodicUpdate() {
    // TODO, could add check if dbus is even up here, to prevent spam of log files :)
    // Update all Observables that parse JSON Data
    if(!window.dbusAPI.dbusAvailable()) {
        console.error("Communication with TCCD interrupted, dbus not available");
        return;
    }
    for ( const [obs,func] of this.observableUpdateListJSON.entries()) {
        this.updateJSONObservable(obs,func);
    }
    this.isX11.next(await window.dbusAPI.getIsX11());

    this.fansMinSpeed.next(await window.dbusAPI.getFansMinSpeed());
    this.fansOffAvailable.next(await window.dbusAPI.getFansOffAvailable());
    // Read and publish data (note: atm polled)
    const wmiAvailability = await window.dbusAPI.tuxedoWmiAvailable();
    this.tuxedoWmiAvailable.next(wmiAvailability);

    const fanHwmonAvailability = await window.dbusAPI.fanHwmonAvailable();
    this.fanHwmonAvailable.next(fanHwmonAvailability);
    this.hasAquaris = await window.comp.getHasAquaris();
    this.sensorDataCollectionStatus.next(await window.dbusAPI.getSensorDataCollectionStatus())

    this.chargingProfilesAvailable.next(
        await window.dbusAPI.getChargingProfilesAvailable()
    );
    
    this.primeState.next(await window.dbusAPI.getPrimeState())
    this.webcamSWAvailable.next(await window.dbusAPI.webcamSWAvailable());
    this.webcamSWStatus.next(await window.dbusAPI.getWebcamSWStatus());

    this.forceYUV420OutputSwitchAvailable.next(await window.dbusAPI.getForceYUV420OutputSwitchAvailable());

    const nextODMProfilesAvailable = await window.dbusAPI.odmProfilesAvailable();
    this.odmProfilesAvailable.next(nextODMProfilesAvailable !== undefined ? nextODMProfilesAvailable : []);
    // TODO
    const nextODMPowerLimitsJSON = await window.dbusAPI.odmPowerLimitsJSON();
    if (nextODMPowerLimitsJSON) {
        let nextODMPowerLimits = JSON.parse(nextODMPowerLimitsJSON);
        this.odmPowerLimits.next(nextODMPowerLimits !== undefined ? nextODMPowerLimits : []);
    }

    // Retrieve and parse profiles
    const activeProfileJSON: string = await window.dbusAPI.getActiveProfileJSON();
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

    const defaultProfilesJSON: string = await window.dbusAPI.getDefaultProfilesJSON();
    const defaultValuesProfileJSON: string = await window.dbusAPI.getDefaultValuesProfileJSON();
    const customProfilesJSON: string = await window.dbusAPI.getCustomProfilesJSON();
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
    const settingsJSON: string = await window.dbusAPI.getSettingsJSON();
    if (settingsJSON !== undefined) {
        try {
            if (this.previousSettingsJSON !== settingsJSON) {
                this.settings.next(JSON.parse(settingsJSON));
                this.previousSettingsJSON = settingsJSON;
            }
        } catch (err) { console.log('tcc-dbus-client.service: unexpected error parsing settings => ' + err); }
    }
  }

  public setKeyboardBacklightStates(keyboardBacklightStates: Array<KeyboardBacklightStateInterface>) {
    window.dbusAPI.setKeyboardBacklightStatesJSON(JSON.stringify(keyboardBacklightStates));
  }

  public async triggerUpdate() {
    await this.periodicUpdate();
  }

  ngOnDestroy() {
    // Cleanup
    if (this.timeout !== undefined) {
      clearInterval(this.timeout);
    }
  }

  public async setTempProfileById(profileId: string) {
    const result = await window.dbusAPI.dbusAvailable() && await window.dbusAPI.setTempProfileById(profileId);
    return result;
  }

  public async setSensorDataCollectionStatus(status: boolean): Promise<void> {
    await window.dbusAPI.dbusAvailable() && await window.dbusAPI.setSensorDataCollectionStatus(status)
  }

  public async setDGpuD0Metrics(status: boolean): Promise<void> {
    await window.dbusAPI.dbusAvailable() && await window.dbusAPI.setDGpuD0Metrics(status)
  }

  // TODO do we still need this?
  public getInterface(): IDbusClientAPI | undefined {
    if (this.isAvailable) {
        return window.dbusAPI;
    } else {
        return undefined;
    }
  }
}
