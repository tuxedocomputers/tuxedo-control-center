/*!
 * Copyright (c) 2019-2023 TUXEDO Computers GmbH <tux@tuxedocomputers.com>
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
import { UtilsService } from "../utils.service";
import { ConfigService } from "../config.service";

@Component({
    selector: "app-prime-dialog",
    templateUrl: "./prime-dialog.component.html",
    styleUrls: ["./prime-dialog.component.scss"],
})
export class PrimeDialogComponent implements OnInit {
    primeSelectMode: string;
    loadingBar = false;
    langId: string;

    dialogStatus: string = "info";

    constructor(
        private config: ConfigService,
        private utils: UtilsService
    ) {}

    public ngOnInit(): void {
        window.ipc.onSetPrimeSelectMode( async (event, primeSelectMode) => {
            this.primeSelectMode = primeSelectMode;

            // small delay required to avoid flickering ui since html does not instantly update
            setTimeout(async () => {
                window.ipc.primeWindowShow();
            }, 250);
        }
        );
        this.langId = this.utils.getCurrentLanguageId();
    }

    public setDialogStatus(status: string) {
        this.dialogStatus = status;
    }

    public async applyPrimeConfig(rebootStatus: string) {
        this.setDialogStatus("loading");

        this.loadingBar = true;
        const status = await this.config.pkexecSetPrimeSelectAsync(
            this.primeSelectMode
        );

        if (status) {
            if (rebootStatus === "REBOOT") {
                window.ipc.issueReboot();
            }
            window.ipc.primeWindowClose();
        }
        if (!status) {
            window.ipc.primeWindowClose();
        }
    }

    public closeWindow() {
        window.ipc.primeWindowClose();
    }
}
