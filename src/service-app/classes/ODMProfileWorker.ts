/*!
 * Copyright (c) 2021-2022 TUXEDO Computers GmbH <tux@tuxedocomputers.com>
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

export class ODMProfileWorker extends DaemonWorker {
    constructor(tccd: TuxedoControlCenterDaemon) {
        super(10000, tccd);
    }

    public onStart(): void {
        const platformProfile = new SysFsPropertyString(
            "/sys/devices/platform/tuxedo_platform_profile/platform_profile"
        );

        const platformProfileChoices = new SysFsPropertyStringList(
            "/sys/devices/platform/tuxedo_platform_profile/platform_profile_choices"
        );

        if (
            platformProfile.isAvailable() &&
            platformProfileChoices.isAvailable()
        ) {
            this.ODM(platformProfile, platformProfileChoices);
        }

        if (
            !platformProfile.isAvailable() ||
            !platformProfileChoices.isAvailable()
        ) {
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
}
