/*!
 * Copyright (c) 2019-2026 TUXEDO Computers GmbH <tux@tuxedocomputers.com>
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

import { IntelRAPLController } from '../../common/classes/IntelRAPLController';
import { PowerController } from '../../common/classes/PowerController';
import type { ICpuPower } from '../../common/models/TccPowerSettings';
import { DaemonWorker } from './DaemonWorker';
import type { TuxedoControlCenterDaemon } from './TuxedoControlCenterDaemon';

export class CpuPowerWorker extends DaemonWorker {
    private RAPLConstraint0Status: boolean = false;
    private RAPLConstraint1Status: boolean = false;
    private RAPLConstraint2Status: boolean = false;

    private intelRAPL: IntelRAPLController = new IntelRAPLController(
        '/sys/devices/virtual/powercap/intel-rapl/intel-rapl:0/',
    );
    private powerWorker: PowerController;

    constructor(tccd: TuxedoControlCenterDaemon) {
        super(2000, 'CpuPowerWorker', tccd);
    }

    public async onStart(): Promise<void> {
        this.powerWorker = new PowerController(this.intelRAPL);

        this.RAPLConstraint0Status = this.intelRAPL.getIntelRAPLConstraint0Available()
            ? this.intelRAPL.getIntelRAPLConstraint0Available()
            : false;

        this.RAPLConstraint1Status = this.intelRAPL.getIntelRAPLConstraint1Available()
            ? this.intelRAPL.getIntelRAPLConstraint1Available()
            : false;

        this.RAPLConstraint2Status = this.intelRAPL.getIntelRAPLConstraint2Available()
            ? this.intelRAPL.getIntelRAPLConstraint2Available()
            : false;

        this.onWork();
    }

    public async onWork(): Promise<void> {
        if (this.tccd.dbusData.sensorDataCollectionStatus) {
            const cpuPowerValues: ICpuPower = {
                powerDraw: this.getCurrentPower(),
                maxPowerLimit: this.getMaxPowerLimix(),
            };

            this.tccd.dbusData.cpuPowerValuesJSON = JSON.stringify(cpuPowerValues);
        } else {
            this.tccd.dbusData.cpuPowerValuesJSON = JSON.stringify({
                powerDraw: -1,
            });
        }
    }

    private getCurrentPower(): number {
        return this.powerWorker.getCurrentPower();
    }

    private getMaxPowerLimix(): number {
        if (!this.RAPLConstraint0Status && !this.RAPLConstraint1Status && !this.RAPLConstraint2Status) {
            return -1;
        }

        let maxPowerLimit: number = -1;

        if (this.RAPLConstraint0Status) {
            const constraint0MaxPower: number = this.intelRAPL.getConstraint0MaxPower();
            if (constraint0MaxPower > 0) {
                maxPowerLimit = constraint0MaxPower;
            }
        }

        if (this.RAPLConstraint1Status) {
            const constraint1MaxPower: number = this.intelRAPL.getConstraint1MaxPower();
            if (constraint1MaxPower > 0 && constraint1MaxPower > maxPowerLimit) {
                maxPowerLimit = constraint1MaxPower;
            }
        }

        if (this.RAPLConstraint2Status) {
            const constraint2MaxPower: number = this.intelRAPL.getConstraint2MaxPower();
            if (constraint2MaxPower > 0 && constraint2MaxPower > maxPowerLimit) {
                maxPowerLimit = constraint2MaxPower;
            }
        }
        return maxPowerLimit / 1000000;
    }

    public async onExit(): Promise<void> {}
}
