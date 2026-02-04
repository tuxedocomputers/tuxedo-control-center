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

import { Component, OnInit, inject } from "@angular/core";
import { UtilsService } from "../utils.service";
import { ElectronService } from "../electron.service";
import { ConfigService } from "../config.service";
import { SharedModule } from '../shared/shared.module';

@Component({
  standalone: true,
  imports: [SharedModule], 
    selector: "app-prime-dialog",
    templateUrl: "./prime-dialog.component.html",
    styleUrls: ["./prime-dialog.component.scss"],
    
})
export class PrimeDialogComponent implements OnInit {
    private electron = inject(ElectronService);
    private config = inject(ConfigService);
    private utils = inject(UtilsService);

    primeSelectMode: string;
    loadingBar = false;
    langId: string;

    dialogStatus = "info";



    public ngOnInit(): void {
        this.electron.ipcRenderer.on(
            "set-prime-select-mode",
            async (event, primeSelectMode) => {
                this.primeSelectMode = primeSelectMode;

                // small delay required to avoid flickering ui since html does not instantly update
                setTimeout(async () => {
                    this.electron.ipcRenderer.send("show-prime-window");
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
                this.utils.execCmdAsync("reboot");
            }
            this.electron.ipcRenderer.send("prime-window-close");
        }
        if (!status) {
            this.electron.ipcRenderer.send("prime-window-close");
        }
    }

    public closeWindow() {
        this.electron.ipcRenderer.send("prime-window-close");
    }
}
