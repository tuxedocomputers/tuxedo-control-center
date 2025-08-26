/*!
 * Copyright (c) 2019-2025 TUXEDO Computers GmbH <tux@tuxedocomputers.com>
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
import { ITccODMProfile } from "src/common/models/TccProfile";

export class ODMProfileWorker extends DaemonWorker {
    private static tuxedoPlatformProfile: SysFsPropertyString = new SysFsPropertyString(
        "/sys/bus/platform/devices/tuxedo_platform_profile/platform_profile"
    );
    private static tuxedoPlatformProfileChoices: SysFsPropertyStringList = new SysFsPropertyStringList(
        "/sys/bus/platform/devices/tuxedo_platform_profile/platform_profile_choices"
    );

    private static platformProfile: SysFsPropertyString = new SysFsPropertyString(
        "/sys/firmware/acpi/platform_profile"
    );
    private static platformProfileChoices: SysFsPropertyStringList = new SysFsPropertyStringList(
        "/sys/firmware/acpi/platform_profile_choices"
    );

    constructor(tccd: TuxedoControlCenterDaemon) {
        super(10000, "ODMProfileWorker", tccd);
    }

    public async onStart(): Promise<void> {

        if (
            ODMProfileWorker.tuxedoPlatformProfile.isAvailable() &&
            ODMProfileWorker.tuxedoPlatformProfileChoices.isAvailable()
        ) {
            console.log("ODMProfileWorker: Tuxedo platform profile available")
            this.ODM(ODMProfileWorker.tuxedoPlatformProfile, ODMProfileWorker.tuxedoPlatformProfileChoices);
        } else if (
            ODMProfileWorker.platformProfile.isAvailable() &&
            ODMProfileWorker.platformProfileChoices.isAvailable()
        ) {
            console.log("ODMProfileWorker: Platform profile available")
            this.ODM(ODMProfileWorker.platformProfile, ODMProfileWorker.platformProfileChoices);
        } else {
            console.log("ODMProfileWorker: Using tuxedo-io")
            this.fallbackODM();
        }
    }

    public async onWork(): Promise<void> {}

    public async onExit(): Promise<void> {}

    public ODM(
        platformProfile: SysFsPropertyString,
        platformProfileChoices: SysFsPropertyStringList
    ): void {
        const availableProfiles: string[] = platformProfileChoices.readValueNT();
        this.tccd.dbusData.odmProfilesAvailable = availableProfiles;

        const chosenODMProfileName: string = this.getODMProfileName();
        if (availableProfiles.includes(chosenODMProfileName)) {
            platformProfile.writeValue(chosenODMProfileName);
        }
    }

    private fallbackODM(): void {
        const availableProfiles: ObjWrapper<string[]> = { value: [] };
        const odmProfilesAvailable: boolean =
            ioAPI.getAvailableODMPerformanceProfiles(availableProfiles);
        if (odmProfilesAvailable) {
            let chosenODMProfileName: string = this.getODMProfileName();

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
                    "ODMProfileWorker: Setting ODM profile '" + chosenODMProfileName + "' "
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
        const odmProfileSettings: ITccODMProfile = this.activeProfile.odmProfile;
        let chosenODMProfileName: string;
        if (odmProfileSettings !== undefined) {
            chosenODMProfileName = odmProfileSettings.name;
        }
        return chosenODMProfileName;
    }

    public static getDefaultODMPerformanceProfile(): string {
        if (
            this.tuxedoPlatformProfile.isAvailable() &&
            this.tuxedoPlatformProfileChoices.isAvailable()
        ) {
            const availableProfiles: string[] = this.tuxedoPlatformProfileChoices.readValueNT();
            if (availableProfiles !== undefined && availableProfiles?.length > 0) {
                return availableProfiles[availableProfiles?.length-1];
            }
        } else if (
            ODMProfileWorker.platformProfile.isAvailable() &&
            ODMProfileWorker.platformProfileChoices.isAvailable()
        ) {
            const availableProfiles: string[] = this.platformProfileChoices.readValueNT();
            if (availableProfiles !== undefined && availableProfiles?.length > 0) {
                return availableProfiles[availableProfiles?.length-1];
            }
        } else {
            const defaultODMProfileName: ObjWrapper<string> = { value: '' };
            ioAPI.getDefaultODMPerformanceProfile(defaultODMProfileName);
            return defaultODMProfileName.value;
        }
        return '';
    }

    public static getAvailableODMPerformanceProfiles(): string[] {
        if (
            this.tuxedoPlatformProfile.isAvailable() &&
            this.tuxedoPlatformProfileChoices.isAvailable()
        ) {
            const availableProfiles: string[] = this.tuxedoPlatformProfileChoices.readValueNT();
            if (availableProfiles !== undefined) {
                return availableProfiles;
            }
        } else if (
            ODMProfileWorker.platformProfile.isAvailable() &&
            ODMProfileWorker.platformProfileChoices.isAvailable()
        ) {
            const availableProfiles: string[] = this.platformProfileChoices.readValueNT();
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
