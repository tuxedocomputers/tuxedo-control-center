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
 * Structure for DBus interface data, passed to interface
 */
export class TccDBusData {
    fanTemp1 = new TimeData<number>(0, 0);
}

export class TccDBusInterface extends dbus.interface.Interface {

    constructor(private data: TccDBusData) {
        super('com.tuxedocomputers.tccd');
    }

    GetFanData1() {
        return this.data.fanTemp1.export();
    }
}

TccDBusInterface.configureMembers({
    properties: {
    },
    methods: {
        GetFanData1: {
            name: 'GetFanData1',
            inSignature: '',
            outSignature: 'ti'
        }
    },
    signals: {}
});
