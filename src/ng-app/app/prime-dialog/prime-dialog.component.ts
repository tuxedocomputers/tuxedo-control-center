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

import { Component, OnInit } from "@angular/core";
import { UtilsService } from "../utils.service";
import { ConfigService } from "../config.service";
import { IpcRendererEvent } from "electron";

@Component({
    selector: "app-prime-dialog",
    templateUrl: "./prime-dialog.component.html",
    styleUrls: ["./prime-dialog.component.scss"],
    standalone: false
})
export class PrimeDialogComponent implements OnInit {
    private primeSelectMode: string;
    public langId: string;

    public dialogStatus: string = "info";

    constructor(
        private config: ConfigService,
        private utils: UtilsService
    ) {}

    public ngOnInit(): void {
        window.ipc.onSetPrimeSelectMode(async (event: IpcRendererEvent, primeSelectMode: string): Promise<void> => {
            this.primeSelectMode = primeSelectMode;

            // small delay required to avoid flickering ui since html does not instantly update
            setTimeout(async (): Promise<void> => {
                window.ipc.primeWindowShow();
            }, 250);
        }
        );
        this.langId = this.utils.getCurrentLanguageId();
    }

    public setDialogStatus(status: string): void {
        this.dialogStatus = status;
    }

    public async applyPrimeConfig(rebootStatus: string): Promise<void> {
        this.setDialogStatus("loading");

        const status: boolean = await this.config.pkexecSetPrimeSelectAsync(
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

    public closeWindow(): void {
        window.ipc.primeWindowClose();
    }
}
