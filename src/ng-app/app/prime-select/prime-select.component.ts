/*!
 * Copyright (c) 2023 TUXEDO Computers GmbH <tux@tuxedocomputers.com>
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

import { Component, OnInit } from "@angular/core";
import { ConfigService } from "../config.service";
import { UtilsService } from "../utils.service";

@Component({
    selector: "app-prime-select",
    templateUrl: "./prime-select.component.html",
    styleUrls: ["./prime-select.component.scss"],
})
export class PrimeSelectComponent implements OnInit {
    primeSelectStates: string[] = ["nvidia", "intel", "on-demand"];
    selectedState: string = "nvidia";
    activeState: string = "nvidia";
    primeAvailable: Boolean;
    primeSupported: Boolean;

    constructor(private utils: UtilsService, private config: ConfigService) {}

    async ngOnInit() {
        this.primeAvailable = await this.utils.isPrimeSelectInstalled();
        this.primeSupported = await this.utils.isPrimeSupported();

        if (this.primeAvailable && this.primeSupported) {
            const selectedState = await this.utils.execCmd(
                "prime-select query"
            );
            this.selectedState = this.activeState = selectedState
                .toString()
                .trim();
        }
    }

    async applyGpuProfile() {
        const config = {
            title: $localize`:@@primeSelectDialogApplyProfileTitle:Applying Graphics Profile`,
            description: $localize`:@@primeSelectDialogApplyProfileDescription:Do not power off your device until the process is complete.`,
        };

        const pkexecSetPrimeSelectAsync = this.config.pkexecSetPrimeSelectAsync(
            this.selectedState
        );
        const isSuccessful = await this.utils.waitingDialog(
            config,
            pkexecSetPrimeSelectAsync
        );

        if (isSuccessful) {
            const rebootConfig = {
                title: $localize`:@@primeSelectDialogRebootTitle:Completed`,
                description: $localize`:@@primeSelectDialogRebootDescription:Your graphics profile has been updated successfully. 
                    Restarting your system is necessary to activate the changes. Would you like to restart now?`,

                // todo: swap name and value in dialog component
                labelData: [
                    {
                        name: "REBOOT",
                        value: $localize`:@@primeSelectDialogRebootNow:Reboot now`,
                    },
                    {
                        name: "NO_REBOOT",
                        value: $localize`:@@primeSelectDialogRebootLater:Reboot later`,
                    },
                ],
            };

            const { value } = await this.utils.choiceDialog(rebootConfig);
            if (value === "REBOOT") {
                this.utils.execCmd("reboot");
            }
            this.activeState = this.selectedState;
        } else {
            this.selectedState = this.activeState;
        }
    }
}
