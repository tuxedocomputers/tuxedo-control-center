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
import { ElectronService } from "ngx-electron";

@Component({
    selector: "app-prime-select",
    templateUrl: "./prime-select.component.html",
    styleUrls: ["./prime-select.component.scss"],
})
export class PrimeSelectComponent implements OnInit {
    primeSelectStates: string[] = ["off", "on", "on-demand"];
    selectedState: string = "off";
    activeState: string = "off";
    primeSupported: Boolean;

    constructor(
        private utils: UtilsService,
        private config: ConfigService,
        private electron: ElectronService
    ) {}

    async ngOnInit() {
        this.primeSupported = await this.isPrimeSupported();

        if (this.primeSupported) {
            const selectedState = await this.getPrimeSelectQuery();
            this.selectedState = this.activeState = selectedState
                .toString()
                .trim();
        }
    }

    public async applyGpuProfile(): Promise<void> {
        const config = {
            title: $localize`:@@primeSelectDialogApplyProfileTitle:Applying Graphics Profile`,
            description: $localize`:@@primeSelectDialogApplyProfileDescription:Do not power off your device until the process is complete.`,
        };

        const selectedPrimeStatus = this.transformPrimeStatus(
            this.selectedState
        );
        const pkexecSetPrimeSelectAsync =
            this.config.pkexecSetPrimeSelectAsync(selectedPrimeStatus);
        const isSuccessful = await this.utils.waitingDialog(
            config,
            pkexecSetPrimeSelectAsync
        );

        if (isSuccessful) {
            const rebootStatus = await this.showRebootDialog();

            if (rebootStatus === "REBOOT") {
                this.utils.execCmd("reboot");
            }
            this.activeState = this.selectedState;
        } else {
            this.selectedState = this.activeState;
        }
    }

    private isPrimeSupported(): Promise<boolean> {
        return new Promise((resolve, reject) => {
            this.electron.ipcRenderer
                .invoke("checkPrimeSupport")
                .then((isPrimeSupported) => {
                    resolve(isPrimeSupported);
                })
                .catch((error) => {
                    resolve(false);
                });
        });
    }

    private getPrimeSelectQuery(): Promise<string> {
        return new Promise((resolve, reject) => {
            this.electron.ipcRenderer
                .invoke("checkPrimeSelectQuery")
                .then((primeSelectQuery) => {
                    resolve(primeSelectQuery);
                })
                .catch((error) => {
                    reject(error);
                });
        });
    }

    private async showRebootDialog(): Promise<string> {
        const rebootConfig = {
            title: $localize`:@@primeSelectDialogRebootTitle:Completed`,
            description: $localize`:@@primeSelectDialogRebootDescription:Your graphics profile has been updated successfully. 
                Restarting your system is necessary to activate the changes. Would you like to restart now?`,
            labelData: [
                {
                    label: $localize`:@@primeSelectDialogRebootNow:Reboot now`,
                    value: "REBOOT",
                },
                {
                    label: $localize`:@@primeSelectDialogRebootLater:Reboot later`,
                    value: "NO_REBOOT",
                },
            ],
        };
        const returnValue = await this.utils.choiceDialog(rebootConfig);
        return returnValue.value as string;
    }

    private transformPrimeStatus(status: string): string {
        switch (status) {
            case "on":
                return "nvidia";
            case "off":
                return "intel";
            case "on-demand":
                return "on-demand";
            default:
                return "off";
        }
    }
}
