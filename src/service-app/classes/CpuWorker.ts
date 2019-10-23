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

    public onWork() {
        // Check if current profile CPU values are actually set. If not
        // apply profile again

        try {
            if (!this.validateCpuFreq()) {
                this.tccd.logLine('CpuWorker: Incorrect settings, reapplying profile');
                this.applyCpuProfile(this.tccd.getCurrentProfile());
            }
        } catch (err) {
            this.tccd.logLine('CpuWorker: Error validating/reapplying profile => ' + err);
        }
    }

    public onExit() {}

    /**
     * Applies the cpu part of a profile by writing to the sysfs interface
     *
     * @param profile   Profile that contains a 'cpu' key of type ITccProfileCpu.
     *                  Undefined values are interpreted as "use default".
     */
    private applyCpuProfile(profile: ITccProfile) {
        try {
            // Reset everything to default on all cores before applying settings
            // Set online status last so that all cores get the same settings
            this.setCpuDefaultConfig();

            this.cpuCtrl.setGovernor(profile.cpu.governor);
            this.cpuCtrl.setEnergyPerformancePreference(profile.cpu.energyPerformancePreference);

            this.cpuCtrl.setGovernorScalingMinFrequency(profile.cpu.scalingMinFrequency);
            this.cpuCtrl.setGovernorScalingMaxFrequency(profile.cpu.scalingMaxFrequency);

            // Finally set the number of online cores
            this.cpuCtrl.useCores(profile.cpu.onlineCores);

            if (this.cpuCtrl.intelPstate.noTurbo.isAvailable()) {
                if (profile.cpu.noTurbo !== undefined) {
                    this.cpuCtrl.intelPstate.noTurbo.writeValue(profile.cpu.noTurbo);
                }
            }
        } catch (err) {
            this.tccd.logLine('CpuWorker: Failed to apply profile => ' + err);
        }
    }

    private setCpuDefaultConfig(): void {
        try {
            this.cpuCtrl.useCores();
            this.cpuCtrl.setGovernorScalingMinFrequency();
            this.cpuCtrl.setGovernorScalingMaxFrequency();
            this.cpuCtrl.setGovernor('powersave');
            this.cpuCtrl.setEnergyPerformancePreference('default');
            if (this.cpuCtrl.intelPstate.noTurbo.isAvailable()) {
                this.cpuCtrl.intelPstate.noTurbo.writeValue(false);
            }
        } catch (err) {
            this.tccd.logLine('CpuWorker: Failed to set default cpu config => ' + err);
        }
    }

    private validateCpuFreq(): boolean {
        const profile = this.tccd.getCurrentProfile();

        let cpuFreqValidConfig = true;

        // Check number of online cores
        this.cpuCtrl.getAvailableLogicalCores();
        if (this.cpuCtrl.online.isAvailable() && this.cpuCtrl.cores.length !== 0) {
            const currentOnlineCores = this.cpuCtrl.online.readValue();
            let onlineCoresProfile = profile.cpu.onlineCores;
            if (onlineCoresProfile === undefined) { onlineCoresProfile = this.cpuCtrl.cores.length; }
            if (currentOnlineCores.length !== onlineCoresProfile) {
                cpuFreqValidConfig = false;
                this.tccd.logLine('CpuWorker: onlineCores not as expected, '
                    + currentOnlineCores.length + ' instead of ' + onlineCoresProfile);
            }
        }

        // Check settings for each core
        for (const core of this.cpuCtrl.cores) {
            if (profile.cpu.noTurbo !== true) { // Only attempt to enforce frequencies if noTurbo isn't set
                if (core.scalingMinFreq.isAvailable() && core.cpuinfoMinFreq.isAvailable()) {
                    const minFreq = core.scalingMinFreq.readValue();
                    let minFreqProfile = profile.cpu.scalingMinFrequency;
                    if (minFreqProfile === undefined) { minFreqProfile = core.cpuinfoMinFreq.readValue(); }
                    if (minFreq !== minFreqProfile) {
                        cpuFreqValidConfig = false;
                        this.tccd.logLine('CpuWorker: Unexpected value core' + core.coreIndex + ' minimum scaling frequency '
                            + ' => ' + minFreq + ' instead of ' + minFreqProfile);
                    }
                }

                if (core.scalingMaxFreq.isAvailable() && core.cpuinfoMaxFreq.isAvailable()) {
                    const maxFreq = core.scalingMaxFreq.readValue();
                    let maxFreqProfile = profile.cpu.scalingMaxFrequency;
                    if (maxFreqProfile === undefined) { maxFreqProfile = core.cpuinfoMaxFreq.readValue(); }
                    if (maxFreq !== maxFreqProfile) {
                        cpuFreqValidConfig = false;
                        this.tccd.logLine('CpuWorker: Unexpected value core' + core.coreIndex + ' maximum scaling frequency '
                            + ' => ' + maxFreq + ' instead of ' + maxFreqProfile);
                    }
                }
            }

            if (core.scalingGovernor.isAvailable() && core.scalingAvailableGovernors.isAvailable()) {
                const currentGovernor = core.scalingGovernor.readValue();
                const governorProfile = profile.cpu.governor;
                // Skip check if not set in profile
                if (governorProfile !== undefined) {
                    if (currentGovernor !== governorProfile) {
                        cpuFreqValidConfig = false;
                        this.tccd.logLine('CpuWorker: Unexpected value core' + core.coreIndex + ' scaling governor '
                            + ' => \'' + currentGovernor + '\' instead of \'' + governorProfile + '\'');
                    }
                }
            }

            if (core.energyPerformancePreference.isAvailable() && core.energyPerformanceAvailablePreferences.isAvailable()) {
                const currentPerformancePreference = core.energyPerformancePreference.readValue();
                const performancePreferenceProfile = profile.cpu.energyPerformancePreference;
                // Skip check if not set in profile or is 'default'
                // note: writing 'default' tends to set another string which is considered the default
                if (performancePreferenceProfile !== undefined && performancePreferenceProfile !== 'default') {
                    if (currentPerformancePreference !== performancePreferenceProfile) {
                        cpuFreqValidConfig = false;
                        this.tccd.logLine('CpuWorker: Unexpected value core' + core.coreIndex + ' energy performance preference => \''
                            + currentPerformancePreference + '\' instead of \'' + performancePreferenceProfile + '\'');
                    }
                }
            }
        }

        return cpuFreqValidConfig;
    }
}
