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
import { ICpuPower } from "../../common/models/TccPowerSettings";
import { IntelRAPLController } from "../../common/classes/IntelRAPLController";

export class CpuPowerWorker extends DaemonWorker {
    private RAPLPowerStatus: boolean = false;
    private RAPLConstraint0Status: boolean = false;
    private RAPLConstraint1Status: boolean = false;
    private RAPLConstraint2Status: boolean = false;

    private currentEnergy: number = 0;
    private lastUpdateTime: number = -1;

    private intelRAPL = new IntelRAPLController(
        "/sys/devices/virtual/powercap/intel-rapl/intel-rapl:0/"
    );

    constructor(tccd: TuxedoControlCenterDaemon) {
        super(2000, tccd);
    }

    public onStart(): void {
        this.RAPLPowerStatus = this.intelRAPL.getIntelRAPLPowerAvailable();

        this.RAPLConstraint0Status =
            this.intelRAPL.getIntelRAPLConstraint0Available()
                ? this.intelRAPL.getIntelRAPLConstraint0Available()
                : false;

        this.RAPLConstraint1Status =
            this.intelRAPL.getIntelRAPLConstraint1Available()
                ? this.intelRAPL.getIntelRAPLConstraint1Available()
                : false;

        this.RAPLConstraint2Status =
            this.intelRAPL.getIntelRAPLConstraint2Available()
                ? this.intelRAPL.getIntelRAPLConstraint2Available()
                : false;

        this.onWork();
    }

    public onWork(): void {
        const cpuPowerValues: ICpuPower = {
            powerDraw: this.getCurrentPower(),
            maxPowerLimit: this.getMaxPowerLimix(),
        };

        this.tccd.dbusData.cpuPowerValuesJSON = JSON.stringify(cpuPowerValues);
    }

    private getCurrentPower(): number {
        if (!this.RAPLPowerStatus) return -1;

        const energyIncrement = this.intelRAPL.getEnergy() - this.currentEnergy;
        const delay = this.getDelay();
        const powerDraw =
            delay && this.currentEnergy > 0
                ? energyIncrement / delay / 1000000
                : -1;
        this.currentEnergy += energyIncrement;

        return powerDraw;
    }

    private getDelay(): number {
        const currentTime = Date.now();
        const timeDifference =
            this.lastUpdateTime > 0
                ? (currentTime - this.lastUpdateTime) / 1000
                : -1;
        this.lastUpdateTime = currentTime;
        return timeDifference;
    }

    private getMaxPowerLimix(): number {
        let maxPowerLimit: number = -1;

        if (this.RAPLConstraint0Status) {
            const constraint0MaxPower = this.intelRAPL.getConstraint0MaxPower();
            if (constraint0MaxPower > 0) {
                maxPowerLimit = constraint0MaxPower;
            }
        }

        if (this.RAPLConstraint1Status) {
            const constraint1MaxPower = this.intelRAPL.getConstraint1MaxPower();
            if (
                constraint1MaxPower > 0 &&
                constraint1MaxPower > maxPowerLimit
            ) {
                maxPowerLimit = constraint1MaxPower;
            }
        }

        if (this.RAPLConstraint2Status) {
            const constraint2MaxPower = this.intelRAPL.getConstraint2MaxPower();
            if (
                constraint2MaxPower > 0 &&
                constraint2MaxPower > maxPowerLimit
            ) {
                maxPowerLimit = constraint2MaxPower;
            }
        }
        return maxPowerLimit / 1000000;
    }

    public onExit(): void {}
}
