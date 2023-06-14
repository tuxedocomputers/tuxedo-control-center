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
import * as fs from "fs";
import { fileOK } from "../../common/classes/Utils";
import { CpuPowerValues } from "src/common/models/TccPowerSettings";

export class CpuPowerWorker extends DaemonWorker {
    constructor(tccd: TuxedoControlCenterDaemon) {
        super(2000, tccd);
    }

    uj_current: number = 0;
    uj_next: number = 0;
    delay: number = 2;
    power_draw: number = 0;
    max_pl: number = 0;

    path_uj: string =
        "/sys/devices/virtual/powercap/intel-rapl/intel-rapl:0/energy_uj";
    path_max_uw: string =
        "/sys/devices/virtual/powercap/intel-rapl/intel-rapl:0/constraint_0_max_power_uw";

    public onStart() {
        if (fileOK(this.path_uj)) {
            this.uj_current = Number(fs.readFileSync(this.path_uj));
        }
    }

    public onWork() {
        if (fileOK(this.path_uj)) {
            this.uj_next = Number(fs.readFileSync(this.path_uj));
            this.power_draw =
                (this.uj_next - this.uj_current) / this.delay / 1000000;
            this.uj_current = this.uj_next;
        }

        if (fileOK(this.path_max_uw)) {
            this.max_pl = Number(fs.readFileSync(this.path_max_uw)) / 1000000;
        }

        let placeholder: CpuPowerValues = {
            power_draw: this.power_draw,
            max_pl: this.max_pl,
        };

        this.tccd.dbusData.cpuPowerValuesJSON = JSON.stringify(placeholder);
    }

    public onExit() {}
}
