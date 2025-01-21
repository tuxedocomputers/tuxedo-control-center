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

import * as dbus from 'dbus-next';
import { ChargingWorker } from './ChargingWorker';
import { BehaviorSubject } from 'rxjs';
import { FnLockController } from '../../common/classes/FnLockController';
import { ChargeType } from '../../common/classes/PowerSupplyController';
import { DMIController } from '../../common/classes/DMIController';


/**
 * Structure for DBus interface data, passed to interface
 */
export class TccDBusData {
    public dbusAvailable: boolean = false;
    public device: string = "";
    public deviceHasAquaris: boolean = false;
    public displayModesJSON: string = "{}";
    public isX11: boolean = false;
    public tuxedoWmiAvailable: boolean = false;
    public fanHwmonAvailable: boolean = false;
    public tccdVersion: string = ""
    public fanData: string = "";
    public webcamSwitchAvailable: boolean = false;
    public webcamSwitchStatus: boolean = false;
    public forceYUV420OutputSwitchAvailable: boolean = false;
    public dGpuInfoValuesJSON: string = "{}";
    public iGpuInfoValuesJSON: string = "{}";
    public cpuPowerValuesJSON: string = "{}";
    public primeState: string = "";
    public modeReapplyPending: boolean;
    public tempProfileName: string = "";
    public tempProfileId: string = "";
    public activeProfileJSON: string = "{}";
    public profilesJSON: string = "{}";
    public customProfilesJSON: string = "{}";
    public defaultProfilesJSON: string = "{}";
    public defaultValuesProfileJSON: string = "{}";
    public settingsJSON: string = "{}";
    public odmProfilesAvailable: string[] = [""]
    public odmPowerLimitsJSON: string = "{}";
    public keyboardBacklightCapabilitiesJSON: string = "{}";
    public keyboardBacklightStatesJSON: string = "{}";
    public keyboardBacklightStatesNewJSON: BehaviorSubject<string> = new BehaviorSubject<string>(undefined);
    public fansMinSpeed: number = -1;
    public fansOffAvailable: boolean = false;
    public sensorDataCollectionStatus: boolean = false;
    public d0MetricsUsage: boolean = false;
    public nvidiaPowerCTRLDefaultPowerLimit: number = 0;
    public nvidiaPowerCTRLMaxPowerLimit: number = 1000;
    public nvidiaPowerCTRLAvailable: boolean = false;
    public deviceHideCTGP: boolean = true;
}

export class TccDBusOptions {
    public triggerStateCheck?: () => Promise<void>;
    public chargingWorker?: ChargingWorker;
}

export class TccDBusInterface extends dbus.interface.Interface {
    private interfaceOptions: TccDBusOptions;
    private fnLock: FnLockController = new FnLockController();
    private dataCollectionTimeout: NodeJS.Timeout | null = null;

    constructor(private data: TccDBusData, options: TccDBusOptions = {}) {
        super('com.tuxedocomputers.tccd');

        this.interfaceOptions = options;
        if (this.interfaceOptions.triggerStateCheck === undefined) {
            this.interfaceOptions.triggerStateCheck = async (): Promise<void> => {};
        }
    }

    private resetDataCollectionTimeout(): void {
        if(this.dataCollectionTimeout) {
            clearTimeout(this.dataCollectionTimeout);
        }

        this.dataCollectionTimeout = setTimeout((): void => {
            this.data.sensorDataCollectionStatus = false;
        }, 10000);
    }

    // todo: functions should start with Get or Set
    GetDeviceName(): string { return this.data.device; }
    DeviceHasAquaris(): boolean { return this.data.deviceHasAquaris; }
    GetDisplayModesJSON(): string { return this.data.displayModesJSON; }
    GetIsX11(): boolean { return this.data.isX11; }
    TuxedoWmiAvailable(): boolean { return this.data.tuxedoWmiAvailable; }
    FanHwmonAvailable(): boolean { return this.data.fanHwmonAvailable; }
    TccdVersion(): string { return this.data.tccdVersion; }
    GetFanDataJSON(): string { return this.data.fanData; }
    WebcamSWAvailable(): boolean { return this.data.webcamSwitchAvailable; }
    GetWebcamSWStatus(): boolean { return this.data.webcamSwitchStatus; }
    GetForceYUV420OutputSwitchAvailable(): boolean { return this.data.forceYUV420OutputSwitchAvailable; }

    GetDGpuInfoValuesJSON(): string {
        this.resetDataCollectionTimeout();
        return this.data.dGpuInfoValuesJSON;
    }

    GetIGpuInfoValuesJSON(): string {
        this.resetDataCollectionTimeout();
        return this.data.iGpuInfoValuesJSON;
    }

    GetCpuPowerValuesJSON(): string { return this.data.cpuPowerValuesJSON; }
    GetPrimeState(): string { return this.data.primeState; }
    SetSensorDataCollectionStatus(status: boolean): void {this.data.sensorDataCollectionStatus = status}
    GetSensorDataCollectionStatus(): boolean {
        return this.data.sensorDataCollectionStatus;
    }

    SetDGpuD0Metrics(status: boolean): void { this.data.d0MetricsUsage = status; }

    ConsumeModeReapplyPending(): boolean {
        // Unlikely, but possible race condition.
        // However no harmful impact, it will just cause the screen to flicker twice instead of once.
        if (this.data.modeReapplyPending) {
            this.data.modeReapplyPending = false;
            return true;
        }
        return false;
    }
    GetActiveProfileJSON(): string { return this.data.activeProfileJSON; }
    SetTempProfile(profileName: string): boolean {
        this.data.tempProfileName = profileName;
        return true;
    }
    SetTempProfileById(id: string): boolean {
        this.data.tempProfileId = id;
        this.interfaceOptions.triggerStateCheck();
        return true;
    }
    GetProfilesJSON(): string { return this.data.profilesJSON; }
    GetCustomProfilesJSON(): string { return this.data.customProfilesJSON; }
    GetDefaultProfilesJSON(): string { return this.data.defaultProfilesJSON; }
    GetDefaultValuesProfileJSON(): string { return this.data.defaultValuesProfileJSON; }
    GetSettingsJSON(): string { return this.data.settingsJSON; }
    ODMProfilesAvailable(): string[] { return this.data.odmProfilesAvailable; }
    ODMPowerLimitsJSON(): string { return this.data.odmPowerLimitsJSON; }
    GetKeyboardBacklightCapabilitiesJSON(): string { return this.data.keyboardBacklightCapabilitiesJSON; }
    GetKeyboardBacklightStatesJSON(): string { return this.data.keyboardBacklightStatesJSON; }
    SetKeyboardBacklightStatesJSON(keyboardBacklightStatesJSON: string): boolean {
        this.data.keyboardBacklightStatesNewJSON.next(keyboardBacklightStatesJSON);
        return true;
    }
    ModeReapplyPendingChanged(): boolean {
        return this.data.modeReapplyPending;
    }
    GetFansMinSpeed(): number { return this.data.fansMinSpeed; }
    GetFansOffAvailable(): boolean { return this.data.fansOffAvailable; }
    async GetChargingProfilesAvailable(): Promise<string> {
        return JSON.stringify(await this.interfaceOptions.chargingWorker.getChargingProfilesAvailable());
    }
    async GetCurrentChargingProfile(): Promise<string> {
        return await this.interfaceOptions.chargingWorker.getCurrentChargingProfile();
    }
    async SetChargingProfile(profileDescriptor: string): Promise<boolean> {
        return await this.interfaceOptions.chargingWorker.applyChargingProfile(profileDescriptor);
    }
    async GetChargingPrioritiesAvailable(): Promise<string> {
        return JSON.stringify(await this.interfaceOptions.chargingWorker.getChargingPrioritiesAvailable());
    }
    async GetCurrentChargingPriority(): Promise<string> {
        return await this.interfaceOptions.chargingWorker.getCurrentChargingPriority();
    }
    async SetChargingPriority(priorityDescriptor: string): Promise<boolean> {
        return await this.interfaceOptions.chargingWorker.applyChargingPriority(priorityDescriptor);
    }

    async GetChargeStartAvailableThresholds(): Promise<string> {
        return JSON.stringify(await this.interfaceOptions.chargingWorker.getChargeStartAvailableThresholds());
    }
    async GetChargeEndAvailableThresholds(): Promise<string> {
        return JSON.stringify(await this.interfaceOptions.chargingWorker.getChargeEndAvailableThresholds());
    }
    async GetChargeStartThreshold(): Promise<number> {
        return await this.interfaceOptions.chargingWorker.getChargeStartThreshold();
    }
    async GetChargeEndThreshold(): Promise<number> {
        return await this.interfaceOptions.chargingWorker.getChargeEndThreshold();
    }
    async SetChargeStartThreshold(value: number): Promise<boolean> {
        return await this.interfaceOptions.chargingWorker.setChargeStartThreshold(value);
    }
    async SetChargeEndThreshold(value: number): Promise<boolean> {
        return await this.interfaceOptions.chargingWorker.setChargeEndThreshold(value);
    }
    async GetChargeType(): Promise<string> {
        return await this.interfaceOptions.chargingWorker.getChargeType();
    }
    async SetChargeType(type: ChargeType): Promise<boolean> {
        return await this.interfaceOptions.chargingWorker.setChargeType(type);
    }

    GetFnLockSupported(): boolean {
        return this.fnLock.getFnLockSupported();
    }
    GetFnLockStatus(): boolean {
        return this.fnLock.getFnLockStatus();
    }
    SetFnLockStatus(status: boolean): void {
        this.fnLock.setFnLockStatus(status);
    }

    GetNVIDIAPowerCTRLDefaultPowerLimit(): number {
        return this.data.nvidiaPowerCTRLDefaultPowerLimit;
    }

    GetNVIDIAPowerCTRLMaxPowerLimit(): number {
        return this.data.nvidiaPowerCTRLMaxPowerLimit;
    }

    GetNVIDIAPowerCTRLAvailable(): boolean {
        return this.data.nvidiaPowerCTRLAvailable;
    }
    GetHideCTGP(): boolean {
        return this.data.deviceHideCTGP
    }

    dbusAvailable(): boolean {
        return this.data.dbusAvailable
    }
}

TccDBusInterface.configureMembers({
    properties: {
    },
    methods: {
        dbusAvailable: {outSignature: 'b'},
        GetDeviceName: {outSignature: 's'},
        DeviceHasAquaris: { outSignature: 'b'},
        GetDisplayModesJSON: {outSignature: 's'},
        GetIsX11: { outSignature: 'b'},
        TuxedoWmiAvailable: { outSignature: 'b' },
        FanHwmonAvailable: { outSignature: 'b' },
        TccdVersion: { outSignature: 's' },
        GetFanDataJSON: { outSignature: 's' },
        WebcamSWAvailable: { outSignature: 'b' },
        GetWebcamSWStatus: { outSignature: 'b' },
        GetForceYUV420OutputSwitchAvailable: { outSignature: 'b' },
        GetDGpuInfoValuesJSON: { outSignature: "s" },
        GetIGpuInfoValuesJSON: { outSignature: "s" },
        GetCpuPowerValuesJSON: { outSignature: 's' },
        GetPrimeState: { outSignature: 's' },
        ConsumeModeReapplyPending: { outSignature: 'b' },
        GetActiveProfileJSON: { outSignature: 's' },
        SetTempProfile: { inSignature: 's',  outSignature: 'b' },
        SetTempProfileById: { inSignature: 's',  outSignature: 'b' },
        GetProfilesJSON: { outSignature: 's' },
        GetCustomProfilesJSON: { outSignature: 's' },
        GetDefaultProfilesJSON: { outSignature: 's' },
        GetDefaultValuesProfileJSON: { outSignature: 's' },
        GetSettingsJSON: { outSignature: 's' },
        ODMProfilesAvailable: { outSignature: 'as' },
        ODMPowerLimitsJSON: { outSignature: 's' },
        GetKeyboardBacklightCapabilitiesJSON: { outSignature: 's' },
        GetKeyboardBacklightStatesJSON: { outSignature: 's' },
        SetKeyboardBacklightStatesJSON: { inSignature: 's',  outSignature: 'b' },
        GetFansMinSpeed: { outSignature: 'i' },
        GetFansOffAvailable: { outSignature: 'b' },
        GetChargingProfilesAvailable: { outSignature: 's' },
        GetCurrentChargingProfile: { outSignature: 's' },
        SetChargingProfile: { inSignature: 's', outSignature: 'b' },
        GetChargingPrioritiesAvailable: { outSignature: 's' },
        GetCurrentChargingPriority: { outSignature: 's' },
        SetChargingPriority: { inSignature: 's', outSignature: 'b' },
        GetChargeStartAvailableThresholds: { outSignature: 's' },
        GetChargeEndAvailableThresholds: { outSignature: 's' },
        GetChargeStartThreshold: { outSignature: 'i' },
        GetChargeEndThreshold: { outSignature: 'i' },
        SetChargeStartThreshold: { inSignature: 'i', outSignature: 'b' },
        SetChargeEndThreshold: { inSignature: 'i', outSignature: 'b' },
        GetChargeType: { outSignature: 's' },
        SetChargeType: { inSignature: 's', outSignature: 'b' },
        GetFnLockSupported: { outSignature: "b" },
        GetFnLockStatus: { outSignature: "b" },
        SetFnLockStatus: { inSignature: "b" },
        SetSensorDataCollectionStatus: { inSignature: 'b' },
        GetSensorDataCollectionStatus: { outSignature: 'b' },
        SetDGpuD0Metrics: { inSignature: 'b' },
        GetNVIDIAPowerCTRLDefaultPowerLimit: { outSignature: 'i' },
        GetNVIDIAPowerCTRLMaxPowerLimit: { outSignature: 'i' },
        GetNVIDIAPowerCTRLAvailable: { outSignature: 'b' },
        GetHideCTGP: { outSignature: 'b' }
    },
    signals: {
        ModeReapplyPendingChanged: { signature: 'b' }
    }
});
