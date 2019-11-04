import { DaemonWorker } from './DaemonWorker';
import { TuxedoControlCenterDaemon } from './TuxedoControlCenterDaemon';

import { TuxedoECAPI as ecAPI } from '../../native-lib/TuxedoECAPI';

export class FanControlWorker extends DaemonWorker {

    constructor(tccd: TuxedoControlCenterDaemon) {
        super(1000, tccd);
    }

    public onStart(): void {

    }

    public onWork(): void {

    }

    public onExit(): void {
        ecAPI.setFanAuto(1);
        ecAPI.setFanAuto(2);
        ecAPI.setFanAuto(3);
    }
}
