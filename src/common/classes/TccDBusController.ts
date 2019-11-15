import * as dbus from 'dbus-next';
import { FanData } from '../../service-app/classes/TccDBusInterface';

export class TccDBusController {
    private busName = 'com.tuxedocomputers.tccd';
    private path = '/com/tuxedocomputers/tccd';
    private interfaceName = 'com.tuxedocomputers.tccd';
    private bus: dbus.MessageBus;
    private interface: dbus.ClientInterface;

    constructor() {
        this.bus = dbus.systemBus();
    }

    async init(): Promise<boolean> {
        try {
            const proxyObject = await this.bus.getProxyObject(this.busName, this.path);
            this.interface = proxyObject.getInterface(this.interfaceName);
            return true;
        } catch (err) {
            return false;
        }
    }

    async getFanDataCPU(): Promise<FanData> {
        try {
            return await this.interface.GetFanDataCPU();
        } catch (err) {
            return new FanData();
        }
    }

    async getFanDataGPU1(): Promise<FanData> {
        try {
            return await this.interface.GetFanDataGPU1();
        } catch (err) {
            return new FanData();
        }
    }

    async getFanDataGPU2(): Promise<FanData> {
        try {
            return await this.interface.GetFanDataGPU2();
        } catch (err) {
            return new FanData();
        }
    }
}
