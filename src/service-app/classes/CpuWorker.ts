import { DaemonWorker } from './DaemonWorker';
import { CpuController } from '../../common/classes/CpuController';

import { TuxedoControlCenterDaemon } from './TuxedoControlCenterDaemon';
import { ITccProfile } from '../../common/models/TccProfile';

export class CpuWorker extends DaemonWorker {
    private readonly basePath = '/sys/devices/system/cpu';
    private readonly cpuCtrl: CpuController;

    constructor(tccd: TuxedoControlCenterDaemon) {
        super(3000, tccd);
        this.cpuCtrl = new CpuController(this.basePath);
    }

    public onStart() {
        this.applyCpuProfile(this.tccd.getCurrentProfile());
    }

    public onWork() {}
    public onExit() {}

    /**
     * Applies the cpu part of a profile by writing to the sysfs interface
     *
     * @param profile   Profile that contains a 'cpu' key of type ITccProfileCpu.
     *                  Undefined values are interpreted as "use default".
     */
    private applyCpuProfile(profile: ITccProfile) {
        this.cpuCtrl.useCores(profile.cpu.onlineCores);
        // Reset min/max frequency to cpuinfo min/max before applying to avoid min being higher than max
        this.cpuCtrl.setGovernorScalingMinFrequency();
        this.cpuCtrl.setGovernorScalingMaxFrequency();
        // Check that min is not higher than max for the profile
        if (profile.cpu.scalingMinFrequency <= profile.cpu.scalingMaxFrequency) {
            this.cpuCtrl.setGovernorScalingMinFrequency(profile.cpu.scalingMinFrequency);
            this.cpuCtrl.setGovernorScalingMaxFrequency(profile.cpu.scalingMaxFrequency);
        }
        this.cpuCtrl.setGovernor(profile.cpu.governor);
        this.cpuCtrl.setEnergyPerformancePreference(profile.cpu.energyPerformancePreference);
    }
}
