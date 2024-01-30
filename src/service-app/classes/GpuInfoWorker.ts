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

import { DaemonWorker } from "./DaemonWorker";
import { TuxedoControlCenterDaemon } from "./TuxedoControlCenterDaemon";
import { IdGpuInfo, IiGpuInfo } from "src/common/models/TccGpuValues";
import {
    SysFsPropertyInteger,
    SysFsPropertyString,
} from "../../common/classes/SysFsProperties";
import * as path from "path";
import { IntelRAPLController } from "../../common/classes/IntelRAPLController";
import { PowerController } from "../../common/classes/PowerController";
import {
    amdDGpuDeviceIdString,
    amdIGpuDeviceIdString,
    intelIGpuDeviceIdString,
} from "../../common/classes/DeviceIDs";
import { execCommandAsync, countLines } from "../../common/classes/Utils";
import { AvailabilityService } from "../../common/classes/availability.service";

export class GpuInfoWorker extends DaemonWorker {
    private isNvidiaSmiInstalled: Boolean = false;

    private amdIGpuHwmonPath: string;
    private amdDGpuHwmonPath: string;

    private intelIGpuDrmPath: string;
    private intelRAPLGpu: IntelRAPLController = new IntelRAPLController(
        "/sys/devices/virtual/powercap/intel-rapl/intel-rapl:0/intel-rapl:0:1/"
    );
    private intelPowerWorker: PowerController;

    private hwmonIGpuRetryCount: number = 3;
    private hwmonDGpuRetryCount: number = 3;

    constructor(
        public tccd: TuxedoControlCenterDaemon,
        private availability: AvailabilityService
    ) {
        super(2500, tccd);
    }

    public async onStart(): Promise<void> {
        if (this.availability.getAmdIGpuCount() === 1) {
            this.amdIGpuHwmonPath = await this.getAmdIGpuHwmonPath();
        } else if (this.availability.getIntelIGpuCount() === 1) {
            this.intelPowerWorker = new PowerController(this.intelRAPLGpu);
            this.intelIGpuDrmPath = await this.getIntelIGpuDrmPath();
        }

        if (this.availability.getNvidiaDGpuCount() === 1) {
            this.isNvidiaSmiInstalled = await this.checkNvidiaSmiInstalled();
        } else if (this.availability.getAmdDGpuCount() === 1) {
            this.amdDGpuHwmonPath = await this.getAmdDGpuHwmonPath();
        }

        this.onWork();
    }

    public async onWork(): Promise<void> {
        if (this.tccd.dbusData.sensorDataCollectionStatus) {
            await Promise.all([this.getIGPUValues(), this.getDGPUValues()]);
        } else {
            this.tccd.dbusData.iGpuInfoValuesJSON = JSON.stringify(
                this.getDefaultValuesIGpu()
            );
            this.tccd.dbusData.dGpuInfoValuesJSON = JSON.stringify(
                this.getDefaultValuesDGpu()
            );
        }
    }

    public onExit(): void {}

    private async getIntelIGpuDrmPath(): Promise<string | undefined> {
        const intelIGpuDevices = await execCommandAsync(
            `grep -lP '${intelIGpuDeviceIdString}' /sys/bus/pci/devices/*/drm/card*/device/uevent | sed 's|/device/uevent$||'`
        );
        const amountIntelIGpuDevices = countLines(intelIGpuDevices);

        return amountIntelIGpuDevices === 1 ? intelIGpuDevices : undefined;
    }

    async getIGPUValues(): Promise<void> {
        const iGpuValues: IiGpuInfo = {
            ...this.getDefaultValuesIGpu(),
        };

        if (this.availability.getIntelIGpuCount() === 1) {
            await this.getIntelIGpuValues(iGpuValues);
        } else if (this.availability.getAmdIGpuCount() === 1) {
            await this.getAmdIGpuValues(iGpuValues);
        }

        const iGpuValuesJSON = JSON.stringify(iGpuValues);
        this.tccd.dbusData.iGpuInfoValuesJSON = iGpuValuesJSON;
    }

    async getIntelIGpuValues(iGpuValues: IiGpuInfo): Promise<IiGpuInfo> {
        if (!this.intelIGpuDrmPath) {
            return iGpuValues;
        }

        const intelProperties = {
            cur_freq: new SysFsPropertyInteger(
                path.join(this.intelIGpuDrmPath, "gt_act_freq_mhz")
            ),
            max_freq: new SysFsPropertyInteger(
                path.join(this.intelIGpuDrmPath, "gt_RP0_freq_mhz")
            ),
        };

        if (
            intelProperties.cur_freq.isAvailable() &&
            intelProperties.max_freq.isAvailable()
        ) {
            iGpuValues.coreFrequency = intelProperties.cur_freq.readValueNT();
            iGpuValues.maxCoreFrequency =
                intelProperties.max_freq.readValueNT();
        }

        iGpuValues.powerDraw = this.getCurrentPower();

        return iGpuValues;
    }

    private getCurrentPower(): number {
        return this.intelPowerWorker.getCurrentPower();
    }

    async getAmdIGpuValues(iGpuValues: IiGpuInfo): Promise<IiGpuInfo> {
        if (this.amdIGpuHwmonPath) {
            return await this.readAmdIGpuValues(
                iGpuValues,
                this.amdIGpuHwmonPath
            );
        }

        if (this.hwmonIGpuRetryCount > 0) {
            this.hwmonIGpuRetryCount -= 1;
            const amdIGpuHwmonPath = await this.getAmdIGpuHwmonPath();
            if (amdIGpuHwmonPath) {
                this.amdIGpuHwmonPath = amdIGpuHwmonPath;
                return await this.readAmdIGpuValues(
                    iGpuValues,
                    amdIGpuHwmonPath
                );
            }
        }

        return iGpuValues;
    }

    async readAmdIGpuValues(
        iGpuValues: IiGpuInfo,
        amdIGpuHwmonPath: string
    ): Promise<IiGpuInfo> {
        const amdProperties = {
            temp: new SysFsPropertyInteger(
                path.join(amdIGpuHwmonPath, "temp1_input")
            ),
            cur_freq: new SysFsPropertyInteger(
                path.join(amdIGpuHwmonPath, "freq1_input")
            ),
            max_freq: new SysFsPropertyString(
                path.join(amdIGpuHwmonPath, "device/pp_dpm_sclk")
            ),
        };

        if (amdProperties.temp.isAvailable()) {
            iGpuValues.temp = amdProperties.temp.readValueNT() / 1000;
        }

        if (
            amdProperties.cur_freq.isAvailable() &&
            amdProperties.max_freq.isAvailable()
        ) {
            const curFreqValue = amdProperties.cur_freq.readValueNT();
            const maxFreqValue = amdProperties.max_freq.readValueNT();

            iGpuValues.coreFrequency = curFreqValue / 1000000;
            iGpuValues.maxCoreFrequency = this.parseMaxAmdFreq(maxFreqValue);
        }

        return iGpuValues;
    }

    private parseMaxAmdFreq(s: string): number {
        const mhzNumbers = s.match(/\d+Mhz/g).map((str) => parseInt(str));
        return Math.max(...mhzNumbers);
    }

    private async getAmdIGpuHwmonPath(): Promise<string | undefined> {
        const amdIGpuDevices = await execCommandAsync(
            `grep -lP '${amdIGpuDeviceIdString}' /sys/class/hwmon/*/device/uevent | sed 's|/device/uevent$||'`
        );
        const amountAmdIGpuDevices = countLines(amdIGpuDevices);

        return amountAmdIGpuDevices === 1 ? amdIGpuDevices : undefined;
    }

    async getDGPUValues(): Promise<void> {
        let dGpuValues: IdGpuInfo = this.getDefaultValuesDGpu();
        const nvidiaDevices = this.availability.getNvidiaDGpuCount();
        const amdDGpuDevices = this.availability.getAmdDGpuCount();
        const metricsUsage = this.tccd.dbusData.d0MetricsUsage;

        if (nvidiaDevices === 1 && metricsUsage) {
            dGpuValues = await this.getNvidiaDGPUValues();
        } else if (amdDGpuDevices === 1 && metricsUsage) {
            if (this.amdDGpuHwmonPath || this.checkAmdDGpuHwmonPath()) {
                dGpuValues = await this.getAmdDGpuValues(dGpuValues);
            }
        }

        dGpuValues.d0MetricsUsage = metricsUsage;

        this.tccd.dbusData.dGpuInfoValuesJSON = JSON.stringify(dGpuValues);
    }

    private async getNvidiaDGPUValues(): Promise<IdGpuInfo> {
        if (!this.isNvidiaSmiInstalled) {
            this.isNvidiaSmiInstalled = await this.checkNvidiaSmiInstalled();
            return;
        }

        return await this.getNvidiaDGpuPowerValues();
    }

    private async checkNvidiaSmiInstalled(): Promise<Boolean> {
        try {
            const stdout = await execCommandAsync("which nvidia-smi");
            return stdout.trim().length > 0;
        } catch (error) {
            console.error(
                "Error happened while checking nvidia-smi availability"
            );
            return false;
        }
    }

    private async getNvidiaDGpuPowerValues(): Promise<IdGpuInfo> {
        const command =
            "nvidia-smi --query-gpu=power.draw,power.max_limit,enforced.power.limit,clocks.gr,clocks.max.gr --format=csv,noheader";

        try {
            const stdout = await execCommandAsync(command);
            const gpuInfo = this.parseOutput(stdout);
            return gpuInfo;
        } catch (error) {
            console.error("Failed to get Nvidia dGpu values");
            return this.getDefaultValuesDGpu();
        }
    }

    private parseOutput(output: string): IdGpuInfo {
        const [
            powerDraw,
            maxPowerLimit,
            enforcedPowerLimit,
            coreFrequency,
            maxCoreFrequency,
        ] = output
            .split(",")
            .map((value) => this.parseNumberWithMetric(value.trim()));

        return {
            powerDraw,
            maxPowerLimit,
            enforcedPowerLimit,
            coreFrequency,
            maxCoreFrequency,
        };
    }

    private parseNumberWithMetric(value: string): number {
        const numberRegex = /(\d+(\.\d+)?)/;
        const match = numberRegex.exec(value);
        if (match !== null) {
            return Number(match[0]);
        }
        return -1;
    }

    private async getAmdDGpuValues(dGpuValues) {
        const amdDGpuHwmonPath = this.amdDGpuHwmonPath;

        // not using power1_cap_max as maximum due to unreliable numbers
        const amdProperties = {
            coreFrequency: new SysFsPropertyInteger(
                path.join(amdDGpuHwmonPath, "freq1_input")
            ),
            powerDraw: new SysFsPropertyInteger(
                path.join(amdDGpuHwmonPath, "power1_average")
            ),
        };

        if (amdProperties.coreFrequency.isAvailable()) {
            dGpuValues.coreFrequency =
                amdProperties.coreFrequency.readValueNT() / 1000000;
        }

        if (amdProperties.powerDraw.isAvailable()) {
            const powerDraw = amdProperties.powerDraw.readValueNT();

            dGpuValues.powerDraw = powerDraw / 1000000;
        }

        return dGpuValues;
    }

    private async checkAmdDGpuHwmonPath(): Promise<string | undefined> {
        let amdDGpuHwmonPath = this.amdDGpuHwmonPath;

        if (!amdDGpuHwmonPath && this.hwmonDGpuRetryCount > 0) {
            this.hwmonDGpuRetryCount -= 1;
            amdDGpuHwmonPath = this.amdDGpuHwmonPath =
                await this.getAmdDGpuHwmonPath();
        }

        return amdDGpuHwmonPath;
    }

    private async getAmdDGpuHwmonPath(): Promise<string | undefined> {
        const amdDGpuDevices = await execCommandAsync(
            `grep -lP '${amdDGpuDeviceIdString}' /sys/class/hwmon/*/device/uevent | sed 's|/device/uevent$||'`
        );
        const amountAmdDGpuDevices = countLines(amdDGpuDevices);

        return amountAmdDGpuDevices === 1 ? amdDGpuDevices : undefined;
    }

    private getDefaultValuesDGpu(): IdGpuInfo {
        return {
            powerDraw: -1,
            maxPowerLimit: -1,
            enforcedPowerLimit: -1,
            coreFrequency: -1,
            maxCoreFrequency: -1,
        };
    }

    private getDefaultValuesIGpu(): IiGpuInfo {
        return {
            vendor: "unknown",
            temp: -1,
            coreFrequency: -1,
            maxCoreFrequency: -1,
            powerDraw: -1,
        };
    }
}
