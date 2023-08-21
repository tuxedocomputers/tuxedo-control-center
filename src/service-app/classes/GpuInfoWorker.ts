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

export class GpuInfoWorker extends DaemonWorker {
    private isNvidiaSmiInstalled: Boolean = false;
    private cpuVendor: string;

    private hwmonPath: string;
    private intelRAPLGPU: IntelRAPLController = new IntelRAPLController(
        "/sys/devices/virtual/powercap/intel-rapl/intel-rapl:0/intel-rapl:0:1/"
    );
    private powerWorker: PowerController;

    constructor(tccd: TuxedoControlCenterDaemon) {
        super(2000, tccd);
    }

    public async onStart(): Promise<void> {
        const cpuVendor = await checkCpuVendor();
        this.cpuVendor = cpuVendor;

        if (cpuVendor === "amd") {
            this.hwmonPath = await this.getHwmonPath();
        }
        if (cpuVendor === "intel") {
            this.powerWorker = new PowerController(this.intelRAPLGPU);
        }

        const isInstalled = await isNvidiaSmiInstalled();
        this.isNvidiaSmiInstalled = isInstalled;

        this.onWork();
    }

    public async onWork(): Promise<void> {
        // todo: only make it run when user is in dashboard
        this.getIGPUValues();
        // todo: tccd restart results in this.tccd.dbusData.dGpuLogging status reset and halts value updates
        //this.getDGPUValues();
    }

    public onExit(): void {}

    getIntelIGpuValues(iGpuValues: IiGpuInfo): IiGpuInfo {
        const intelProperties = {
            cur_freq: new SysFsPropertyInteger(
                "/sys/class/drm/card0/gt_act_freq_mhz"
            ),
            max_freq: new SysFsPropertyInteger(
                "/sys/class/drm/card0/gt_RP0_freq_mhz"
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
        return this.powerWorker.getCurrentPower();
    }

    private async getHwmonPath(): Promise<string | undefined> {
        return await execCommand(
            "grep -rl '^amdgpu$' /sys/class/hwmon/*/name | sed 's|/name$||'"
        );
    }

    async getAmdIGpuValues(iGpuValues: IiGpuInfo): Promise<IiGpuInfo> {
        const hwmonPath = this.hwmonPath;
        const devicePath = "/sys/class/drm/card0/device/";

        if (!hwmonPath) {
            return iGpuValues;
        }

        const amdProperties = {
            temp: new SysFsPropertyInteger(path.join(hwmonPath, "temp1_input")),
            cur_freq: new SysFsPropertyInteger(
                path.join(hwmonPath, "freq1_input")
            ),
            max_freq: new SysFsPropertyString(
                path.join(devicePath, "pp_dpm_sclk")
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
            iGpuValues.maxCoreFrequency = parseMaxAmdFreq(maxFreqValue);
        }

        return iGpuValues;
    }

    async getIGPUValues(): Promise<void> {
        const iGpuValues: IiGpuInfo = {
            ...getDefaultValuesIGpu(),
            vendor: this.cpuVendor,
        };

        if (iGpuValues.vendor === "intel") {
            this.getIntelIGpuValues(iGpuValues);
        } else if (iGpuValues.vendor === "amd") {
            await this.getAmdIGpuValues(iGpuValues);
        }

        const iGpuValuesJSON = JSON.stringify(iGpuValues);
        this.tccd.dbusData.iGpuInfoValuesJSON = iGpuValuesJSON;
    }

    private async getDGPUValues(): Promise<void> {
        if (!this.isNvidiaSmiInstalled) {
            this.isNvidiaSmiInstalled = await isNvidiaSmiInstalled();
        }

        if (this.isNvidiaSmiInstalled) {
            const dGpuPowerValues = await getDGpuPowerValues();
            this.tccd.dbusData.dGpuInfoValuesJSON =
                JSON.stringify(dGpuPowerValues);
        }
    }
}

function parseMaxAmdFreq(s: string): number {
    const mhzNumbers = s.match(/\d+Mhz/g).map((str) => parseInt(str));
    return Math.max(...mhzNumbers);
}

async function checkCpuVendor(): Promise<string> {
    const stdout = await execCommand("cat /proc/cpuinfo | grep vendor_id");

    const outputLines = stdout.split("\n");
    const vendorLine = outputLines.find((line) => line.includes("vendor_id"));

    if (vendorLine) {
        const vendor = vendorLine.split(":")[1].trim();

        if (vendor === "GenuineIntel") {
            return "intel";
        } else if (vendor === "AuthenticAMD") {
            return "amd";
        }
    }
}

function isNvidiaSmiInstalled(): Promise<Boolean> {
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

async function getDGpuPowerValues(): Promise<IdGpuInfo> {
    const command =
        "nvidia-smi --query-gpu=power.draw,power.max_limit,enforced.power.limit,clocks.gr,clocks.max.gr --format=csv,noheader";

    try {
        const stdout = await execCommand(command);
        const gpuInfo = parseOutput(stdout);
        return gpuInfo;
    } catch (error) {
        return getDefaultValuesDGpu();
    }
}

async function execCommand(command: string): Promise<string> {
    return new Promise((resolve, reject) => {
        exec(command, (error, stdout, stderr) => {
            if (error || stderr) {
                resolve(undefined);
            } else {
                resolve(stdout.trim());
            }
        });
    });
}

function parseOutput(output: string): IdGpuInfo {
    const [
        powerDraw,
        maxPowerLimit,
        enforcedPowerLimit,
        coreFrequency,
        maxCoreFrequency,
    ] = output.split(",").map((value) => parseNumberWithMetric(value.trim()));

    return {
        powerDraw,
        maxPowerLimit,
        enforcedPowerLimit,
        coreFrequency,
        maxCoreFrequency,
    };
}

function parseNumberWithMetric(value: string): number {
    const numberRegex = /(\d+(\.\d+)?)/;
    const match = numberRegex.exec(value);
    if (match !== null) {
        return Number(match[0]);
    }
    return -1;
}

function getDefaultValuesDGpu(): IdGpuInfo {
    return {
        powerDraw: -1,
        maxPowerLimit: -1,
        enforcedPowerLimit: -1,
        coreFrequency: -1,
        maxCoreFrequency: -1,
    };
}

function getDefaultValuesIGpu(): IiGpuInfo {
    return {
        vendor: "unknown",
        temp: -1,
        coreFrequency: -1,
        maxCoreFrequency: -1,
        powerDraw: -1,
    };
}
