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
import { exec } from "child_process";
import {
    SysFsPropertyInteger,
    SysFsPropertyString,
} from "../../common/classes/SysFsProperties";
import * as path from "path";
import { IntelRAPLController } from "../../common/classes/IntelRAPLController";
import { PowerController } from "../../common/classes/PowerController";
import { VendorService } from "../../common/classes/Vendor.service";
import {
    amdIGpuDeviceIdString,
    intelIGpuDeviceIdString,
} from "../../common/classes/DeviceIDs";
import { execCommandAsync, countLines } from "../../common/classes/Utils";

export class GpuInfoWorker extends DaemonWorker {
    private isNvidiaSmiInstalled: Boolean = false;
    private cpuVendor: string;

    private amdIGpuHwmonPath: string;

    private intelIGpuDrmPath: string;
    private intelRAPLGpu: IntelRAPLController = new IntelRAPLController(
        "/sys/devices/virtual/powercap/intel-rapl/intel-rapl:0/intel-rapl:0:1/"
    );
    private intelPowerWorker: PowerController;

    private hwmonRetryCount: number = 3;

    constructor(
        public tccd: TuxedoControlCenterDaemon,
        private vendor: VendorService
    ) {
        super(2500, tccd);
    }

    public async onStart(): Promise<void> {
        this.cpuVendor = await this.vendor.getCpuVendor();
        if (this.cpuVendor === "amd") {
            this.amdIGpuHwmonPath = await this.getAmdIGpuHwmonPath();
        } else if (this.cpuVendor === "intel") {
            this.intelPowerWorker = new PowerController(this.intelRAPLGpu);
            this.intelIGpuDrmPath = await this.getIntelIGpuDrmPath();
        }

        this.isNvidiaSmiInstalled = await this.checkNvidiaSmiInstalled();
        this.onWork();
    }

    public async onWork(): Promise<void> {
        if (this.tccd.dbusData.sensorDataCollectionStatus) {
            this.getIGPUValues();
            this.getDGPUValues();
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

        if (amountIntelIGpuDevices === 1) {
            return intelIGpuDevices;
        }

        return undefined;
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

    private async getAmdIGpuHwmonPath(): Promise<string | undefined> {
        const amdIGpuDevices = await execCommandAsync(
            `grep -lP '${amdIGpuDeviceIdString}' /sys/class/hwmon/*/device/uevent | sed 's|/device/uevent$||'`
        );
        const amountAmdIGpuDevices = countLines(amdIGpuDevices);

        if (amountAmdIGpuDevices === 1) {
            return amdIGpuDevices;
        }

        return undefined;
    }

    async getAmdIGpuValues(iGpuValues: IiGpuInfo): Promise<IiGpuInfo> {
        let amdIGpuHwmonPath: string;

        if (this.amdIGpuHwmonPath) {
            amdIGpuHwmonPath = this.amdIGpuHwmonPath;
        }

        if (!this.amdIGpuHwmonPath && this.hwmonRetryCount > 0) {
            this.hwmonRetryCount -= 1;
            amdIGpuHwmonPath = this.amdIGpuHwmonPath =
                await this.getAmdIGpuHwmonPath();
        }

        if (!amdIGpuHwmonPath) {
            return iGpuValues;
        }

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

    async getIGPUValues(): Promise<void> {
        const iGpuValues: IiGpuInfo = {
            ...this.getDefaultValuesIGpu(),
            vendor: this.cpuVendor,
        };

        if (iGpuValues.vendor === "intel") {
            await this.getIntelIGpuValues(iGpuValues);
        } else if (iGpuValues.vendor === "amd") {
            await this.getAmdIGpuValues(iGpuValues);
        }

        const iGpuValuesJSON = JSON.stringify(iGpuValues);
        this.tccd.dbusData.iGpuInfoValuesJSON = iGpuValuesJSON;
    }

    private async getDGPUValues(): Promise<void> {
        if (!this.isNvidiaSmiInstalled) {
            this.isNvidiaSmiInstalled = await this.checkNvidiaSmiInstalled();
            return;
        }

        const dGpuPowerValues = this.tccd.dbusData.d0MetricsUsage
            ? await this.getDGpuPowerValues()
            : this.getDefaultValuesDGpu();

        const dGpuInfo: IdGpuInfo = {
            coreFrequency: dGpuPowerValues.coreFrequency,
            maxCoreFrequency: dGpuPowerValues.maxCoreFrequency,
            powerDraw: dGpuPowerValues.powerDraw,
            maxPowerLimit: dGpuPowerValues.maxPowerLimit,
            enforcedPowerLimit: dGpuPowerValues.enforcedPowerLimit,
            d0MetricsUsage: this.tccd.dbusData.d0MetricsUsage,
        };

        this.tccd.dbusData.dGpuInfoValuesJSON = JSON.stringify(dGpuInfo);
    }

    private parseMaxAmdFreq(s: string): number {
        const mhzNumbers = s.match(/\d+Mhz/g).map((str) => parseInt(str));
        return Math.max(...mhzNumbers);
    }

    private checkNvidiaSmiInstalled(): Promise<Boolean> {
        return new Promise((resolve, reject) => {
            exec("which nvidia-smi", (err, stdout, stderr) => {
                if (err || stderr) {
                    resolve(false);
                } else {
                    resolve(stdout.trim().length > 0);
                }
            });
        });
    }

    private async getDGpuPowerValues(): Promise<IdGpuInfo> {
        const command =
            "nvidia-smi --query-gpu=power.draw,power.max_limit,enforced.power.limit,clocks.gr,clocks.max.gr --format=csv,noheader";

        try {
            const stdout = await execCommandAsync(command);
            const gpuInfo = this.parseOutput(stdout);
            return gpuInfo;
        } catch (error) {
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
