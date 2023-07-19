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
import {
    IdGpuInfo,
    IiGpuInfo,
    IDefaultDGPUValues,
    IDefaultIGPUValues,
} from "src/common/models/TccGpuValues";
import { filter, tap } from "rxjs/operators";
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
    public avgCpuFreqData: { name: string; value: number }[] = [];

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

    // todo: automatically detect in system
    public primeSelectState: string = "on-demand";
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
    }

    ngOnDestroy(): void {
        this.subscriptions.unsubscribe();
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

    private setDGpuValues(
        dGpuInfo?: IdGpuInfo,
        dGpuDefaultValues?: IDefaultDGPUValues
    ): void {
        const powerDraw =
            dGpuInfo?.powerDraw >= 0
                ? dGpuInfo.powerDraw
                : dGpuDefaultValues?.powerDraw >= 0
                ? dGpuDefaultValues.powerDraw
                : 0;
        this.dGpuPower = powerDraw;

        const maxPowerLimit =
            dGpuInfo?.maxPowerLimit >= 0
                ? dGpuInfo.maxPowerLimit
                : dGpuDefaultValues?.powerDraw >= 0
                ? dGpuDefaultValues.powerDraw
                : 0;

        this.gaugeDGPUPower =
            maxPowerLimit > 0 ? (powerDraw / maxPowerLimit) * 100 : 0;

        const coreFrequency =
            dGpuInfo?.coreFrequency >= 0
                ? dGpuInfo.coreFrequency
                : dGpuDefaultValues?.gaugeCoreFrequency >= 0
                ? dGpuDefaultValues.gaugeCoreFrequency
                : 0;

        const maxCoreFrequency =
            dGpuInfo?.maxCoreFrequency >= 0 ? dGpuInfo.maxCoreFrequency : 0;

        this.gaugeDGPUFreq =
            maxCoreFrequency > 0 ? (coreFrequency / maxCoreFrequency) * 100 : 0;
        this.dGpuFreq = coreFrequency;
    }

    private subscribeToDGpuInfo(): void {
        this.subscriptions.add(
            this.tccdbus.dGpuInfo.subscribe((dGpuInfo?: IdGpuInfo) => {
                const dGpuDefaultValues: IDefaultDGPUValues = {
                    coreFrequency: 0,
                    gaugeCoreFrequency: 0,
                    powerDraw: 0,
                    gaugePower: 0,
                };

                this.setDGpuValues(dGpuInfo, dGpuDefaultValues);
            })
        );
    }

    private setCpuValues(
        cpuPower?: ICpuPower,
        cpuDefaultValues?: ICpuPower
    ): void {
        const powerDraw =
            cpuPower?.powerDraw ?? cpuDefaultValues?.powerDraw ?? 0;
        const maxPowerLimit =
            cpuPower?.maxPowerLimit && cpuPower.maxPowerLimit > 0
                ? cpuPower.maxPowerLimit
                : this.cpuPowerLimit
                ? this.cpuPowerLimit
                : cpuDefaultValues?.powerDraw
                ? cpuDefaultValues.powerDraw
                : 0;
        this.gaugeCPUPower =
            maxPowerLimit > 0 ? (powerDraw / maxPowerLimit) * 100 : 0;
        this.cpuPower = powerDraw;
    }

    private subscribeToCpuInfo(): void {
        this.subscriptions.add(
            this.tccdbus.cpuPower.subscribe((cpuPower?: ICpuPower) => {
                const cpuDefaultValues: ICpuPower = { powerDraw: 0 };

                this.setCpuValues(cpuPower, cpuDefaultValues);
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

    private setIGpuValues(
        iGpuInfo?: IiGpuInfo,
        iGpuDefaultValues?: IDefaultIGPUValues
    ): void {
        this.iGpuTemp = iGpuInfo?.temp ?? iGpuDefaultValues?.temp ?? 0;
        this.gaugeIGpuFreq =
            iGpuInfo?.coreFrequency >= 0 && iGpuInfo?.maxCoreFrequency > 0
                ? (iGpuInfo.coreFrequency / iGpuInfo.maxCoreFrequency) * 100
                : 0;
        this.iGpuFreq =
            iGpuInfo?.coreFrequency ?? iGpuDefaultValues?.coreFrequency ?? 0;
        this.iGpuVendor =
            iGpuInfo?.vendor ?? iGpuDefaultValues?.vendor ?? "unknown";
        this.iGpuPower =
            iGpuInfo?.powerDraw ?? iGpuDefaultValues?.powerDraw ?? 0;
    }

    private subscribeToIGpuInfo(): void {
        this.subscriptions.add(
            this.tccdbus.iGpuInfo.subscribe((iGpuInfo?: IiGpuInfo) => {
                const iGpuDefaultValues: IDefaultIGPUValues = {
                    temp: 0,
                    coreFrequency: 0,
                    gaugeCoreFrequency: 0,
                    powerDraw: 0,
                    vendor: "unknown",
                };

                this.setIGpuValues(iGpuInfo, iGpuDefaultValues);
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
        this.activeCores = 0;
        this.activeScalingMinFreqs = this.cpuCoreInfo
            .filter((core) => core.scalingMinFreq !== undefined)
            .map((core) => this.utils.formatCpuFrequency(core.scalingMinFreq))
            .filter((freq, idx, freqs) => freqs.indexOf(freq) === idx);

        this.activeScalingMaxFreqs = this.cpuCoreInfo
            .filter((core) => core.scalingMaxFreq !== undefined)
            .map((core) => this.utils.formatCpuFrequency(core.scalingMaxFreq))
            .filter((freq, idx, freqs) => freqs.indexOf(freq) === idx);

        this.activeScalingDrivers = this.cpuCoreInfo
            .filter((core) => core.scalingDriver !== undefined)
            .map((core) => core.scalingDriver)
            .filter((driver, idx, drivers) => drivers.indexOf(driver) === idx);

        this.activeScalingGovernors = this.cpuCoreInfo
            .filter((core) => core.scalingGovernor !== undefined)
            .map((core) => core.scalingGovernor)
            .filter(
                (governor, idx, governors) =>
                    governors.indexOf(governor) === idx
            );

        this.activeEnergyPerformancePreference = this.cpuCoreInfo
            .filter((core) => core.energyPerformancePreference !== undefined)
            .map((core) => core.energyPerformancePreference)
            .filter(
                (preference, idx, preferences) =>
                    preferences.indexOf(preference) === idx
            );

        const freqSum = this.cpuCoreInfo
            .map((core) => core.scalingCurFreq ?? 0)
            .reduce((sum, freq) => sum + freq, 0);
        this.avgCpuFreq = freqSum / this.cpuCoreInfo.length;
        this.avgCpuFreqData = [
            { name: "CPU frequency", value: this.avgCpuFreq },
        ];
    }

    public formatCpuFrequency = (frequency: number): string => {
        return this.utils.formatCpuFrequency(frequency);
    };

    public formatGpuFrequency = (frequency: number): string => {
        if (frequency > 0) {
            return this.utils.formatGpuFrequency(frequency);
        } else {
            return $localize`:@@noGpuFreqValue:N/A`;
        }
    };

    public gaugeCpuFreqFormat: (value: number) => string = (value) => {
        return this.utils.formatCpuFrequency(value);
    };

    public gaugeCpuTempFormat: (value: number) => string = (value) => {
        if (this.compat.hasFanInfo) {
            return Math.round(value).toString();
        } else {
            return $localize`:@@noFanTempValue:N/A`;
        }
    };

    public gaugeIGpuTempFormat: (value: number) => string = (value) => {
        if (this.compat.hasIGpuTemp) {
            return Math.round(value).toString();
        } else {
            return $localize`:@@noFanTempValue:N/A`;
        }
    };

    public gaugeDGpuTempFormat: (value: number) => string = (value) => {
        if (this.compat.hasFanInfo) {
            return Math.round(value).toString();
        } else {
            return $localize`:@@noFanTempValue:N/A`;
        }
    };

    public gaugeFanSpeedFormat: (value: number) => string = (value) => {
        if (this.compat.hasFanInfo) {
            return Math.round(value).toString();
        } else {
            return $localize`:@@noFanSpeedValue:N/A`;
        }
    };

    public cpuPowerFormat: (value: number) => string = (value) => {
        if (this.compat.hasCpuPower) {
            return Math.round(value).toString();
        } else {
            return $localize`:@@noCpuPowerValue:N/A`;
        }
    };

    public dGpuPowerFormat: (value: number) => string = (value) => {
        if (this.compat.hasDGpuPowerDraw) {
            return Math.round(value).toString();
        } else {
            return $localize`:@@noGpuPowerValue:N/A`;
        }
    };

    public iGpuPowerFormat: (value: number) => string = (value) => {
        if (this.compat.hasIGpuPowerDraw) {
            return Math.round(value).toString();
        } else {
            return $localize`:@@noGpuPowerValue:N/A`;
        }
    };

    public goToProfileEdit(profile: ITccProfile): void {
        if (profile !== undefined) {
            this.router.navigate(["profile-manager", profile.id], {
                relativeTo: this.route.parent,
            });
        }
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

    public enableDGpuLogging(): void {
        this.tccdbus.setDGpuLoggingStatus(true);
    }
}
