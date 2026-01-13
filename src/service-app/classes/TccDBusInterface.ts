/*!
 * Copyright (c) 2019-2026 TUXEDO Computers GmbH <tux@tuxedocomputers.com>
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
import { BehaviorSubject } from 'rxjs';
import { FnLockController } from '../../common/classes/FnLockController';
import type { ChargeType } from '../../common/classes/PowerSupplyController';
import type { ChargingWorker } from './ChargingWorker';

/**
 * Structure for DBus interface data, passed to interface
 */
export class TccDBusData {
    public dbusAvailable: boolean = false;
    public device: string = '';
    public deviceHasAquaris: boolean = false;
    public displayModesJSON: string = '{}';
    public isX11: number = -1;
    public tuxedoWmiAvailable: boolean = false;
    public fanHwmonAvailable: boolean = false;
    public tccdVersion: string = '';
    public fanData: string = '';
    public webcamSwitchAvailable: boolean = false;
    public webcamSwitchStatus: boolean = false;
    public forceYUV420OutputSwitchAvailable: boolean = false;
    public iGpuInfoValuesJSON: string = '{}';
    public dGpuInfoValuesJSON: string = '{}';
    public iGpuAvailable: number = -1;
    public dGpuAvailable: number = -1;
    public cpuPowerValuesJSON: string = '{}';
    public primeState: string = '-1';
    public modeReapplyPending: boolean;
    public tempProfileName: string = '';
    public tempProfileId: string = '';
    public activeProfileJSON: string = '{}';
    public profilesJSON: string = '{}';
    public customProfilesJSON: string = '{}';
    public defaultProfilesJSON: string = '{}';
    public defaultValuesProfileJSON: string = '{}';
    public settingsJSON: string = '{}';
    public odmProfilesAvailable: string[] = [''];
    public odmPowerLimitsJSON: string = '{}';
    public keyboardBacklightCapabilitiesJSON: string = '{}';
    public keyboardBacklightStatesJSON: string = '{}';
    public keyboardBacklightStatesNewJSON: BehaviorSubject<string> = new BehaviorSubject<string>(undefined);
    public fansMinSpeed: number = -1;
    public fansOffAvailable: boolean = false;
    public sensorDataCollectionStatus: boolean = false;
    public d0MetricsUsage: boolean = false;
    public nvidiaPowerCTRLDefaultPowerLimit: number = 0;
    public nvidiaPowerCTRLMaxPowerLimit: number = 1000;
    public nvidiaPowerCTRLAvailable: boolean = false;
    public isUnsupportedConfigurableTGPDevice: boolean = true;
}

export class TccDBusOptions {
    public triggerStateCheck?: () => Promise<void>;
    public chargingWorker?: ChargingWorker;
}

export class TccDBusInterface extends dbus.interface.Interface {
    private interfaceOptions: TccDBusOptions;
    private fnLock: FnLockController = new FnLockController();
    private dataCollectionTimeout: NodeJS.Timeout | null = null;

    constructor(
        private data: TccDBusData,
        options: TccDBusOptions = {},
    ) {
        super('com.tuxedocomputers.tccd');

        this.interfaceOptions = options;
        if (this.interfaceOptions.triggerStateCheck === undefined) {
            this.interfaceOptions.triggerStateCheck = async (): Promise<void> => {};
        }
    }

    private resetDataCollectionTimeout(): void {
        if (this.dataCollectionTimeout) {
            clearTimeout(this.dataCollectionTimeout);
        }

        this.dataCollectionTimeout = setTimeout((): void => {
            this.data.sensorDataCollectionStatus = false;
        }, 10000);
    }

    // todo: functions should start with Get or Set
    private GetDeviceName(): string {
        return this.data.device;
    }
    private DeviceHasAquaris(): boolean {
        return this.data.deviceHasAquaris;
    }
    private GetDisplayModesJSON(): string {
        return this.data.displayModesJSON;
    }
    private GetIsX11(): number {
        return this.data.isX11;
    }
    private TuxedoWmiAvailable(): boolean {
        return this.data.tuxedoWmiAvailable;
    }
    private FanHwmonAvailable(): boolean {
        return this.data.fanHwmonAvailable;
    }
    private TccdVersion(): string {
        return this.data.tccdVersion;
    }
    private GetFanDataJSON(): string {
        return this.data.fanData;
    }
    private WebcamSWAvailable(): boolean {
        return this.data.webcamSwitchAvailable;
    }
    private GetWebcamSWStatus(): boolean {
        return this.data.webcamSwitchStatus;
    }
    private GetForceYUV420OutputSwitchAvailable(): boolean {
        return this.data.forceYUV420OutputSwitchAvailable;
    }

    private GetIGpuInfoValuesJSON(): string {
        this.resetDataCollectionTimeout();
        return this.data.iGpuInfoValuesJSON;
    }

    private GetDGpuInfoValuesJSON(): string {
        this.resetDataCollectionTimeout();
        return this.data.dGpuInfoValuesJSON;
    }

    private GetIGpuAvailable(): number {
        return this.data.iGpuAvailable;
    }

    private GetDGpuAvailable(): number {
        return this.data.dGpuAvailable;
    }

    private GetPrimeState(): string {
        return this.data.primeState;
    }
    private GetCpuPowerValuesJSON(): string {
        return this.data.cpuPowerValuesJSON;
    }

    private SetSensorDataCollectionStatus(status: boolean): void {
        this.data.sensorDataCollectionStatus = status;
    }
    private GetSensorDataCollectionStatus(): boolean {
        return this.data.sensorDataCollectionStatus;
    }

    private SetDGpuD0Metrics(status: boolean): void {
        this.data.d0MetricsUsage = status;
    }

    private ConsumeModeReapplyPending(): boolean {
        // Unlikely, but possible race condition.
        // However no harmful impact, it will just cause the screen to flicker twice instead of once.
        if (this.data.modeReapplyPending) {
            this.data.modeReapplyPending = false;
            return true;
        }
        return false;
    }
    private GetActiveProfileJSON(): string {
        return this.data.activeProfileJSON;
    }
    private SetTempProfile(profileName: string): boolean {
        this.data.tempProfileName = profileName;
        return true;
    }
    private SetTempProfileById(id: string): boolean {
        this.data.tempProfileId = id;
        this.interfaceOptions.triggerStateCheck();
        return true;
    }
    private GetProfilesJSON(): string {
        return this.data.profilesJSON;
    }
    private GetCustomProfilesJSON(): string {
        return this.data.customProfilesJSON;
    }
    private GetDefaultProfilesJSON(): string {
        return this.data.defaultProfilesJSON;
    }
    private GetDefaultValuesProfileJSON(): string {
        return this.data.defaultValuesProfileJSON;
    }
    private GetSettingsJSON(): string {
        return this.data.settingsJSON;
    }
    private ODMProfilesAvailable(): string[] {
        return this.data.odmProfilesAvailable;
    }
    private ODMPowerLimitsJSON(): string {
        return this.data.odmPowerLimitsJSON;
    }
    private GetKeyboardBacklightCapabilitiesJSON(): string {
        return this.data.keyboardBacklightCapabilitiesJSON;
    }
    private GetKeyboardBacklightStatesJSON(): string {
        return this.data.keyboardBacklightStatesJSON;
    }
    private SetKeyboardBacklightStatesJSON(keyboardBacklightStatesJSON: string): boolean {
        this.data.keyboardBacklightStatesNewJSON.next(keyboardBacklightStatesJSON);
        return true;
    }
    public ModeReapplyPendingChanged(): boolean {
        return this.data.modeReapplyPending;
    }
    private GetFansMinSpeed(): number {
        return this.data.fansMinSpeed;
    }
    private GetFansOffAvailable(): boolean {
        return this.data.fansOffAvailable;
    }
    private async GetChargingProfilesAvailable(): Promise<string> {
        return JSON.stringify(await this.interfaceOptions.chargingWorker.getChargingProfilesAvailable());
    }
    private async GetCurrentChargingProfile(): Promise<string> {
        return await this.interfaceOptions.chargingWorker.getCurrentChargingProfile();
    }
    private async SetChargingProfile(profileDescriptor: string): Promise<boolean> {
        return await this.interfaceOptions.chargingWorker.applyChargingProfile(profileDescriptor);
    }
    private async GetChargingPrioritiesAvailable(): Promise<string> {
        return JSON.stringify(await this.interfaceOptions.chargingWorker.getChargingPrioritiesAvailable());
    }
    private async GetCurrentChargingPriority(): Promise<string> {
        return await this.interfaceOptions.chargingWorker.getCurrentChargingPriority();
    }
    private async SetChargingPriority(priorityDescriptor: string): Promise<boolean> {
        return await this.interfaceOptions.chargingWorker.applyChargingPriority(priorityDescriptor);
    }

    private async GetChargeStartAvailableThresholds(): Promise<string> {
        return JSON.stringify(await this.interfaceOptions.chargingWorker.getChargeStartAvailableThresholds());
    }
    private async GetChargeEndAvailableThresholds(): Promise<string> {
        return JSON.stringify(await this.interfaceOptions.chargingWorker.getChargeEndAvailableThresholds());
    }
    private async GetChargeStartThreshold(): Promise<number> {
        return await this.interfaceOptions.chargingWorker.getChargeStartThreshold();
    }
    private async GetChargeEndThreshold(): Promise<number> {
        return await this.interfaceOptions.chargingWorker.getChargeEndThreshold();
    }
    private async SetChargeStartThreshold(value: number): Promise<boolean> {
        return await this.interfaceOptions.chargingWorker.setChargeStartThreshold(value);
    }
    private async SetChargeEndThreshold(value: number): Promise<boolean> {
        return await this.interfaceOptions.chargingWorker.setChargeEndThreshold(value);
    }
    private async GetChargeType(): Promise<string> {
        return await this.interfaceOptions.chargingWorker.getChargeType();
    }
    private async SetChargeType(type: ChargeType): Promise<boolean> {
        return await this.interfaceOptions.chargingWorker.setChargeType(type);
    }

    private GetFnLockSupported(): boolean {
        return this.fnLock.getFnLockSupported();
    }
    private GetFnLockStatus(): boolean {
        return this.fnLock.getFnLockStatus();
    }
    private SetFnLockStatus(status: boolean): void {
        this.fnLock.setFnLockStatus(status);
    }

    private GetNVIDIAPowerCTRLDefaultPowerLimit(): number {
        return this.data.nvidiaPowerCTRLDefaultPowerLimit;
    }

    private GetNVIDIAPowerCTRLMaxPowerLimit(): number {
        return this.data.nvidiaPowerCTRLMaxPowerLimit;
    }

    private GetNVIDIAPowerCTRLAvailable(): boolean {
        return this.data.nvidiaPowerCTRLAvailable;
    }
    private GetIsUnsupportedConfigurableTGPDevice(): boolean {
        return this.data.isUnsupportedConfigurableTGPDevice;
    }

    private dbusAvailable(): boolean {
        return this.data.dbusAvailable;
    }
}

TccDBusInterface.configureMembers({
    properties: {},
    methods: {
        dbusAvailable: { outSignature: 'b' },
        GetDeviceName: { outSignature: 's' },
        DeviceHasAquaris: { outSignature: 'b' },
        GetDisplayModesJSON: { outSignature: 's' },
        GetIsX11: { outSignature: 'i' },
        TuxedoWmiAvailable: { outSignature: 'b' },
        FanHwmonAvailable: { outSignature: 'b' },
        TccdVersion: { outSignature: 's' },
        GetFanDataJSON: { outSignature: 's' },
        WebcamSWAvailable: { outSignature: 'b' },
        GetWebcamSWStatus: { outSignature: 'b' },
        GetForceYUV420OutputSwitchAvailable: { outSignature: 'b' },
        GetIGpuInfoValuesJSON: { outSignature: 's' },
        GetDGpuInfoValuesJSON: { outSignature: 's' },
        GetIGpuAvailable: { outSignature: 'i' },
        GetDGpuAvailable: { outSignature: 'i' },
        GetPrimeState: { outSignature: 's' },
        GetCpuPowerValuesJSON: { outSignature: 's' },
        ConsumeModeReapplyPending: { outSignature: 'b' },
        GetActiveProfileJSON: { outSignature: 's' },
        SetTempProfile: { inSignature: 's', outSignature: 'b' },
        SetTempProfileById: { inSignature: 's', outSignature: 'b' },
        GetProfilesJSON: { outSignature: 's' },
        GetCustomProfilesJSON: { outSignature: 's' },
        GetDefaultProfilesJSON: { outSignature: 's' },
        GetDefaultValuesProfileJSON: { outSignature: 's' },
        GetSettingsJSON: { outSignature: 's' },
        ODMProfilesAvailable: { outSignature: 'as' },
        ODMPowerLimitsJSON: { outSignature: 's' },
        GetKeyboardBacklightCapabilitiesJSON: { outSignature: 's' },
        GetKeyboardBacklightStatesJSON: { outSignature: 's' },
        SetKeyboardBacklightStatesJSON: { inSignature: 's', outSignature: 'b' },
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
        GetFnLockSupported: { outSignature: 'b' },
        GetFnLockStatus: { outSignature: 'b' },
        SetFnLockStatus: { inSignature: 'b' },
        SetSensorDataCollectionStatus: { inSignature: 'b' },
        GetSensorDataCollectionStatus: { outSignature: 'b' },
        SetDGpuD0Metrics: { inSignature: 'b' },
        GetNVIDIAPowerCTRLDefaultPowerLimit: { outSignature: 'i' },
        GetNVIDIAPowerCTRLMaxPowerLimit: { outSignature: 'i' },
        GetNVIDIAPowerCTRLAvailable: { outSignature: 'b' },
        GetIsUnsupportedConfigurableTGPDevice: { outSignature: 'b' },
    },
    signals: {
        ModeReapplyPendingChanged: { signature: 'b' },
    },
});
