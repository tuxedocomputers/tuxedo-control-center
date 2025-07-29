/*!
 * Copyright (c) 2021-2025 TUXEDO Computers GmbH <tux@tuxedocomputers.com>
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
import { DaemonWorker } from "./DaemonWorker";
import { TuxedoControlCenterDaemon } from "./TuxedoControlCenterDaemon";

import { TuxedoIOAPI as ioAPI, ObjWrapper } from "../../native-lib/TuxedoIOAPI";

import {
    SysFsPropertyString,
    SysFsPropertyStringList,
} from "../../common/classes/SysFsProperties";
import { TUXEDODevice } from '../../common/models/DefaultProfiles';

export class ODMProfileWorker extends DaemonWorker {
    private static tuxedoPlatformProfile = new SysFsPropertyString(
        "/sys/bus/platform/devices/tuxedo_platform_profile/platform_profile"
    );
    private static tuxedoPlatformProfileChoices = new SysFsPropertyStringList(
        "/sys/bus/platform/devices/tuxedo_platform_profile/platform_profile_choices"
    );

    private static platformProfile = new SysFsPropertyString(
        "/sys/firmware/acpi/platform_profile"
    );
    private static platformProfileChoices = new SysFsPropertyStringList(
        "/sys/firmware/acpi/platform_profile_choices"
    );

    constructor(tccd: TuxedoControlCenterDaemon) {
        super(10000, tccd);
    }

    public onStart(): void {
        const dev = this.tccd.identifyDevice();

        if (
            ODMProfileWorker.tuxedoPlatformProfile.isAvailable() &&
            ODMProfileWorker.tuxedoPlatformProfileChoices.isAvailable()
        ) {
            this.ODM(ODMProfileWorker.tuxedoPlatformProfile, ODMProfileWorker.tuxedoPlatformProfileChoices);
        } else if (
            !ODMProfileWorker.hasQuirkNoPlatformProfile(dev) &&
            ODMProfileWorker.platformProfile.isAvailable() &&
            ODMProfileWorker.platformProfileChoices.isAvailable()
        ) {
            this.ODM(ODMProfileWorker.platformProfile, ODMProfileWorker.platformProfileChoices);
        } else {
            this.fallbackODM();
        }
    }

    public onWork(): void {}

    public onExit(): void {}

    public ODM(
        platformProfile: SysFsPropertyString,
        platformProfileChoices: SysFsPropertyStringList
    ): void {
        const availableProfiles = platformProfileChoices.readValueNT();
        this.tccd.dbusData.odmProfilesAvailable = availableProfiles;

        let chosenODMProfileName = this.getODMProfileName();
        if (availableProfiles.includes(chosenODMProfileName)) {
            platformProfile.writeValue(chosenODMProfileName);
        }
    }

    private fallbackODM(): void {
        const availableProfiles: ObjWrapper<string[]> = { value: [] };
        const odmProfilesAvailable =
            ioAPI.getAvailableODMPerformanceProfiles(availableProfiles);
        if (odmProfilesAvailable) {
            let chosenODMProfileName = this.getODMProfileName();

            // If saved profile name does not match available ones
            // attempt to get the default profile name
            if (!availableProfiles.value.includes(chosenODMProfileName)) {
                const defaultProfileName: ObjWrapper<string> = { value: "" };
                ioAPI.getDefaultODMPerformanceProfile(defaultProfileName);
                chosenODMProfileName = defaultProfileName.value;
            }

            // Make sure a valid one could be found before proceeding, otherwise abort
            if (availableProfiles.value.includes(chosenODMProfileName)) {
                this.tccd.logLine(
                    "Set ODM profile '" + chosenODMProfileName + "' "
                );
                if (!ioAPI.setODMPerformanceProfile(chosenODMProfileName)) {
                    this.tccd.logLine(
                        "ODMProfileWorker: Failed to apply profile"
                    );
                }
            } else {
                this.tccd.logLine(
                    "ODMProfileWorker: Unexpected error, default profile name '" +
                        chosenODMProfileName +
                        "' not valid"
                );
            }
        }

        this.tccd.dbusData.odmProfilesAvailable = availableProfiles.value;
    }

    private getODMProfileName(): string {
        const odmProfileSettings = this.activeProfile.odmProfile;
        let chosenODMProfileName: string;
        if (odmProfileSettings !== undefined) {
            chosenODMProfileName = odmProfileSettings.name;
        }
        return chosenODMProfileName;
    }

    private static hasQuirkNoPlatformProfile(dev: TUXEDODevice): boolean {

        const quirkNoPlatformProfile = [
            TUXEDODevice.IBPG10AMD,
        ].includes(dev);

        return quirkNoPlatformProfile;
    }

    public static getDefaultODMPerformanceProfile(dev: TUXEDODevice): string {
        if (
            this.tuxedoPlatformProfile.isAvailable() &&
            this.tuxedoPlatformProfileChoices.isAvailable()
        ) {
            const availableProfiles = this.tuxedoPlatformProfileChoices.readValueNT();
            if (availableProfiles !== undefined && availableProfiles.length > 0) {
                return availableProfiles[availableProfiles.length-1];
            }
        } else if (
            !ODMProfileWorker.hasQuirkNoPlatformProfile(dev) &&
            ODMProfileWorker.platformProfile.isAvailable() &&
            ODMProfileWorker.platformProfileChoices.isAvailable()
        ) {
            const availableProfiles = this.platformProfileChoices.readValueNT();
            if (availableProfiles !== undefined && availableProfiles.length > 0) {
                return availableProfiles[availableProfiles.length-1];
            }
        } else {
            const defaultODMProfileName: ObjWrapper<string> = { value: '' };
            ioAPI.getDefaultODMPerformanceProfile(defaultODMProfileName);
            return defaultODMProfileName.value;
        }
        return '';
    }

    public static getAvailableODMPerformanceProfiles(dev: TUXEDODevice): string[] {
        if (
            this.tuxedoPlatformProfile.isAvailable() &&
            this.tuxedoPlatformProfileChoices.isAvailable()
        ) {
            const availableProfiles = this.tuxedoPlatformProfileChoices.readValueNT();
            if (availableProfiles !== undefined) {
                return availableProfiles;
            }
        } else if (
            !ODMProfileWorker.hasQuirkNoPlatformProfile(dev) &&
            ODMProfileWorker.platformProfile.isAvailable() &&
            ODMProfileWorker.platformProfileChoices.isAvailable()
        ) {
            const availableProfiles = this.platformProfileChoices.readValueNT();
            if (availableProfiles !== undefined) {
                return availableProfiles;
            }
        } else {
                const availableODMProfiles: ObjWrapper<string[]> = { value: [] };
                ioAPI.getAvailableODMPerformanceProfiles(availableODMProfiles);
                return availableODMProfiles.value;
        }

        return [];
    }
}
