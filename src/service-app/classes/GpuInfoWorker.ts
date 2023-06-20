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
import { GpuInfoValues } from "src/common/models/TccGpuValues";
import { exec } from "child_process";

export class GpuInfoWorker extends DaemonWorker {
    constructor(tccd: TuxedoControlCenterDaemon) {
        super(2000, tccd);
    }

    isNvidiaSmiInstalled: Boolean = false;

    public async onStart() {
        const isInstalled = await isNvidiaSmiInstalled();
        this.isNvidiaSmiInstalled = isInstalled;
        if (isInstalled) {
            const powerValues = await getPowerValues();
            this.tccd.dbusData.gpuInfoValuesJSON = JSON.stringify(powerValues);
        }
    }

    public async onWork() {
        if (!this.isNvidiaSmiInstalled) {
            this.isNvidiaSmiInstalled = await isNvidiaSmiInstalled();
        }

        if (this.isNvidiaSmiInstalled) {
            const powerValues = await getPowerValues();
            this.tccd.dbusData.gpuInfoValuesJSON = JSON.stringify(powerValues);
        }
    }

    public onExit() {}
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

async function getPowerValues(): Promise<GpuInfoValues> {
    const command =
        "nvidia-smi --query-gpu=power.draw,power.max_limit,enforced.power.limit,clocks.gr,clocks.max.gr --format=csv,noheader";

    try {
        const stdout = await execCommand(command);
        const gpuInfo = parseOutput(stdout);
        return gpuInfo;
    } catch (error) {
        return getDefaultValues();
    }
}

async function execCommand(command: string): Promise<string> {
    return new Promise((resolve, reject) => {
        exec(command, (error, stdout, stderr) => {
            if (error) {
                reject(error);
            } else {
                resolve(stdout.trim());
            }
        });
    });
}

function parseOutput(output: string): GpuInfoValues {
    const values = output.split(",").map((s) => s.trim());
    return {
        power_draw: parseNumberWithMetric(values[0]),
        max_pl: parseNumberWithMetric(values[1]),
        enforced_pl: parseNumberWithMetric(values[2]),
        core_freq: parseNumberWithMetric(values[3]),
        core_freq_max: parseNumberWithMetric(values[4]),
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

function getDefaultValues(): GpuInfoValues {
    return {
        power_draw: -1,
        max_pl: -1,
        enforced_pl: -1,
        core_freq: -1,
        core_freq_max: -1,
    };
}
