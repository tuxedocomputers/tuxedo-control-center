/*!
 * Copyright (c) 2021-2023 TUXEDO Computers GmbH <tux@tuxedocomputers.com>
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
import { TuxedoControlCenterDaemon } from './TuxedoControlCenterDaemon';
import { ChargingProfileController } from '../../common/classes/ChargingProfileController';
import { ChargingPriorityController } from '../../common/classes/ChargingPriorityController';
import { ChargeType, PowerSupplyController } from '../../common/classes/PowerSupplyController';

export class ChargingWorker extends DaemonWorker {

    private chargingProfile = new ChargingProfileController('/sys/devices/platform/tuxedo_keyboard/charging_profile');
    private chargingPriority = new ChargingPriorityController('/sys/devices/platform/tuxedo_keyboard/charging_priority');

    constructor(tccd: TuxedoControlCenterDaemon) {
        super(10000, tccd);
    }

    public onStart(): void {
        if (this.hasChargingProfile()) {
            if (this.tccd.settings.chargingProfile === null || this.tccd.settings.chargingProfile === undefined) {
                try {
                    this.tccd.settings.chargingProfile = this.chargingProfile.chargingProfile.readValue();
                    this.tccd.saveSettings();
                } catch (err) {
                    this.tccd.logLine('Error init charging profile => ' + err);
                }
            }
            this.applyChargingProfile();
        }

        if (this.hasChargingPriority()) {
            if (this.tccd.settings.chargingPriority === null || this.tccd.settings.chargingPriority === undefined) {
                try {
                    this.tccd.settings.chargingPriority = this.chargingPriority.chargingPrio.readValue();
                    this.tccd.saveSettings();
                } catch (err) {
                    this.tccd.logLine('Error init charging priority => ' + err);
                }
            }
            this.applyChargingPriority();
        }
    }

    public onWork(): void {

    }

    public onExit(): void {

    }

    public hasChargingProfile() {
        return this.chargingProfile.chargingProfile.isAvailable() && this.chargingProfile.chargingProfilesAvailable.isAvailable();
    }

    public hasChargingPriority() {
        return this.chargingPriority.chargingPrio.isAvailable() && this.chargingPriority.chargingPriosAvailable.isAvailable();
    }

    public async applyChargingProfile(chargingProfileDescriptor?: string) {
        if (chargingProfileDescriptor !== undefined) {
            this.tccd.settings.chargingProfile = chargingProfileDescriptor;
            this.tccd.saveSettings();
        }

        try {
            if (this.hasChargingProfile()) {
                const profileToSet = this.tccd.settings.chargingProfile;
                const currentProfile = this.chargingProfile.chargingProfile.readValue();
                const profilesAvailable = this.chargingProfile.chargingProfilesAvailable.readValue();
                if (profileToSet !== null && profileToSet !== currentProfile && profilesAvailable.includes(profileToSet)) {
                    this.chargingProfile.chargingProfile.writeValue(profileToSet);
                    this.tccd.logLine('Applied charging profile \'' + profileToSet + '\'');
                }
                return true;
            }
        } catch (err) {
            this.tccd.logLine('Failed applying charging profile => ' + err);
        }

        return false;
    }

    public getCurrentChargingProfile() {
        if (this.tccd.settings.chargingProfile === null || this.tccd.settings.chargingProfile === undefined) {
            return '';
        } else {
            return this.tccd.settings.chargingProfile;
        }
    }

    public getChargingProfilesAvailable() {
        try {
            return this.chargingProfile.chargingProfilesAvailable.readValue();
        } catch (e) {
            return [];
        }
    }

    public async applyChargingPriority(chargingPrioDescriptor?: string) {
        if (chargingPrioDescriptor !== undefined) {
            this.tccd.settings.chargingPriority = chargingPrioDescriptor;
            this.tccd.saveSettings();
        }

        try {
            if (this.hasChargingPriority()) {
                const prioToSet = this.tccd.settings.chargingPriority;
                const currentPrio = this.chargingPriority.chargingPrio.readValue();
                const priosAvailable = this.chargingPriority.chargingPriosAvailable.readValue();
                if (prioToSet !== null && prioToSet !== currentPrio && priosAvailable.includes(prioToSet)) {
                    this.chargingPriority.chargingPrio.writeValue(prioToSet);
                    this.tccd.logLine('Applied charging priority \'' + prioToSet + '\'');
                }
                return true;
            }
        } catch (err) {
            this.tccd.logLine('Failed applying charging priority => ' + err);
        }
        return false;
    }

    public async getCurrentChargingPriority() {
        if (this.tccd.settings.chargingPriority === null || this.tccd.settings.chargingProfile === null) {
            return '';
        } else {
            return this.tccd.settings.chargingPriority;
        }
    }

    public getChargingPrioritiesAvailable() {
        try {
            return this.chargingPriority.chargingPriosAvailable.readValue();
        } catch (e) {
            return [];
        }
    }

    public async getChargeStartAvailableThresholds() {
        const bat = await PowerSupplyController.getFirstBattery();

        // Default to empty if no configurable threshold detected.
        if (!bat.chargeControlStartThreshold.isAvailable()) {
            return [];
        }

        try {
            // Read available thresholds if list is available
            return await bat.chargeControlStartAvailableThresholds.readValueA();
        } catch (err) {
            // Default to 0-100 if the unofficial available lists are not there
            return Array.from(Array(101).keys());
        }
    }

    public async getChargeEndAvailableThresholds() {
        const bat = await PowerSupplyController.getFirstBattery();

        // Default to empty if no configurable threshold detected.
        if (!bat.chargeControlEndThreshold.isAvailable()) {
            return [];
        }

        try {
            // Read available thresholds if list is available
            return await bat.chargeControlEndAvailableThresholds.readValueA();
        } catch (err) {
            // Default to 0-100 if the unofficial available lists are not there
            return Array.from(Array(101).keys());
        }
    }

    public async getChargeStartThreshold() {
        const bat = await PowerSupplyController.getFirstBattery();
        try {
            return await bat.chargeControlStartThreshold.readValueA();
        } catch (err) {
            return undefined;
        }
    }

    public async setChargeStartThreshold(value: number) {
        const bat = await PowerSupplyController.getFirstBattery();
        try {
            await bat.chargeControlStartThreshold.writeValueA(value);
        } catch (err) {
            this.tccd.logLine('Failed writing start threshold => ' + err);
            return false;
        }

        return true;
    }

    public async getChargeEndThreshold() {
        const bat = await PowerSupplyController.getFirstBattery();
        try {
            return await bat.chargeControlEndThreshold.readValueA();
        } catch (err) {
            undefined;
        }
    }

    public async setChargeEndThreshold(value: number) {
        const bat = await PowerSupplyController.getFirstBattery();
        try {
            await bat.chargeControlEndThreshold.writeValueA(value);
        } catch (err) {
            this.tccd.logLine('Failed writing end threshold => ' + err);
            return false;
        }

        return true;
    }

    public async getChargeType() {
        const bat = await PowerSupplyController.getFirstBattery();
        try {
            return (await bat.chargeType.readValueA()).trim();
        } catch (err) {
            return ChargeType.Unknown.toString();
        }
    }

    public async setChargeType(chargeType: ChargeType) {
        const bat = await PowerSupplyController.getFirstBattery();
        try {
            bat.chargeType.writeValueA(chargeType.toString());
        } catch (err) {
            this.tccd.logLine('Failed writing charge type => ' + err);
            return false;
        }

        return true;
    }
}
