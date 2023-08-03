import { Component, OnInit } from "@angular/core";
import { UtilsService } from "../utils.service";
import { ElectronService } from "ngx-electron";
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

    constructor(
        private electron: ElectronService,
        private config: ConfigService,
        private utils: UtilsService
    ) {}

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

    public async applyPrimeConfig() {
        this.loadingBar = true;
        const status = await this.config.pkexecSetPrimeSelectAsync(
            this.transformPrimeStatus(this.primeSelectMode)
        );
        if (status) {
            this.utils.execCmd("reboot");
        }
        if (!status) {
            this.electron.ipcRenderer.send("prime-window-close");
        }
    }

    public openHelpPage() {
        const helpLinks = {
            en: "https://www.tuxedocomputers.com/en/PRIME-GPU-Render-Offloading/GPU-on-demand-Mode-Guide.tuxedo",
            de: "https://www.tuxedocomputers.com/de/Der-umfassende-PRIME-GPU-Render-Offloading/GPU-on-demand-Mode-Leitfaden.tuxedo",
        };
        this.electron.shell.openExternal(
            helpLinks[this.langId] || helpLinks.en
        );
    }

    public closeWindow() {
        this.electron.ipcRenderer.send("prime-window-close");
    }
}
