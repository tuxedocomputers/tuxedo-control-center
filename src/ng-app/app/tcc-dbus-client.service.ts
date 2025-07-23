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
import { DbusFunctionEntry } from '../../common/models/IDbus';

@Injectable({
  providedIn: 'root'
})
export class TccDBusClientService implements OnDestroy {
  private isAvailable: boolean = true; // todo: may not be required
  private timeout: NodeJS.Timeout;
  private updateInterval: number = 500;

  public available: Subject<boolean> = new Subject<boolean>(); // todo: may not be required
  public dbusAvailable: Subject<boolean> = new Subject<boolean>();
  public isDbusAvailable: boolean = false;
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
  public isUnsupportedConfigurableTGPDevice: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(undefined);

  public isX11: BehaviorSubject<number> = new BehaviorSubject<number>(-1);
  public device: TUXEDODevice = 0;
  public hasAquaris: boolean = true;
  
  private dbusFunctionMap: Map<BehaviorSubject<any>, DbusFunctionEntry> =
    new Map<BehaviorSubject<any>, DbusFunctionEntry>([
    [
      this.fanData,
        {
          dbusFunctionName: "getFanData",
          dbusFunction: (): Promise<string> =>
            window.dbusAPI.getFanData(),
        },
      ],
      [
        this.isX11,
        {
          dbusFunctionName: "getIsX11",
          dbusFunction: (): Promise<number> =>
            window.dbusAPI.getIsX11(),
        },
      ],
      [
        this.primeState,
        {
          dbusFunctionName: "getPrimeState",
          dbusFunction: (): Promise<string> =>
            window.dbusAPI.getPrimeState(),
        },
      ],
      [
        this.iGpuInfo,
        {
          dbusFunctionName: "getIGpuInfoValuesJSON",
          dbusFunction: (): Promise<string> =>
            window.dbusAPI.getIGpuInfoValuesJSON(),
        },
      ],
      [
        this.dGpuInfo,
        {
          dbusFunctionName: "getDGpuInfoValuesJSON",
          dbusFunction: (): Promise<string> =>
            window.dbusAPI.getDGpuInfoValuesJSON(),
        },
      ],
      [
        this.cpuPower,
        {
          dbusFunctionName: "getCpuPowerValuesJSON",
          dbusFunction: (): Promise<string> =>
            window.dbusAPI.getCpuPowerValuesJSON(),
        },
      ],
      [
        this.displayModes,
        {
          dbusFunctionName: "getDisplayModesJSON",
          dbusFunction: (): Promise<string> =>
            window.dbusAPI.getDisplayModesJSON(),
        },
      ],
      [
        this.keyboardBacklightCapabilities,
        {
          dbusFunctionName: "getKeyboardBacklightCapabilitiesJSON",
          dbusFunction: (): Promise<string> =>
            window.dbusAPI.getKeyboardBacklightCapabilitiesJSON(),
        },
      ],
      [
        this.keyboardBacklightStates,
        {
          dbusFunctionName: "getKeyboardBacklightStatesJSON",
          dbusFunction: (): Promise<string> =>
            window.dbusAPI.getKeyboardBacklightStatesJSON(),
        },
      ],
  
      [
        this.fansMinSpeed,
        {
          dbusFunctionName: "getFansMinSpeed",
          dbusFunction: (): Promise<number> =>
            window.dbusAPI.getFansMinSpeed(),
        },
      ],
      [
        this.fansOffAvailable,
        {
          dbusFunctionName: "getFansOffAvailable",
          dbusFunction: (): Promise<boolean> =>
            window.dbusAPI.getFansOffAvailable(),
        },
      ],
  
      [
        this.nvidiaPowerCTRLDefaultPowerLimit,
        {
          dbusFunctionName: "getNVIDIAPowerCTRLDefaultPowerLimit",
          dbusFunction: (): Promise<number> =>
            window.dbusAPI.getNVIDIAPowerCTRLDefaultPowerLimit(),
        },
      ],
      [
        this.nvidiaPowerCTRLMaxPowerLimit,
        {
          dbusFunctionName: "getNVIDIAPowerCTRLMaxPowerLimit",
          dbusFunction: (): Promise<number> =>
            window.dbusAPI.getNVIDIAPowerCTRLMaxPowerLimit(),
        },
      ],
      [
        this.nvidiaPowerCTRLAvailable,
        {
          dbusFunctionName: "getNVIDIAPowerCTRLAvailable",
          dbusFunction: (): Promise<boolean> =>
            window.dbusAPI.getNVIDIAPowerCTRLAvailable(),
        },
      ],
      [
        this.isUnsupportedConfigurableTGPDevice,
        {
          dbusFunctionName: "getIsUnsupportedConfigurableTGPDevice",
          dbusFunction: (): Promise<boolean> =>
            window.dbusAPI.getIsUnsupportedConfigurableTGPDevice(),
        },
      ],
      [
        this.tuxedoWmiAvailable,
        {
          dbusFunctionName: "tuxedoWmiAvailable",
          dbusFunction: (): Promise<boolean> =>
            window.dbusAPI.tuxedoWmiAvailable(),
        },
      ],
      [
        this.fanHwmonAvailable,
        {
          dbusFunctionName: "fanHwmonAvailable",
          dbusFunction: (): Promise<boolean> =>
            window.dbusAPI.fanHwmonAvailable(),
        },
      ],
      [
        this.sensorDataCollectionStatus,
        {
          dbusFunctionName: "getSensorDataCollectionStatus",
          dbusFunction: (): Promise<boolean> =>
            window.dbusAPI.getSensorDataCollectionStatus(),
        },
      ],
      [
        this.chargingProfilesAvailable,
        {
          dbusFunctionName: "getChargingProfilesAvailable",
          dbusFunction: (): Promise<string[]> =>
            window.dbusAPI.getChargingProfilesAvailable(),
        },
      ],
      [
        this.webcamSWAvailable,
        {
          dbusFunctionName: "webcamSWAvailable",
          dbusFunction: (): Promise<boolean> =>
            window.dbusAPI.webcamSWAvailable(),
        },
      ],
      [
        this.webcamSWStatus,
        {
          dbusFunctionName: "getWebcamSWStatus",
          dbusFunction: (): Promise<boolean> =>
            window.dbusAPI.getWebcamSWStatus(),
        },
      ],
      [
        this.forceYUV420OutputSwitchAvailable,
        {
          dbusFunctionName: "getForceYUV420OutputSwitchAvailable",
          dbusFunction: (): Promise<boolean> =>
            window.dbusAPI.getForceYUV420OutputSwitchAvailable(),
        },
      ],
    ]);
  
  constructor(private utils: UtilsService) {
    this.updateTuxedoDevice();
    this.dbusUpdate();
    this.timeout = setInterval((): void => { this.dbusUpdate(); }, this.updateInterval);
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

  private async updateBehaviorSubject(
    behaviorSubject: BehaviorSubject<any>,
    dbusFunctionName: string,
    dbusFunction: () => Promise<any>
  ): Promise<void> {
    try {
      const data: string | string[] | boolean | number =
        await dbusFunction();

      if (data === undefined || data === "") {
        console.log(
          `tcc-dbus-client: ${dbusFunctionName} did not return data and returned "${data}" instead`
        );
        behaviorSubject.next(undefined);
        return;
      }

      if (typeof data === "string") {
        behaviorSubject.next(JSON.parse(data));
      } else {
        behaviorSubject.next(data);
      }
    } catch (err: unknown) {
      console.error(`tcc-dbus-client: ${dbusFunctionName} failed => ${err}`);
    }
  }
  
  public async getDbusData(): Promise<void> {
    const promiseArray: Promise<void>[] = Array.from(
        this.dbusFunctionMap.entries()
    ).map(
        ([behaviorSubject, { dbusFunctionName, dbusFunction }]: [
            BehaviorSubject<any>,
            DbusFunctionEntry
        ]): Promise<void> => {
            return this.updateBehaviorSubject(
                behaviorSubject,
                dbusFunctionName,
                dbusFunction
            );
        }
    );
    await Promise.all(promiseArray);
  }

  private async dbusUpdate(): Promise<void> {
    const dbusAvailable: boolean = await window.dbusAPI.dbusAvailable();
    
    this.dbusAvailable.next(dbusAvailable);
    this.isDbusAvailable = dbusAvailable;

    if(!dbusAvailable) {
        console.error("tcc-dbus-client: dbusUpdate: dbus not available");
        return;
    }

    await this.getDbusData();
    this.hasAquaris = await window.comp.getHasAquaris();

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
        if (activeProfileJSON === undefined) { console.log('tcc-dbus-client: dbusUpdate: unexpected error => no active profile'); }
        try {
            const activeProfile: TccProfile = JSON.parse(activeProfileJSON);
            // this.utils.fillDefaultValuesProfile(activeProfile);
            if (this.previousActiveProfileJSON !== activeProfileJSON) {
                this.utils.fillDefaultProfileTexts(activeProfile);
                this.activeProfile.next(activeProfile);
                this.previousActiveProfileJSON = activeProfileJSON;
            }
        } catch(err: unknown) { console.error("tcc-dbus-client: dbusUpdate: unexpected error parsing profile =>", err); }
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
            console.error("tcc-dbus-client: dbusUpdate: unexpected error parsing profile lists =>",  err);
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
        } catch (err: unknown) { console.error("tcc-dbus-client: dbusUpdate: unexpected error parsing settings =>", err); }
    }
  }

  public setKeyboardBacklightStates(keyboardBacklightStates: Array<KeyboardBacklightStateInterface>): void {
    window.dbusAPI.setKeyboardBacklightStatesJSON(JSON.stringify(keyboardBacklightStates));
  }

  public async triggerUpdate(): Promise<void> {
    await this.dbusUpdate();
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
