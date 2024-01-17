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
import { Component, OnInit, OnDestroy } from "@angular/core";
import {
    ILogicalCoreInfo,
    IGeneralCPUInfo,
    SysFsService,
    IPstateInfo,
} from "../sys-fs.service";
import { Subscription } from "rxjs";
import { UtilsService } from "../utils.service";
import { TccDBusClientService, IDBusFanData } from "../tcc-dbus-client.service";
import { ITccProfile } from "src/common/models/TccProfile";
import { StateService } from "../state.service";
import { ActivatedRoute, Router } from "@angular/router";
import { ConfigService } from "../config.service";

import { CompatibilityService } from "../compatibility.service";
import { ICpuPower } from "src/common/models/TccPowerSettings";
import { IdGpuInfo, IiGpuInfo } from "src/common/models/TccGpuValues";
import { filter, first, tap } from "rxjs/operators";
import { TDPInfo } from "src/native-lib/TuxedoIOAPI";
import { VendorService } from "../../../common/classes/Vendor.service";
import { PowerStateService } from "../power-state.service";
import { AvailabilityService } from "../availability.service";
import { ElectronService } from "ngx-electron";

@Component({
    selector: "app-cpu-dashboard",
    templateUrl: "./cpu-dashboard.component.html",
    styleUrls: ["./cpu-dashboard.component.scss"],
})
export class CpuDashboardComponent implements OnInit, OnDestroy {
    public cpuCoreInfo: ILogicalCoreInfo[];
    public cpuInfo: IGeneralCPUInfo;
    public pstateInfo: IPstateInfo;

    public activeCores: number;
    public activeScalingMinFreqs: string[];
    public activeScalingMaxFreqs: string[];
    public activeScalingDrivers: string[];
    public activeScalingGovernors: string[];
    public activeEnergyPerformancePreference: string[];

    public avgCpuFreq: number;

    public cpuModelName = "";
    public fanData: IDBusFanData;

    // CPU
    public gaugeCPUPower: number = 0;
    public cpuPower: number = 0;
    public cpuPowerLimit: number = undefined;

    // dGPU
    public gaugeDGPUPower: number = 0;
    public gaugeDGPUFreq: number = 0;
    public gaugeDGPUTemp: number = 0;
    public gaugeDGPUFanSpeed: number = 0;
    public dGpuPower: number = 0;
    public dGpuFreq: number = 0;
    public hasGPUTemp = false;
    public powerState: string;

    // iGPU
    public gaugeIGpuFreq: number = 0;
    public iGpuTemp: number = 0;
    public iGpuFreq: number = 0;
    public iGpuVendor: string = "unknown";
    public iGpuPower: number = 0;

    public activeProfile: ITccProfile;
    public isCustomProfile: boolean;

    public animatedGauges: boolean = true;
    public animatedGaugesDuration: number = 0.1;

    private subscriptions: Subscription = new Subscription();

    public primeState: string;
    public primeSelectValues: string[] = ["iGPU", "dGPU", "on-demand", "off"];

    private dashboardVisibility: boolean;
    public d0MetricsUsage: boolean;

    public isX11: boolean;

    constructor(
        private sysfs: SysFsService,
        private utils: UtilsService,
        private tccdbus: TccDBusClientService,
        private state: StateService,
        private router: Router,
        private route: ActivatedRoute,
        private config: ConfigService,
        public compat: CompatibilityService,
        private vendor: VendorService,
        private power: PowerStateService,
        public availability: AvailabilityService,
        private electron: ElectronService
    ) {}

    public async ngOnInit(): Promise<void> {
        this.setValuesFromRoute();
        this.initializeSubscriptions();
        this.initializeEventListeners();
        this.tccdbus.setSensorDataCollectionStatus(true);
        this.dashboardVisibility = document.visibilityState == "visible";

        // not instantly showing window to give enough time to load window
        setTimeout(async () => {
            this.electron.ipcRenderer.send("show-tcc-window");
        }, 200);
    }

    private setValuesFromRoute() {
        const data = this.route.snapshot.data;
        this.powerState = data.powerStateStatus;
        this.isX11 = data.x11Status;
    }

    private initializeEventListeners(): void {
        document.addEventListener(
            "visibilitychange",
            this.visibilityChangeListener
        );
    }

    private visibilityChangeListener = () => {
        if (document.visibilityState == "hidden") {
            this.dashboardVisibility = false;
            this.tccdbus.setSensorDataCollectionStatus(false);
        }
        if (document.visibilityState == "visible") {
            this.dashboardVisibility = true;
            this.tccdbus.setSensorDataCollectionStatus(true);
            this.handleVisibilityChange();
        }
    };

    private handleVisibilityChange(): void {
        this.updateDgpuPowerState();
    }

    private async updateDgpuPowerState(): Promise<void> {
        const powerState = await this.power.getDGpuPowerState();

        if (powerState == "D0") {
            this.tccdbus.setDGpuD0Metrics(true);
        }
        if (powerState != "D0") {
            this.tccdbus.setDGpuD0Metrics(false);
        }
    }

    private initializeSubscriptions(): void {
        this.subscribeToPstate();
        this.subscribeToDGpuInfo();
        this.subscribeToIGpuInfo();
        this.subscribeToCpuInfo();
        this.subscribeToFanData();
        this.subscribeToProfileData();
        this.subscribeODMInfo();
        this.subscribePrimeState();
    }

    private subscribePrimeState(): void {
        this.subscriptions.add(
            this.tccdbus.primeState
                .pipe(
                    filter((value) => value !== undefined),
                    first()
                )
                .subscribe((state: string) => {
                    this.primeState = state;
                })
        );
    }

    private subscribeODMInfo(): void {
        this.subscriptions.add(
            this.tccdbus.odmPowerLimits.subscribe((tdpInfoArray: TDPInfo[]) => {
                const maxPowerLimit = tdpInfoArray.reduce((max, info) => {
                    if (["pl1", "pl2", "pl4"].includes(info.descriptor)) {
                        return Math.max(max, info.max);
                    }
                    return max;
                }, -1);
                this.cpuPowerLimit = maxPowerLimit;
            })
        );
    }

    private subscribeToPstate(): void {
        this.subscriptions.add(
            this.sysfs.pstateInfo.subscribe((pstateInfo) => {
                this.pstateInfo = pstateInfo;
            })
        );
    }

    private setDGpuValues(dGpuInfo?: IdGpuInfo): void {
        const {
            powerDraw = -1,
            maxPowerLimit = -1,
            coreFrequency = -1,
            maxCoreFrequency = -1,
        } = dGpuInfo ?? {};
        this.dGpuPower = powerDraw > -1 ? powerDraw : 0;
        this.gaugeDGPUPower =
            maxPowerLimit > 0 ? (powerDraw / maxPowerLimit) * 100 : 0;
        this.dGpuFreq = coreFrequency > -1 ? coreFrequency : 0;
        this.gaugeDGPUFreq =
            maxCoreFrequency > 0 ? (coreFrequency / maxCoreFrequency) * 100 : 0;
    }

    private subscribeToDGpuInfo(): void {
        this.subscriptions.add(
            this.tccdbus.dGpuInfo.subscribe(async (dGpuInfo?: IdGpuInfo) => {
                this.ensureSensorDataCollectionEnabled();

                const powerState = await this.power.getDGpuPowerState();
                this.powerState = powerState;
                this.d0MetricsUsage = dGpuInfo?.d0MetricsUsage;

                if (powerState === "D0") {
                    this.tccdbus.setDGpuD0Metrics(true);
                }

                this.setDGpuValues(dGpuInfo);
            })
        );
    }

    private setCpuPowerValues(cpuPower?: ICpuPower): void {
        this.ensureSensorDataCollectionEnabled();

        const powerDraw = cpuPower?.powerDraw ?? -1;
        const maxPowerLimit =
            cpuPower?.maxPowerLimit ?? this.cpuPowerLimit ?? -1;
        this.gaugeCPUPower =
            maxPowerLimit > 0 ? (powerDraw / maxPowerLimit) * 100 : 0;
        this.cpuPower = powerDraw;
    }

    private subscribeToCpuInfo(): void {
        this.subscriptions.add(
            this.tccdbus.cpuPower.subscribe((cpuPower?: ICpuPower) => {
                this.setCpuPowerValues(cpuPower);
            })
        );
        this.subscriptions.add(
            this.sysfs.generalCpuInfo.subscribe((cpuInfo: IGeneralCPUInfo) => {
                this.cpuInfo = cpuInfo;
            })
        );
        this.subscriptions.add(
            this.sysfs.logicalCoreInfo.subscribe(
                (coreInfo: ILogicalCoreInfo[]) => {
                    this.cpuCoreInfo = coreInfo;
                    this.updateFrequencyData();
                }
            )
        );
    }

    private async setIGpuValues(iGpuInfo?: IiGpuInfo): Promise<void> {
        this.ensureSensorDataCollectionEnabled();

        this.iGpuTemp = iGpuInfo?.temp ?? -1;
        const { coreFrequency = -1, maxCoreFrequency = 0 } = iGpuInfo ?? {};
        this.gaugeIGpuFreq =
            maxCoreFrequency > 0 ? (coreFrequency / maxCoreFrequency) * 100 : 0;
        this.iGpuFreq = coreFrequency;
        this.iGpuVendor = await this.vendor.getCpuVendor();
        this.iGpuPower = iGpuInfo?.powerDraw ?? -1;
    }

    // checks and sets status while dashboard is active since a wake-up will restart tccd and reset values
    private ensureSensorDataCollectionEnabled() {
        if (
            !this.tccdbus.sensorDataCollectionStatus?.value &&
            this.dashboardVisibility
        ) {
            this.tccdbus.setSensorDataCollectionStatus(true);
        }
    }

    private subscribeToIGpuInfo(): void {
        this.subscriptions.add(
            this.tccdbus.iGpuInfo.subscribe((iGpuInfo?: IiGpuInfo) => {
                this.setIGpuValues(iGpuInfo);
            })
        );
    }

    private subscribeToFanData(): void {
        this.subscriptions.add(
            this.tccdbus.fanData.subscribe((fanData: IDBusFanData) => {
                if (!fanData) return;

                this.fanData = fanData;
                const { gpu1, gpu2 } = fanData;
                const gpu1Temp = gpu1?.temp?.data?.value;
                const gpu2Temp = gpu2?.temp?.data?.value;
                const gpu1Speed = gpu1?.speed?.data?.value;
                const gpu2Speed = gpu2?.speed?.data?.value;

                const validGPUTemp1 = gpu1Temp > 1;
                const validGPUTemp2 = gpu2Temp > 1;

                this.gaugeDGPUTemp =
                    validGPUTemp1 && validGPUTemp2
                        ? Math.round((gpu1Temp + gpu2Temp) / 2)
                        : validGPUTemp1
                        ? Math.round(gpu1Temp)
                        : validGPUTemp2
                        ? Math.round(gpu2Temp)
                        : null;

                this.gaugeDGPUFanSpeed =
                    validGPUTemp1 && validGPUTemp2
                        ? Math.round((gpu1Speed + gpu2Speed) / 2)
                        : validGPUTemp1
                        ? Math.round(gpu1Speed)
                        : validGPUTemp2
                        ? Math.round(gpu2Speed)
                        : null;

                this.hasGPUTemp = this.gaugeDGPUTemp > 1;
            })
        );
    }

    private subscribeToProfileData(): void {
        this.subscriptions.add(
            this.state.activeProfile
                .pipe(
                    filter(
                        (profile) => profile !== null && profile !== undefined
                    ),
                    tap((profile) => {
                        this.activeProfile = profile;
                        this.isCustomProfile =
                            this.config.getCustomProfileById(
                                this.activeProfile.id
                            ) !== undefined;
                    })
                )
                .subscribe()
        );
    }

    private updateFrequencyData(): void {
        const freqSum = this.cpuCoreInfo
            .map((core) => core.scalingCurFreq ?? 0)
            .reduce((sum, freq) => sum + freq, 0);
        this.avgCpuFreq = freqSum / this.cpuCoreInfo.length;
    }

    public formatValue = (
        value: number,
        compatible: boolean,
        formatter: (val: number) => string
    ): string => {
        return compatible
            ? formatter(value)
            : $localize`:@@noDashboardValue:N/A`;
    };

    private createFormatter(
        compatibleFlag: (val: number) => boolean,
        formatterFunc: (val: number) => string
    ): (value: number) => string {
        return (value) => {
            return this.formatValue(
                value,
                compatibleFlag(value),
                formatterFunc
            );
        };
    }

    public formatCpuFrequency = (frequency: number): string => {
        return this.utils.formatCpuFrequency(frequency);
    };

    public formatIGpuFrequency = this.createFormatter(
        (val) => val >= 0,
        (val) => this.utils.formatGpuFrequency(val)
    );

    public formatDGpuFrequency = this.createFormatter(
        (val) =>
            val >= 0 && (this.powerState == "D3cold" || this.d0MetricsUsage),
        (val) => this.utils.formatGpuFrequency(val)
    );

    public gaugeCpuFreqFormat = this.createFormatter(
        () => true,
        (val) => this.utils.formatCpuFrequency(val)
    );

    public gaugeCpuTempFormat = this.createFormatter(
        () => this.compat.hasCpuTemp,
        (val) => Math.round(val).toString()
    );

    public gaugeIGpuTempFormat = this.createFormatter(
        () => this.compat.hasIGpuTemp,
        (val) => Math.round(val).toString()
    );

    public gaugeDGpuTempFormat = this.createFormatter(
        () => this.compat.hasDGpuTemp,
        (val) => Math.round(val).toString()
    );

    public gaugeCpuFanSpeedFormat = this.createFormatter(
        () => this.compat.hasCpuFan,
        (val) => Math.round(val).toString()
    );

    public gaugeDGpuFanSpeedFormat = this.createFormatter(
        () => this.compat.hasDGpuFan,
        (val) => Math.round(val).toString()
    );

    public cpuPowerFormat = this.createFormatter(
        () => this.compat.hasCpuPower,
        (val) => Math.round(val).toString()
    );

    public dGpuPowerFormat = this.createFormatter(
        () =>
            this.powerState == "D3cold" ||
            (this.compat.hasDGpuPowerDraw && this.d0MetricsUsage),
        (val) =>
            this.powerState == "D3cold" ? "0" : Math.round(val).toString()
    );

    public iGpuPowerFormat = this.createFormatter(
        () => this.compat.hasIGpuPowerDraw,
        (val) => Math.round(val).toString()
    );

    public goToProfileEdit = (profile: ITccProfile): void => {
        if (profile) {
            this.router.navigate(["profile-manager", profile.id], {
                relativeTo: this.route.parent,
            });
        }
    };

    public gotoSettings(): void {
        this.router.navigate(["global-settings", true], {
            relativeTo: this.route.parent,
        });
    }

    public getCPUSettingsEnabled(): boolean {
        return this.config.getSettings().cpuSettingsEnabled;
    }

    public getCPUSettingsDisabledTooltip(): string {
        return this.config.cpuSettingsDisabledMessage;
    }

    public getFanControlEnabled(): boolean {
        return this.config.getSettings().fanControlEnabled;
    }

    public getFanControlDisabledTooltip(): string {
        return this.config.fanControlDisabledMessage;
    }

    private removeEventListeners(): void {
        document.removeEventListener(
            "visibilitychange",
            this.visibilityChangeListener
        );
    }

    public getPrimeStateLabel(primeState: string) {
        if (primeState == "iGPU") {
            return $localize`:@@primeSelectIGpu:Power-saving CPU graphics processor (iGPU)`;
        }
        if (primeState == "dGPU") {
            return $localize`:@@primeSelectDGpu:High-performance graphics processor (dGPU)`;
        }
        if (primeState == "on-demand") {
            return $localize`:@@primeSelectOnDemand:Hybrid graphics mode (on-demand)`;
        }
    }

    public ngOnDestroy(): void {
        this.removeEventListeners();
        this.subscriptions.unsubscribe();

        this.tccdbus.setSensorDataCollectionStatus(false);
    }
}
