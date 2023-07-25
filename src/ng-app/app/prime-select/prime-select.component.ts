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
import { TccDBusClientService } from "../tcc-dbus-client.service";
import { Subscription } from "rxjs";
import { first } from "rxjs/operators";

@Component({
    selector: "app-prime-select",
    templateUrl: "./prime-select.component.html",
    styleUrls: ["./prime-select.component.scss"],
})
export class PrimeSelectComponent implements OnInit {
    public primeState: string;
    public activeState: string;
    public primeSelectValues: string[] = ["iGPU", "dGPU", "on-demand"];
    private subscriptions: Subscription = new Subscription();

    constructor(
        private utils: UtilsService,
        private config: ConfigService,
        private tccdbus: TccDBusClientService
    ) {}

    public async ngOnInit() {
        this.subscribePrimeState();
    }

    public ngOnDestroy(): void {
        this.subscriptions.unsubscribe();
    }

    private subscribePrimeState() {
        this.tccdbus.primeState.pipe(first()).subscribe((state: string) => {
            if (state) {
                this.primeState = this.activeState = state;
            }
        });
    }

    public async applyGpuProfile(): Promise<void> {
        const config = {
            title: $localize`:@@primeSelectDialogApplyProfileTitle:Applying Graphics Profile`,
            description: $localize`:@@primeSelectDialogApplyProfileDescription:Do not power off your device until the process is complete.`,
        };

        const pkexecSetPrimeSelectAsync = this.config.pkexecSetPrimeSelectAsync(
            this.transformPrimeStatus(this.primeState)
        );
        const isSuccessful = await this.utils.waitingDialog(
            config,
            pkexecSetPrimeSelectAsync
        );

        if (isSuccessful) {
            const rebootStatus = await this.showRebootDialog();

            if (rebootStatus === "REBOOT") {
                this.utils.execCmd("reboot");
            }
            this.activeState = this.primeState;
        } else {
            this.primeState = this.activeState;
        }
    }

    private transformPrimeStatus(status: string): string {
        switch (status) {
            case "dGPU":
                return "nvidia";
            case "iGPU":
                return "intel";
            case "on-demand":
                return "on-demand";
            default:
                return "off";
        }
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
}
