import { DaemonWorker } from './DaemonWorker';
import { TuxedoControlCenterDaemon } from './TuxedoControlCenterDaemon';

import { TuxedoECAPI } from '../../native-lib/TuxedoECAPI';

export class WebcamWorker extends DaemonWorker {

    constructor(tccd: TuxedoControlCenterDaemon) {
        super(3000, tccd);
    }

    public onStart(): void {
        const activeProfile = this.tccd.getCurrentProfile();
        const settingsDefined = activeProfile.webcam !== undefined
            && activeProfile.webcam.useStatus !== undefined
            && activeProfile.webcam.status !== undefined;

        if (settingsDefined) {
            if (activeProfile.webcam.useStatus) {
                if (activeProfile.webcam.status) {
                    this.tccd.logLine('Set webcam status ON');
                    TuxedoECAPI.webcamOn();
                } else {
                    this.tccd.logLine('Set webcam status OFF');
                    TuxedoECAPI.webcamOff();
                }
            }
        }
    }

    public onWork(): void {

    }

    public onExit(): void {

    }

}
