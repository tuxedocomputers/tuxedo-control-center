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

import { Component, OnInit, OnDestroy } from "@angular/core";
import {
    ILogicalCoreInfo,
    IGeneralCPUInfo,
    IPstateInfo,
} from "src/common/models/ICpuInfos";
import { SysFsService } from "../sys-fs.service";
import { Subscription } from "rxjs";
import { UtilsService } from "../utils.service";
import { TccDBusClientService } from "../tcc-dbus-client.service";
import { IDBusFanData, TimeData } from "src/common/models/IFanData";
import { ITccProfile } from "src/common/models/TccProfile";
import { StateService } from "../state.service";
import { ActivatedRoute, Router } from "@angular/router";
import { ConfigService } from "../config.service";
import { CompatibilityService } from "../compatibility.service";
import { ICpuPower } from "src/common/models/TccPowerSettings";
import { IdGpuInfo, IiGpuInfo } from "src/common/models/TccGpuValues";
import { filter, first, tap } from "rxjs/operators";
import { TDPInfo } from "src/native-lib/TuxedoIOAPI";
import { PowerStateService } from "../power-state.service";

@Component({
    selector: "app-cpu-dashboard",
    templateUrl: "./cpu-dashboard.component.html",
    styleUrls: ["./cpu-dashboard.component.scss"],
    standalone: false
})
export class CpuDashboardComponent implements OnInit, OnDestroy {
    public cpuCoreInfo: ILogicalCoreInfo[];
    public cpuInfo: IGeneralCPUInfo;
    public pstateInfo: IPstateInfo;
    public usingFahrenheit: boolean;
    public activeCores: number;
    public activeScalingMinFreqs: string[];
    public activeScalingMaxFreqs: string[];
    public activeScalingDrivers: string[];
    public activeScalingGovernors: string[];
    public activeEnergyPerformancePreference: string[];

    public cpuModelName: string = "";
    public fanData: IDBusFanData;

    // CPU
    public avgCpuFreq: number = -1;
    public gaugeCpuFreq: number = 0;
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
    public hasGPUTemp: boolean = false;
    public powerState: string;

    // iGPU
    public gaugeIGpuFreq: number = 0;
    public iGpuTemp: number = 0;
    public iGpuFreq: number = 0;
    public cpuVendor: string = "unknown";
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

    public amdGpuCount: number;
    public dGpuAvailable: boolean;
    public iGpuAvailable: boolean;

    constructor(
        private sysfs: SysFsService,
        private utils: UtilsService,
        private tccdbus: TccDBusClientService,
        private state: StateService,
        private router: Router,
        private route: ActivatedRoute,
        private config: ConfigService,
        public compat: CompatibilityService,
        private power: PowerStateService
    ) {}

    public async ngOnInit(): Promise<void> {
        this.setValuesFromRoute();
        this.initializeSubscriptions();
        this.initializeEventListeners();
        this.tccdbus.setSensorDataCollectionStatus(true);
        this.dashboardVisibility = document.visibilityState == "visible";
	    this.usingFahrenheit = this.config.getSettings().fahrenheit;
        this.amdGpuCount = window.power.getAmdDGpuCount();
        this.dGpuAvailable = window.power.isDGpuAvailable();
        this.iGpuAvailable = window.power.isIGpuAvailable();
    }

    // prevents black window being shown for a moment before view has loaded. maybe greater timeout is needed on some devices
    public async ngAfterViewInit(): Promise<void> {
        setTimeout(async (): Promise<void> => {
        window.ipc.showTccWindow();
        }, 30);
    }

    private setValuesFromRoute(): void {
        const data = this.route.snapshot.data;
        this.powerState = data.powerStateStatus;
        this.isX11 = data.x11Status;
        this.dGpuAvailable = data.dGpuAvailable;
        this.iGpuAvailable = data.iGpuAvailable;
        this.primeState = data.primeStatus;
        this.amdGpuCount = data.amdGpuCount;
        this.cpuVendor = data.cpuVendor;
    }

    private initializeEventListeners(): void {
        document.addEventListener(
            "visibilitychange",
            this.visibilityChangeListener
        );
    }

    private visibilityChangeListener: () => void = (): void => {
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
        const powerState: string = await this.power.getDGpuPowerState();

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
                    filter((value: string): boolean => value !== undefined),
                    first()
                )
                .subscribe((state: string): void => {
                    this.primeState = state;
                }
            )
        );
    }

    private subscribeODMInfo(): void {
        this.subscriptions.add(
            this.tccdbus.odmPowerLimits.subscribe((tdpInfoArray: TDPInfo[]): void => {
                const maxPowerLimit: number = tdpInfoArray.reduce((max: number, info: TDPInfo): number => {
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
            this.sysfs.pstateInfo.subscribe((pstateInfo: IPstateInfo): void => {
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
            this.tccdbus.dGpuInfo.subscribe(async (dGpuInfo?: IdGpuInfo): Promise<void> => {
                this.ensureSensorDataCollectionEnabled();

                const powerState: string = await this.power.getDGpuPowerState();
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

        const powerDraw: number = cpuPower?.powerDraw ?? -1;
        const maxPowerLimit: number =
            cpuPower?.maxPowerLimit ?? this.cpuPowerLimit ?? -1;
        this.gaugeCPUPower =
            maxPowerLimit > 0 ? (powerDraw / maxPowerLimit) * 100 : 0;
        this.cpuPower = powerDraw;
    }

    private subscribeToCpuInfo(): void {
        this.subscriptions.add(
            this.tccdbus.cpuPower.subscribe((cpuPower?: ICpuPower): void => {
                this.setCpuPowerValues(cpuPower);
            })
        );
        this.subscriptions.add(
            this.sysfs.generalCpuInfo.subscribe((cpuInfo: IGeneralCPUInfo): void => {
                this.cpuInfo = cpuInfo;
            })
        );
        this.subscriptions.add(
            this.sysfs.logicalCoreInfo.subscribe(
                (coreInfo: ILogicalCoreInfo[]): void => {
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
        this.cpuVendor = await window.vendor.getCpuVendor();
        this.iGpuPower = iGpuInfo?.powerDraw ?? -1;
    }

    // checks and sets status while dashboard is active since a wake-up will restart tccd and reset values
    private ensureSensorDataCollectionEnabled(): void {
        if (
            !this.tccdbus.sensorDataCollectionStatus?.value &&
            this.dashboardVisibility
        ) {
            this.tccdbus.setSensorDataCollectionStatus(true);
        }
    }

    private subscribeToIGpuInfo(): void {
        this.subscriptions.add(
            this.tccdbus.iGpuInfo.subscribe((iGpuInfo?: IiGpuInfo): void => {
                this.setIGpuValues(iGpuInfo);
            })
        );
    }

    private subscribeToFanData(): void {
        this.subscriptions.add(
            this.tccdbus.fanData.subscribe((fanData: IDBusFanData): void => {
                this.fanData = fanData;
                const { gpu1, gpu2 } = fanData;
                const gpu1Temp: number = gpu1?.temp?.data;
                const gpu2Temp: number = gpu2?.temp?.data;
                const gpu1Speed: number = gpu1?.speed?.data;
                const gpu2Speed: number = gpu2?.speed?.data;

                const validGPUTemp1: boolean = gpu1Temp > 1;
                const validGPUTemp2: boolean = gpu2Temp > 1;

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
                        (profile: ITccProfile): boolean => profile !== null && profile !== undefined
                    ),
                    tap((profile: ITccProfile): void => {
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
        const freqSum: number =
            this.cpuCoreInfo
                ?.map((core: ILogicalCoreInfo): number => core.scalingCurFreq ?? 0)
                ?.reduce((sum: number, freq: number): number => sum + freq, 0) ?? 0;
        const cpuCores: number = this.cpuCoreInfo?.length ?? -1;

        if (freqSum > 0 && cpuCores > 0) {
            this.avgCpuFreq = freqSum / cpuCores;
        }

        const maxCpuFreq: number = this.cpuInfo?.maxFreq ?? -1;
        if (maxCpuFreq > 0) {
            this.gaugeCpuFreq = (this.avgCpuFreq / maxCpuFreq) * 100;
        }
    }

    public formatValue: (value: number, compatible: boolean, formatter: (val: number) => string) => string = (
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
        return (value: number): string => {
            return this.formatValue(
                value,
                compatibleFlag(value),
                formatterFunc
            );
        };
    }

    public formatCpuFrequency: (frequency: number) => string = (frequency: number): string => {
        return this.utils.formatCpuFrequency(frequency);
    };

    public formatIGpuFrequency: (value: number) => string = this.createFormatter(
        (val: number): boolean => val >= 0,
        (val: number): string => this.utils.formatGpuFrequency(val)
    );

    public formatDGpuFrequency: (value: number) => string = this.createFormatter(
        (val: number): boolean =>
            val >= 0 && (this.powerState == "D3cold" || this.d0MetricsUsage),
        (val: number): string => this.utils.formatGpuFrequency(val)
    );

    public gaugeCpuFreqFormat: (value: number) => string = this.createFormatter(
        (): true => true,
        (val: number): string => this.utils.formatCpuFrequency(val)
    );

    public gaugeCpuTempFormat: (value: number) => string = this.createFormatter(
        (): boolean => this.compat.hasCpuTemp,
        (val: number): string => this.formatTemperature(val).toString()
    );

    public gaugeIGpuTempFormat: (value: number) => string = this.createFormatter(
        (): boolean => this.compat.hasIGpuTemp,
        (val: number): string => this.formatTemperature(val).toString()
    );

    public gaugeDGpuTempFormat: (value: number) => string = this.createFormatter(
        (): boolean => this.compat.hasDGpuTemp,
        (val: number): string => this.formatTemperature(val).toString()
    );

    public gaugeCpuFanSpeedFormat: (value: number) => string = this.createFormatter(
        (): boolean => this.compat.hasCpuFan,
        (val: number): string => Math.round(val).toString()
    );

    public gaugeDGpuFanSpeedFormat: (value: number) => string = this.createFormatter(
        (): boolean => this.compat.hasDGpuFan,
        (val: number): string => Math.round(val).toString()
    );

    public cpuPowerFormat: (value: number) => string = this.createFormatter(
        (): boolean => this.compat.hasCpuPower,
        (val: number): string => this.roundWattage(val)
    );

    public dGpuPowerFormat: (value: number) => string = this.createFormatter(
        (): boolean =>
            this.powerState == "D3cold" ||
            (this.compat.hasDGpuPowerDraw && this.d0MetricsUsage),
        (val: number): string => (this.powerState == "D3cold" ? "0" : this.roundWattage(val))
    );

    public iGpuPowerFormat: (value: number) => string = this.createFormatter(
        (): boolean => this.compat.hasIGpuPowerDraw,
        (val: number): string => this.roundWattage(val)
    );

    private formatTemperature(val: number): number {
        if (this.usingFahrenheit) {
            val = this.utils.getFahrenheitFromCelsius(val);
        }
        return Math.round(val);
    }

    public getUsingFahrenheit(): boolean {
        return this.usingFahrenheit;
    }

    public goToProfileEdit: (profile: ITccProfile) => void = (profile: ITccProfile): void => {
        if (profile) {
            this.router.navigate(["profile-manager", profile.id], {
                relativeTo: this.route.parent,
            });
        }
    };

    // Make numbers smaller than 1W not show 0, but <1W
    private roundWattage(val: number): string {
        const num: number = Math.round(val);
        let ret: string = "";
        if (num < 1) {
            ret = "<1";
        } else {
            ret = num.toString();
        }
        return ret;
    }

    // todo: is this function used?
    private formatFahrenheit(val: number): number {
        if (this.usingFahrenheit) {
            val = this.utils.getFahrenheitFromCelsius(val);
        }
        return Math.round(val);
     }

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

    public getPrimeStateLabel(primeState: string): string {
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
