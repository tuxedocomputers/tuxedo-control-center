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
        // Reset everything to default on all cores before applying settings
        // Set online status last so that all cores get the same settings
        this.setCpuDefaultConfig();

        this.cpuCtrl.setGovernor(profile.cpu.governor);
        this.cpuCtrl.setEnergyPerformancePreference(profile.cpu.energyPerformancePreference);

        // Check that min is not higher than max for the profile
        if (profile.cpu.scalingMinFrequency <= profile.cpu.scalingMaxFrequency) {
            this.cpuCtrl.setGovernorScalingMinFrequency(profile.cpu.scalingMinFrequency);
            this.cpuCtrl.setGovernorScalingMaxFrequency(profile.cpu.scalingMaxFrequency);
        }

        // Finally set the number of online cores
        this.cpuCtrl.useCores(profile.cpu.onlineCores);
    }

    private setCpuDefaultConfig(): void {
        this.cpuCtrl.useCores();
        this.cpuCtrl.setGovernor('powersave');
        this.cpuCtrl.setEnergyPerformancePreference('default');
        this.cpuCtrl.setGovernorScalingMinFrequency();
        this.cpuCtrl.setGovernorScalingMaxFrequency();
    }
}
