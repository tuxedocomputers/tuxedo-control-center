/*!
 * Copyright (c) 2019-2020 TUXEDO Computers GmbH <tux@tuxedocomputers.com>
 *
 * This file is part of TUXEDO Control Center.
 *
 * TUXEDO Control Center is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * TUXEDO Control Center is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with TUXEDO Control Center.  If not, see <https://www.gnu.org/licenses/>.
 */
import { DaemonWorker } from './DaemonWorker';
import { CpuController } from '../../common/classes/CpuController';

import { TuxedoControlCenterDaemon } from './TuxedoControlCenterDaemon';
import { ITccProfile } from '../../common/models/TccProfile';

export class CpuWorker extends DaemonWorker {
    private readonly basePath = '/sys/devices/system/cpu';
    private readonly cpuCtrl: CpuController;

    private readonly preferredAcpiFreqGovernors = [ 'ondemand', 'schedutil', 'conservative' ];

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
     * Choose the default governor for the current system
     *
     * @returns The found governor or undefined on error or no match
     */
    public findDefaultGovernor(): string {
        let chosenName: string;
        try {
            let scalingDriver: string;
            if (this.cpuCtrl.cores[0].scalingDriver.isAvailable()) {
                scalingDriver = this.cpuCtrl.cores[0].scalingDriver.readValueNT();
            }

            if (scalingDriver === 'intel_pstate') {
                // Fixed 'powersave' governor for intel_pstate
                return 'powersave';
            } else {
                // Preferred governors list for other drivers, mainly 'acpi-cpufreq'.
                // Also includes 'intel_cpufreq' which according to kernel.org doc on intel_pstate
                // behaves as the acpi-cpufreq governors.
                const availableGovernors = this.cpuCtrl.cores[0].scalingAvailableGovernors.readValue();
                for (const governorName of this.preferredAcpiFreqGovernors) {
                    if (availableGovernors.includes(governorName)) {
                        chosenName = governorName;
                        break;
                    }
                }
                return chosenName;
            }
        } catch (err) {
            return chosenName;
        }
    }

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

            // Note: Hard set governor to default (not included in profiles atm)
            profile.cpu.governor = this.findDefaultGovernor();

            this.cpuCtrl.setGovernor(profile.cpu.governor);
            this.cpuCtrl.setEnergyPerformancePreference(profile.cpu.energyPerformancePreference);

            this.cpuCtrl.setGovernorScalingMinFrequency(profile.cpu.scalingMinFrequency);
            this.cpuCtrl.setGovernorScalingMaxFrequency(profile.cpu.scalingMaxFrequency);

            // Finally set the number of online cores
            this.cpuCtrl.useCores(profile.cpu.onlineCores);

            if (this.cpuCtrl.intelPstate.noTurbo.isAvailable() && this.cpuCtrl.intelPstate.noTurbo.isWritable()) {
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
            this.cpuCtrl.setGovernor(this.findDefaultGovernor());
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

        // Note: Hard set governor to default (not included in profiles atm)
        profile.cpu.governor = this.findDefaultGovernor();

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
                const coreMinFreq = core.cpuinfoMinFreq.readValue();
                const coreMaxFreq = core.cpuinfoMaxFreq.readValue();
                if (core.scalingMinFreq.isAvailable() && core.cpuinfoMinFreq.isAvailable()) {
                    const minFreq = core.scalingMinFreq.readValue();
                    let minFreqProfile = profile.cpu.scalingMinFrequency;
                    if (minFreqProfile === undefined || minFreqProfile < coreMinFreq) {
                        minFreqProfile = coreMinFreq;
                    } else if (minFreqProfile > coreMaxFreq) {
                        minFreqProfile = coreMaxFreq;
                    }
                    if (minFreq !== minFreqProfile) {
                        cpuFreqValidConfig = false;
                        this.tccd.logLine('CpuWorker: Unexpected value core' + core.coreIndex + ' minimum scaling frequency '
                            + ' => ' + minFreq + ' instead of ' + minFreqProfile);
                    }
                }

                if (core.scalingMaxFreq.isAvailable() && core.cpuinfoMaxFreq.isAvailable()) {
                    const maxFreq = core.scalingMaxFreq.readValue();
                    let maxFreqProfile = profile.cpu.scalingMaxFrequency;
                    if (maxFreqProfile === -1) {
                        maxFreqProfile = core.getReducedAvailableFreq();
                    } else if (maxFreqProfile === undefined || maxFreqProfile > coreMaxFreq) {
                        maxFreqProfile = coreMaxFreq;
                    } else if (maxFreqProfile < coreMinFreq) {
                        maxFreqProfile = coreMinFreq;
                    }
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

        if (this.cpuCtrl.intelPstate.noTurbo.isAvailable()) {
            const currentNoTurbo = this.cpuCtrl.intelPstate.noTurbo.readValue();
            const profileNoTurbo = profile.cpu.noTurbo;

            if (profileNoTurbo !== undefined) {
                if (currentNoTurbo !== profileNoTurbo) {
                    cpuFreqValidConfig = false;
                    this.tccd.logLine('CpuWorker: Unexpected value noTurbo => \''
                        + currentNoTurbo + '\' instead of \'' + profileNoTurbo + '\'');
                }
            }
        }

        return cpuFreqValidConfig;
    }
}
