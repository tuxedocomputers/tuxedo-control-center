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

import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
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

@Injectable({
  providedIn: 'root'
})
export class TccDBusClientService implements OnDestroy {
  private isAvailable: boolean = true; // todo: may not be required
  private timeout: NodeJS.Timeout;
  private updateInterval: number = 500;

  public available: Subject<boolean> = new Subject<boolean>(); // todo: may not be required
  public dbusAvailable: Subject<boolean> = new Subject<boolean>();
  public tuxedoWmiAvailable: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(true);
  public fanHwmonAvailable: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(true);
  public dataLoaded: boolean = false;
  public fanData: BehaviorSubject<IDBusFanData> = new BehaviorSubject<IDBusFanData>({cpu: new FanData(), gpu1: new FanData(), gpu2: new FanData() });

  public webcamSWAvailable: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(undefined);
  public webcamSWStatus: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(undefined);

  public forceYUV420OutputSwitchAvailable: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  public chargingProfilesAvailable: BehaviorSubject<string[]> = new BehaviorSubject<string[]>([]);

  public odmProfilesAvailable: BehaviorSubject<string[]> = new BehaviorSubject<string[]>([]);
  public odmPowerLimits: BehaviorSubject<TDPInfo[]> = new BehaviorSubject<TDPInfo[]>([]);

  public customProfiles: BehaviorSubject<ITccProfile[]> = new BehaviorSubject<ITccProfile[]>([]);
  public defaultProfiles: BehaviorSubject<ITccProfile[]> = new BehaviorSubject<ITccProfile[]>([]);
  public defaultValuesProfile: BehaviorSubject<ITccProfile> = new BehaviorSubject<ITccProfile>(undefined);
  private previousCustomProfilesJSON: string = '';
  private previousDefaultProfilesJSON: string = '';
  private previousDefaultValuesProfileJSON: string = '';

  public activeProfile: BehaviorSubject<TccProfile> = new BehaviorSubject<TccProfile>(undefined);
  private previousActiveProfileJSON: string = '';

  public settings: BehaviorSubject<ITccSettings> = new BehaviorSubject<ITccSettings>(undefined);
  private previousSettingsJSON: string = '';

  public keyboardBacklightCapabilities: BehaviorSubject<KeyboardBacklightCapabilitiesInterface> = new BehaviorSubject<KeyboardBacklightCapabilitiesInterface>(undefined);
  public keyboardBacklightStates: BehaviorSubject<Array<KeyboardBacklightStateInterface>> = new BehaviorSubject<Array<KeyboardBacklightStateInterface>>(undefined);

  public fansMinSpeed: BehaviorSubject<number> = new BehaviorSubject<number>(undefined);
  public fansOffAvailable: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(undefined);

  public dGpuInfo: BehaviorSubject<IdGpuInfo> = new BehaviorSubject<IdGpuInfo>(undefined);
  public iGpuInfo: BehaviorSubject<IiGpuInfo> = new BehaviorSubject<IiGpuInfo>(undefined);
  public cpuPower: BehaviorSubject<ICpuPower> = new BehaviorSubject<ICpuPower>(undefined);
  public sensorDataCollectionStatus: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(undefined);

  public primeState: BehaviorSubject<string> = new BehaviorSubject<string>(undefined);

  public displayModes: BehaviorSubject<IDisplayFreqRes> = new BehaviorSubject<IDisplayFreqRes>(undefined);
  public refreshRateSupported: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(undefined);
  public nvidiaPowerCTRLDefaultPowerLimit: BehaviorSubject<number> = new BehaviorSubject<number>(undefined);
  public nvidiaPowerCTRLMaxPowerLimit: BehaviorSubject<number> = new BehaviorSubject<number>(undefined);
  public nvidiaPowerCTRLAvailable: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(undefined);
  public hideCTGP: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(undefined);

  public isX11: BehaviorSubject<number> = new BehaviorSubject<number>(-1);
  public device: TUXEDODevice = 0;
  public hasAquaris: boolean = true;


// todo: refactor, put types into a seperate place
private observableUpdateListJSON: Map<TccDBusClientService["fanData"] | TccDBusClientService["iGpuInfo"] | TccDBusClientService["dGpuInfo"] |
    TccDBusClientService["cpuPower"] | TccDBusClientService["displayModes"] | TccDBusClientService["keyboardBacklightCapabilities"] |
    TccDBusClientService["keyboardBacklightStates"], string> = new Map().set(this.fanData, "getFanData")
    .set(this.iGpuInfo, "getIGpuInfoValuesJSON")
    .set(this.dGpuInfo, "getDGpuInfoValuesJSON")
    .set(this.cpuPower, "getCpuPowerValuesJSON")
    .set(this.displayModes, "getDisplayModesJSON")
    .set(this.keyboardBacklightCapabilities, "getKeyboardBacklightCapabilitiesJSON")
    .set(this.keyboardBacklightStates, "getKeyboardBacklightStatesJSON")

  constructor(private utils: UtilsService) {
    this.updateTuxedoDevice();
    this.periodicUpdate();
    this.timeout = setInterval((): void => { this.periodicUpdate(); }, this.updateInterval);
  }

  // updates an observable that wants parsed JSON input
  private async updateJSONObservable(observable: BehaviorSubject<any>, updateFunction: string): Promise<void> {
    // https://stackoverflow.com/questions/1723287/calling-a-javascript-function-named-in-a-variable
    const data: any = await window.dbusAPI[updateFunction]();
    try{
        if (data) {
            const parsedData: string = JSON.parse(data);
            observable.next(parsedData);
        }
        // todo: maybe only running data to empty once to avoid logging too much
        if (!data) {
            observable.next({});
            console.log(`tcc-dbus-client: updateJSONObservable: window.dbusAPI did not return data for ${updateFunction}`)
        }
    }
    catch(err: unknown) {
        console.error("tcc-dbus-client: updateJSONObservable failed =>", err)
        // TODO, set stuff to default values? Do more error handling? Check if dbus is even up?
        //console.error("Could not update observable through function " + updateFunction +"\n" + err);
    }
  }

  // Display Brightness Gnome Workarounds

  displayBrightnessNotSupportedGnome(): boolean
  {
    return window.ipc.displayBrightnessNotSupportedGnome()
  }

  async setDisplayBrightnessGnome(valuePercent: number): Promise<void>
  {
     return window.ipc.setDisplayBrightnessGnome(valuePercent)
  }

  private async updateTuxedoDevice(): Promise<void> {
    const deviceJSON: string = await window.dbusAPI.getDeviceJSON();
    if (deviceJSON) {
        this.device = JSON.parse(deviceJSON);
    }
  }

  private async periodicUpdate(): Promise<void> {
    const dbusAvailable: boolean = await window.dbusAPI.dbusAvailable()
    this.dbusAvailable.next(dbusAvailable)
    if(!this.dbusAvailable) {
        console.error("tcc-dbus-client: periodicUpdate: Communication with TCCD interrupted, dbus not available");
        return;
    }
    for ( const [obs,func] of this.observableUpdateListJSON.entries()) {
        this.updateJSONObservable(obs,func);
    }
    this.isX11.next(await window.dbusAPI.getIsX11());

    this.fansMinSpeed.next(await window.dbusAPI.getFansMinSpeed());
    this.fansOffAvailable.next(await window.dbusAPI.getFansOffAvailable());

    this.nvidiaPowerCTRLDefaultPowerLimit.next(await window.dbusAPI.getNVIDIAPowerCTRLDefaultPowerLimit());
    this.nvidiaPowerCTRLMaxPowerLimit.next(await window.dbusAPI.getNVIDIAPowerCTRLMaxPowerLimit());
    this.nvidiaPowerCTRLAvailable.next(await window.dbusAPI.getNVIDIAPowerCTRLAvailable());
    this.hideCTGP.next(await window.dbusAPI.getHideCTGP());

    // Read and publish data (note: atm polled)
    const wmiAvailability: boolean = await window.dbusAPI.tuxedoWmiAvailable();
    this.tuxedoWmiAvailable.next(wmiAvailability);

    const fanHwmonAvailability: boolean = await window.dbusAPI.fanHwmonAvailable();
    this.fanHwmonAvailable.next(fanHwmonAvailability);
    this.hasAquaris = await window.comp.getHasAquaris();
    this.sensorDataCollectionStatus.next(await window.dbusAPI.getSensorDataCollectionStatus())

    // todo: i assume that availability shouldn't change during a session and thus periodic checks result in unnecessary file access
    // probably better to only check if global settings are accessed and also only once
    this.chargingProfilesAvailable.next(
        await window.dbusAPI.getChargingProfilesAvailable()
    );

    this.primeState.next(await window.dbusAPI.getPrimeState())
    this.webcamSWAvailable.next(await window.dbusAPI.webcamSWAvailable());
    this.webcamSWStatus.next(await window.dbusAPI.getWebcamSWStatus());

    this.forceYUV420OutputSwitchAvailable.next(await window.dbusAPI.getForceYUV420OutputSwitchAvailable());

    const nextODMProfilesAvailable: string[] = await window.dbusAPI.odmProfilesAvailable();
    this.odmProfilesAvailable.next(nextODMProfilesAvailable !== undefined ? nextODMProfilesAvailable : []);
    // TODO
    const nextODMPowerLimitsJSON: string = await window.dbusAPI.odmPowerLimitsJSON();
    if (nextODMPowerLimitsJSON) {
        const nextODMPowerLimits: TDPInfo[] = JSON.parse(nextODMPowerLimitsJSON);
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
        } catch(err: unknown) { console.error("tcc-dbus-client.service: unexpected error parsing profile =>", err); }
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
        } catch (err: unknown) {
            console.error("tcc-dbus-client.service: unexpected error parsing profile lists =>",  err);
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
        } catch (err: unknown) { console.error("tcc-dbus-client.service: unexpected error parsing settings =>", err); }
    }
  }

  public setKeyboardBacklightStates(keyboardBacklightStates: Array<KeyboardBacklightStateInterface>): void {
    window.dbusAPI.setKeyboardBacklightStatesJSON(JSON.stringify(keyboardBacklightStates));
  }

  public async triggerUpdate(): Promise<void> {
    await this.periodicUpdate();
  }

  ngOnDestroy(): void {
    // Cleanup
    if (this.timeout !== undefined) {
      clearInterval(this.timeout);
    }
  }

  public async setTempProfileById(profileId: string): Promise<boolean> {
    const result: boolean = await window.dbusAPI.dbusAvailable() && await window.dbusAPI.setTempProfileById(profileId);
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
