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
    public gaugeCPUPower: number;
    public cpuPower: number;
    public cpuPowerLimit: number;

    // dGPU
    public gaugeDGPUPower: number;
    public gaugeDGPUFreq: number;
    public gaugeDGPUTemp: number;
    public gaugeDGPUFanSpeed: number;
    public dGpuPower: number;
    public dGpuFreq: number;
    public hasGPUTemp = false;

    // iGPU
    public gaugeIGpuFreq: Number;
    public iGpuTemp: Number;
    public iGpuFreq: Number;
    public iGpuVendor: String;
    public iGpuPower: Number;
    public iGpuLogging: boolean;

    public activeProfile: ITccProfile;
    public isCustomProfile: boolean;

    public animatedGauges: boolean = true;
    public animatedGaugesDuration: number = 0.1;

    private subscriptions: Subscription = new Subscription();

    public primeState: string;
    public primeSelectValues: string[] = ["iGPU", "dGPU", "on-demand"];

    constructor(
        private sysfs: SysFsService,
        private utils: UtilsService,
        private tccdbus: TccDBusClientService,
        private state: StateService,
        private router: Router,
        private route: ActivatedRoute,
        private config: ConfigService,
        public compat: CompatibilityService
    ) {}

    ngOnInit(): void {
        this.subscribeToPstate();
        this.subscribeToDGpuInfo();
        this.subscribeToIGpuInfo();
        this.subscribeToCpuInfo();
        this.subscribeToFanData();
        this.subscribeToProfileData();
        this.subscribeODMInfo();
        this.subscribeDGpuLoggingStatus();
        this.subscribePrimeState();
    }

    ngOnDestroy(): void {
        this.subscriptions.unsubscribe();
    }

    private subscribePrimeState() {
        this.subscriptions.add(
            this.tccdbus.primeState.pipe(first()).subscribe((state: string) => {
                if (state) {
                    this.primeState = state;
                }
            })
        );
    }

    private subscribeDGpuLoggingStatus(): void {
        this.subscriptions.add(
            this.tccdbus.iGpuLogging.subscribe((status: boolean) => {
                if (status) {
                    this.iGpuLogging = status;
                }
            })
        );
    }

    private subscribeODMInfo() {
        this.subscriptions.add(
            this.tccdbus.odmPowerLimits.subscribe((tdpInfoArray: TDPInfo[]) => {
                this.cpuPowerLimit = tdpInfoArray.find(
                    (info) => info.descriptor === "pl4"
                )?.max;
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
        console.log("dGpuInfo: ", dGpuInfo);
        const {
            powerDraw = -1,
            maxPowerLimit = -1,
            coreFrequency = -1,
            maxCoreFrequency = -1,
        } = dGpuInfo ?? {};
        this.dGpuPower = powerDraw;
        this.gaugeDGPUPower =
            maxPowerLimit > 0 ? (powerDraw / maxPowerLimit) * 100 : 0;
        this.dGpuFreq = coreFrequency;
        this.gaugeDGPUFreq = this.tccdbus.tuxedoWmiAvailable?.value
            ? maxCoreFrequency > 0
                ? (coreFrequency / maxCoreFrequency) * 100
                : 0
            : 0;
    }

    private subscribeToDGpuInfo(): void {
        this.subscriptions.add(
            this.tccdbus.dGpuInfo.subscribe((dGpuInfo?: IdGpuInfo) => {
                this.setDGpuValues(dGpuInfo);
            })
        );
    }

    private setCpuValues(cpuPower?: ICpuPower): void {
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
                this.setCpuValues(cpuPower);
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

    private setIGpuValues(iGpuInfo?: IiGpuInfo): void {
        this.iGpuTemp = iGpuInfo?.temp ?? -1;
        const { coreFrequency = -1, maxCoreFrequency = 0 } = iGpuInfo ?? {};
        this.gaugeIGpuFreq =
            maxCoreFrequency > 0 ? (coreFrequency / maxCoreFrequency) * 100 : 0;
        this.iGpuFreq = coreFrequency;
        this.iGpuVendor = iGpuInfo?.vendor ?? "unknown";
        this.iGpuPower = iGpuInfo?.powerDraw ?? -1;
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
            this.tccdbus.fanData.subscribe((data: IDBusFanData) => {
                if (!data) return;

                this.fanData = data;
                const { cpu, gpu1, gpu2 } = data;
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

    public formatGpuFrequency = this.createFormatter(
        (val) => val >= 0,
        (val) => this.utils.formatGpuFrequency(val)
    );

    public gaugeCpuFreqFormat = this.createFormatter(
        () => true,
        (val) => this.utils.formatCpuFrequency(val)
    );

    public gaugeCpuTempFormat = this.createFormatter(
        () => this.compat.hasFanInfo,
        (val) => Math.round(val).toString()
    );

    public gaugeIGpuTempFormat = this.createFormatter(
        () => this.compat.hasIGpuTemp,
        (val) => Math.round(val).toString()
    );

    public gaugeDGpuTempFormat = this.createFormatter(
        () => this.compat.hasFanInfo,
        (val) => Math.round(val).toString()
    );

    public gaugeFanSpeedFormat = this.createFormatter(
        () => this.compat.hasFanInfo,
        (val) => Math.round(val).toString()
    );

    public cpuPowerFormat = this.createFormatter(
        () => this.compat.hasCpuPower,
        (val) => Math.round(val).toString()
    );

    public dGpuPowerFormat = this.createFormatter(
        () => this.compat.hasDGpuPowerDraw,
        (val) => Math.round(val).toString()
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

    public enableDGpuLogging(): void {
        this.tccdbus.setDGpuLoggingStatus(true);
    }
}
