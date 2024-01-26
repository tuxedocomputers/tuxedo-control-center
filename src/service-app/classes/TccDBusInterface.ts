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
import * as dbus from 'dbus-next';
import { ChargingWorker } from './ChargingWorker';
import { BehaviorSubject } from 'rxjs';
import { FnLockController } from '../../common/classes/FnLockController';


function dbusVariant<T>(signature: string, value: T): dbus.Variant<T> {
    const v = new dbus.Variant<T>();
    v.signature = signature;
    v.value = value;
    return v;
}

function exportOwnProperties(obj: object, keys: string[]) {
    const o = {};
    for (const key of keys) {
        if (obj[key].export !== undefined) {
            o[key] = obj[key].export();
        } else {
            o[key] = obj[key];
        }
    }
    return o;
}

/**
 * Structure for timestamped data
 */
export class TimeData<T> {
    public timestamp: dbus.Variant<number>;
    constructor(private timestampNumber: number, public data: dbus.Variant<T>) {
        this.timestamp = dbusVariant('x', timestampNumber);
    }
    set(timestamp: number, data: T) { this.timestamp.value = timestamp; this.data.value = data; }
    export() {
        return exportOwnProperties(this, ['timestamp', 'data']);
    }
}

/**
 * Structure for fan data
 */
export class FanData {
    public speed = new TimeData<number>(0, dbusVariant('i', 0));
    public temp = new TimeData<number>(0, dbusVariant('i', 0));
    export() {
        return exportOwnProperties(this, ['speed', 'temp']);
    }
}

/**
 * Structure for DBus interface data, passed to interface
 */
export class TccDBusData {
    public device: string;
    public displayModes: string;
    public refreshRateSupported: boolean;
    public tuxedoWmiAvailable: boolean;
    public fanHwmonAvailable: boolean;
    public tccdVersion: string;
    public fans: FanData[];
    public webcamSwitchAvailable: boolean;
    public webcamSwitchStatus: boolean;
    public forceYUV420OutputSwitchAvailable: boolean;
    public dGpuInfoValuesJSON: string;
    public iGpuInfoValuesJSON: string;
    public cpuPowerValuesJSON: string;
    public primeState: string;
    public modeReapplyPending: boolean;
    public tempProfileName: string;
    public tempProfileId: string;
    public activeProfileJSON: string;
    public profilesJSON: string;
    public customProfilesJSON: string;
    public defaultProfilesJSON: string;
    public defaultValuesProfileJSON: string;
    public settingsJSON: string;
    public odmProfilesAvailable: string[];
    public odmPowerLimitsJSON: string;
    public keyboardBacklightCapabilitiesJSON: string;
    public keyboardBacklightStatesJSON: string;
    public keyboardBacklightStatesNewJSON: BehaviorSubject<string> = new BehaviorSubject<string>(undefined);
    public fansMinSpeed: number;
    public fansOffAvailable: boolean;
    public sensorDataCollectionStatus: boolean = false;
    public d0MetricsUsage: boolean = false;
    constructor(numberFans: number) { this.fans = new Array<FanData>(numberFans).fill(undefined).map(fan => new FanData()); }
    // export() { return this.fans.map(fan => fan.export()); }
}

export class TccDBusOptions {
    public triggerStateCheck?: () => Promise<void>;
    public chargingWorker?: ChargingWorker;
}

export class TccDBusInterface extends dbus.interface.Interface {
    private interfaceOptions: TccDBusOptions;
    private fnLock: FnLockController = new FnLockController();

    constructor(private data: TccDBusData, options: TccDBusOptions = {}) {
        super('com.tuxedocomputers.tccd');

        this.interfaceOptions = options;
        if (this.interfaceOptions.triggerStateCheck === undefined) {
            this.interfaceOptions.triggerStateCheck = async () => {};
        }
    }
    GetDeviceName() { return this.data.device; }
    GetDisplayModesJSON() { return this.data.displayModes; }
    GetRefreshRateSupported() { return this.data.refreshRateSupported; }
    TuxedoWmiAvailable() { return this.data.tuxedoWmiAvailable; }
    FanHwmonAvailable() { return this.data.fanHwmonAvailable; }
    TccdVersion() { return this.data.tccdVersion; }
    GetFanDataCPU() { return this.data.fans[0].export(); }
    GetFanDataGPU1() { return this.data.fans[1].export(); }
    GetFanDataGPU2() { return this.data.fans[2].export(); }
    WebcamSWAvailable() { return this.data.webcamSwitchAvailable; }
    GetWebcamSWStatus() { return this.data.webcamSwitchStatus; }
    GetForceYUV420OutputSwitchAvailable() { return this.data.forceYUV420OutputSwitchAvailable; }
    GetDGpuInfoValuesJSON() { return this.data.dGpuInfoValuesJSON; }
    GetIGpuInfoValuesJSON() { return this.data.iGpuInfoValuesJSON; }
    GetCpuPowerValuesJSON() { return this.data.cpuPowerValuesJSON; }
    GetPrimeState() { return this.data.primeState; }
    SetSensorDataCollectionStatus(status: boolean) {this.data.sensorDataCollectionStatus = status}
    GetSensorDataCollectionStatus() {
        return this.data.sensorDataCollectionStatus;
    }
    
    SetDGpuD0Metrics(status: boolean) { this.data.d0MetricsUsage = status; }

    ConsumeModeReapplyPending() {
        // Unlikely, but possible race condition.
        // However no harmful impact, it will just cause the screen to flicker twice instead of once.
        if (this.data.modeReapplyPending) {
            this.data.modeReapplyPending = false;
            return true;
        }
        return false;
    }
    GetActiveProfileJSON() { return this.data.activeProfileJSON; }
    SetTempProfile(profileName: string) {
        this.data.tempProfileName = profileName;
        return true;
    }
    SetTempProfileById(id: string) {
        this.data.tempProfileId = id;
        this.interfaceOptions.triggerStateCheck();
        return true;
    }
    GetProfilesJSON() { return this.data.profilesJSON; }
    GetCustomProfilesJSON() { return this.data.customProfilesJSON; }
    GetDefaultProfilesJSON() { return this.data.defaultProfilesJSON; }
    GetDefaultValuesProfileJSON() { return this.data.defaultValuesProfileJSON; }
    GetSettingsJSON() { return this.data.settingsJSON; }
    ODMProfilesAvailable() { return this.data.odmProfilesAvailable; }
    ODMPowerLimitsJSON() { return this.data.odmPowerLimitsJSON; }
    GetKeyboardBacklightCapabilitiesJSON() { return this.data.keyboardBacklightCapabilitiesJSON; }
    GetKeyboardBacklightStatesJSON() { return this.data.keyboardBacklightStatesJSON; }
    SetKeyboardBacklightStatesJSON(keyboardBacklightStatesJSON: string) {
        this.data.keyboardBacklightStatesNewJSON.next(keyboardBacklightStatesJSON);
        return true;
    }
    ModeReapplyPendingChanged() {
        return this.data.modeReapplyPending;
    }
    GetFansMinSpeed() { return this.data.fansMinSpeed; }
    GetFansOffAvailable() { return this.data.fansOffAvailable; }
    async GetChargingProfilesAvailable() {
        return JSON.stringify(await this.interfaceOptions.chargingWorker.getChargingProfilesAvailable());
    }
    async GetCurrentChargingProfile() {
        return await this.interfaceOptions.chargingWorker.getCurrentChargingProfile();
    }
    async SetChargingProfile(profileDescriptor: string) {
        return await this.interfaceOptions.chargingWorker.applyChargingProfile(profileDescriptor);
    }
    async GetChargingPrioritiesAvailable() {
        return JSON.stringify(await this.interfaceOptions.chargingWorker.getChargingPrioritiesAvailable());
    }
    async GetCurrentChargingPriority() {
        return await this.interfaceOptions.chargingWorker.getCurrentChargingPriority();
    }
    async SetChargingPriority(priorityDescriptor: string) {
        return await this.interfaceOptions.chargingWorker.applyChargingPriority(priorityDescriptor);
    }

    async GetChargeStartAvailableThresholds() {
        return JSON.stringify(await this.interfaceOptions.chargingWorker.getChargeStartAvailableThresholds());
    }
    async GetChargeEndAvailableThresholds() {
        return JSON.stringify(await this.interfaceOptions.chargingWorker.getChargeEndAvailableThresholds());
    }
    async GetChargeStartThreshold() {
        return await this.interfaceOptions.chargingWorker.getChargeStartThreshold();
    }
    async GetChargeEndThreshold() {
        return await this.interfaceOptions.chargingWorker.getChargeEndThreshold();
    }
    async SetChargeStartThreshold(value) {
        return await this.interfaceOptions.chargingWorker.setChargeStartThreshold(value);
    }
    async SetChargeEndThreshold(value) {
        return await this.interfaceOptions.chargingWorker.setChargeEndThreshold(value);
    }
    async GetChargeType() {
        return await this.interfaceOptions.chargingWorker.getChargeType();
    }
    async SetChargeType(type) {
        return await this.interfaceOptions.chargingWorker.setChargeType(type);
    }

    GetFnLockSupported() {
        return this.fnLock.getFnLockSupported();
    }
    GetFnLockStatus() {
        return this.fnLock.getFnLockStatus();
    }
    SetFnLockStatus(status: boolean) {
        this.fnLock.setFnLockStatus(status);
    }
}

TccDBusInterface.configureMembers({
    properties: {
    },
    methods: {
        GetDevice: {outSignature: 's'},
        GetDisplayModesJSON: {outSignature: 's'},
        GetRefreshRateSupported: { outSignature: 'b'},
        TuxedoWmiAvailable: { outSignature: 'b' },
        FanHwmonAvailable: { outSignature: 'b' },
        TccdVersion: { outSignature: 's' },
        GetFanDataCPU: { outSignature: 'a{sa{sv}}' },
        GetFanDataGPU1: { outSignature: 'a{sa{sv}}' },
        GetFanDataGPU2: { outSignature: 'a{sa{sv}}' },
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
    },
    signals: {
        ModeReapplyPendingChanged: { signature: 'b' }
    }
});