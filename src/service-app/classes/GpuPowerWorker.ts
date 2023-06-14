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
import { GpuPowerValues } from "src/common/models/TccPowerSettings";
import { exec } from "child_process";

export class GpuPowerWorker extends DaemonWorker {
    constructor(tccd: TuxedoControlCenterDaemon) {
        super(2000, tccd);
    }

    isNvidiaSmiInstalled: Boolean = false;

    public onStart() {
        isNvidiaSmiInstalled().then((isInstalled) => {
            this.isNvidiaSmiInstalled = isInstalled;
            if (isInstalled) {
                getPowerValues().then((powerValues) => {
                    this.tccd.dbusData.gpuPowerValuesJSON =
                        JSON.stringify(powerValues);
                });
            }
        });
    }

    public onWork() {
        if (this.isNvidiaSmiInstalled) {
            getPowerValues().then((powerValues) => {
                this.tccd.dbusData.gpuPowerValuesJSON =
                    JSON.stringify(powerValues);
            });
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

function getPowerValues(): Promise<GpuPowerValues> {
    return new Promise((resolve, reject) => {
        const command =
            'nvidia-smi --query-gpu=power.draw,power.max_limit,enforced.power.limit \
            --format=csv,noheader | awk -F"," \'{gsub(/ |(\\[N\\/A\\])/,""); \
            print "{\\"power_draw\\": " ($1!=""?$1+0:-1) ", \\"max_pl\\": " \
            ($2!=""?$2+0:-1) ", \\"enforced_pl\\": " ($3!=""?$3+0:-1) "}" }\'';
        exec(command, (err, stdout, stderr) => {
            if (err || stderr) {
                reject();
            } else {
                const gpuInfo = JSON.parse(stdout.trim());
                resolve(gpuInfo);
            }
        });
    });
}
