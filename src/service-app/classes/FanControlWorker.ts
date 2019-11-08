import { DaemonWorker } from './DaemonWorker';
import { TuxedoControlCenterDaemon } from './TuxedoControlCenterDaemon';

import { TuxedoECAPI as ecAPI } from '../../native-lib/TuxedoECAPI';
import { FanControlLogic } from './FanControlLogic';

export class FanControlWorker extends DaemonWorker {

    private fans: Map<number, FanControlLogic>;
    private cpuLogic = new FanControlLogic(this.tccd.getCurrentFanProfile());
    private gpu1Logic = new FanControlLogic(this.tccd.getCurrentFanProfile());
    private gpu2Logic = new FanControlLogic(this.tccd.getCurrentFanProfile());

    constructor(tccd: TuxedoControlCenterDaemon) {
        super(1000, tccd);

        // Map logic to fan number
        this.fans = new Map();
        this.fans.set(1, this.cpuLogic);
        this.fans.set(2, this.gpu1Logic);
        this.fans.set(3, this.gpu2Logic);
    }

    public onStart(): void {

    }

    public onWork(): void {
        for (const fanNumber of this.fans.keys()) {
            // Update fan profile
            this.fans.get(fanNumber).setFanProfile(this.tccd.getCurrentFanProfile());
            const fanLogic = this.fans.get(fanNumber);
            const currentTemperature = ecAPI.getFanTemperature(fanNumber);
            if (currentTemperature === -1) {
                this.tccd.logLine('FanControlWorker: Failed to read fan (' + fanNumber + ') temperature');
                continue;
            }
            if (currentTemperature === 1) {
                // Probably not supported, do nothing
                continue;
            }
            fanLogic.reportTemperature(currentTemperature);
            ecAPI.setFanSpeedPercent(fanNumber, fanLogic.getSpeedPercent());
        }
    }

    public onExit(): void {
        // Stop TCC fan control for all fans
        for (const fanNumber of this.fans.keys()) {
            ecAPI.setFanAuto(fanNumber);
        }
    }
}
