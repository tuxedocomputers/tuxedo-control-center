/*!
 * Copyright (c) 2019-2021 TUXEDO Computers GmbH <tux@tuxedocomputers.com>
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
    public tuxedoWmiAvailable: boolean;
    public tccdVersion: string;
    public fans: FanData[];
    public webcamSwitchStatus: boolean;
    public webcamSwitchAvailable: boolean;
    public tempProfileName: string;
    public activeProfileJSON: string;
    public profilesJSON: string;
    public customProfilesJSON: string;
    public defaultProfilesJSON: string;
    public odmProfilesAvailable: string[];
    constructor(numberFans: number) { this.fans = new Array<FanData>(numberFans).fill(undefined).map(fan => new FanData()); }
    // export() { return this.fans.map(fan => fan.export()); }
}

export class TccDBusInterface extends dbus.interface.Interface {

    constructor(private data: TccDBusData) {
        super('com.tuxedocomputers.tccd');
    }

    TuxedoWmiAvailable() { return this.data.tuxedoWmiAvailable; }
    TccdVersion() { return this.data.tccdVersion; }
    GetFanDataCPU() { return this.data.fans[0].export(); }
    GetFanDataGPU1() { return this.data.fans[1].export(); }
    GetFanDataGPU2() { return this.data.fans[2].export(); }
    WebcamSWAvailable() { return this.data.webcamSwitchAvailable; }
    GetWebcamSWStatus() { return this.data.webcamSwitchStatus; }
    GetActiveProfileJSON() { return this.data.activeProfileJSON; }
    SetTempProfile(profileName: string) {
        this.data.tempProfileName = profileName;
        return true;
    }
    GetProfilesJSON() { return this.data.profilesJSON; }
    GetCustomProfilesJSON() { return this.data.customProfilesJSON; }
    GetDefaultProfilesJSON() { return this.data.defaultProfilesJSON; }
    ODMProfilesAvailable() { return this.data.odmProfilesAvailable; }
}

TccDBusInterface.configureMembers({
    properties: {
    },
    methods: {
        TuxedoWmiAvailable: { outSignature: 'b' },
        TccdVersion: { outSignature: 's' },
        GetFanDataCPU: { outSignature: 'a{sa{sv}}' },
        GetFanDataGPU1: { outSignature: 'a{sa{sv}}' },
        GetFanDataGPU2: { outSignature: 'a{sa{sv}}' },
        WebcamSWAvailable: { outSignature: 'b' },
        GetWebcamSWStatus: { outSignature: 'b' },
        GetActiveProfileJSON: { outSignature: 's' },
        SetTempProfile: { inSignature: 's',  outSignature: 'b' },
        GetProfilesJSON: { outSignature: 's' },
        GetCustomProfilesJSON: { outSignature: 's' },
        GetDefaultProfilesJSON: { outSignature: 's' },
        ODMProfilesAvailable: { outSignature: 'as' },
    },
    signals: {}
});
