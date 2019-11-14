import * as dbus from 'dbus-next';

export class TccDBusInterface extends dbus.interface.Interface {

    constructor() {
        super('com.tuxedocomputers.tccd');
    }

    PropertyTemp = 54;

    GetFanData1() {
        return 54;
    }
}

TccDBusInterface.configureMembers({
    properties: {
        PropertyTemp: {
            name: 'PropertyTemp',
            signature: 'i'
        }
    },
    methods: {
        GetFanData1: {
            name: 'GetFanData1',
            inSignature: '',
            outSignature: 'i'
        }
    },
    signals: {}
});
