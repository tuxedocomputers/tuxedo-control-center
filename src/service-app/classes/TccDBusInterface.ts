import * as dbus from 'dbus-next';

/**
 * Structure for timestamped data
 */
export class TimeData<T> {
    constructor(public timestamp: number, public data: T) {}
    set(timestamp: number, data: T) { this.timestamp = timestamp; this.data = data; }
    export() { return [ this.timestamp, this.data ]; }
}

/**
 * Structure for fan data
 */
export class FanData {
    public speed = new TimeData<number>(0, 0);
    public temp = new TimeData<number>(0, 0);
    export() {
        const o = {};
        for (const key of Object.getOwnPropertyNames(this)) {
            o[key] = this[key].export();
        }
        return o;
    }
}

/**
 * Structure for DBus interface data, passed to interface
 */
export class TccDBusData {
    public fans: FanData[];
    constructor(numberFans: number) { this.fans = new Array<FanData>(numberFans).fill(undefined).map(fan => new FanData()); }
    export() { return this.fans.map(fan => fan.export()); }
}

export class TccDBusInterface extends dbus.interface.Interface {

    constructor(private data: TccDBusData) {
        super('com.tuxedocomputers.tccd');
    }

    GetFanData() { return this.data.export(); }
}

TccDBusInterface.configureMembers({
    properties: {
    },
    methods: {
        GetFanData: { outSignature: 'aa{s(ti)}' },
    },
    signals: {}
});
