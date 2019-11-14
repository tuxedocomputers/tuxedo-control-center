import { DaemonWorker } from './DaemonWorker';
import { TuxedoControlCenterDaemon } from './TuxedoControlCenterDaemon';
import { TccDBusInterface, TccDBusData } from './TccDBusInterface';
import * as dbus from 'dbus-next';

export class TccDBusService extends DaemonWorker {

    private interface: TccDBusInterface;
    private readonly path = '/com/tuxedocomputers/tccd';

    private bus: dbus.MessageBus;

    constructor(tccd: TuxedoControlCenterDaemon, dbusData: TccDBusData) {
        super(10000, tccd);

        try {
            this.bus = dbus.systemBus();
            this.interface = new TccDBusInterface(dbusData);
        } catch (err) {
            this.tccd.logLine('TccDBusService: Error initializing DBus service => ' + err);
        }
    }

    public onStart(): void {
        this.bus.requestName('com.tuxedocomputers.tccd', 0).then(name => {
            try {
                this.bus.export(this.path, this.interface);
            } catch (err) {
                this.tccd.logLine('TccDBusService: Error exporting service => ' + err);
            }
        }).catch(err => {
            this.tccd.logLine('TccDBusInterface: Failed to request bus name => ' + err);
        });
    }

    public onWork(): void {

    }

    public onExit(): void {
        try {
            this.bus.unexport(this.path, this.interface);
        } catch (err) {
            this.tccd.logLine('TccDBusService: Error unexporting interface => ' + err);
        }
    }
}
