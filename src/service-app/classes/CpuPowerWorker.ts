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
import { CpuPower } from "../../common/models/TccPowerSettings";
import { IntelRAPLController } from "../../common/classes/IntelRAPLController";

export class CpuPowerWorker extends DaemonWorker {
    private RAPLStatus: boolean = false;
    private currentEnergy: number = -1;
    private delay: number = 2;

    private intelRAPL = new IntelRAPLController(
        "/sys/devices/virtual/powercap/intel-rapl/intel-rapl:0/"
    );

    constructor(tccd: TuxedoControlCenterDaemon) {
        super(2000, tccd);
    }

    onStart() {
        this.RAPLStatus = this.intelRAPL.getIntelRAPLAvailable();
    }

    onWork() {
        if (!this.RAPLStatus) {
            return;
        }

        const nextEnergy = this.intelRAPL.getEnergy();
        const powerDraw =
            (nextEnergy - this.currentEnergy) / this.delay / 1000000;
        const maxPowerLimit = this.intelRAPL.getMaxPower() / 1000000;

        const cpuPowerValues: CpuPower = {
            powerDraw: powerDraw,
            maxPowerLimit: maxPowerLimit,
        };

        if (this.currentEnergy > 0) {
            this.tccd.dbusData.cpuPowerValuesJSON =
                JSON.stringify(cpuPowerValues);
        }

        this.currentEnergy = nextEnergy;
    }

    public onExit() {}
}
