/*!
 * Copyright (c) 2019-2024 TUXEDO Computers GmbH <tux@tuxedocomputers.com>
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

import { TuxedoIOAPI as ioAPI, ObjWrapper } from "../../native-lib/TuxedoIOAPI";
import { apiBaseClass } from "./FanControlBaseClass";

export class tuxedoIoAPI extends apiBaseClass {
    public async initFanControl(): Promise<void> {
        ioAPI.setEnableModeSet(true);
        this.tccd.dbusData.fansOffAvailable = ioAPI.getFansOffAvailable();
        this.tccd.dbusData.fansMinSpeed = ioAPI.getFansMinSpeed();
    }

    public async mapLogicToFans(nrFans: number): Promise<boolean> {
        if (!this.fans) {
            this.fans = new Map();
            const [fanTemp0, fanTemp1, fanTemp2] = await Promise.all([
                this.getFanTemperature(0),
                this.getFanTemperature(1),
                this.getFanTemperature(2),
            ]);

            // todo: maybe add change into tuxedo-drivers to return -1 if value not available
            if (fanTemp0 > 1 && nrFans >= 1) {
                this.fans.set(1, this.cpuLogic);
            }
            if (fanTemp1 > 1 && nrFans >= 2) {
                this.fans.set(2, this.gpu1Logic);
            }
            if (fanTemp2 > 1 && nrFans >= 3) {
                this.fans.set(3, this.gpu2Logic);
            }

            if (this.fans.size === 0) {
                return false;
            }
        }

        return true;
    }

    public async getFanSpeedPercent(fanIndex: number): Promise<number> {
        const currentSpeedPercent: ObjWrapper<number> = { value: -1 };
        const speedReadSuccess = ioAPI.getFanSpeedPercent(
            fanIndex,
            currentSpeedPercent
        );

        if (!speedReadSuccess) {
            console.log("Fan Control: Fan speed read with IO Api failed");
        }

        return currentSpeedPercent.value;
    }

    public async getFanTemperature(fanIndex: number): Promise<number> {
        const currentTemperatureCelcius: ObjWrapper<number> = { value: -1 };
        const tempReadSuccess = ioAPI.getFanTemperature(
            fanIndex,
            currentTemperatureCelcius
        );

        if (!tempReadSuccess) {
            console.log("Fan Control: Fan temp read with IO Api failed");
        }

        return currentTemperatureCelcius.value;
    }

    public async writeFanSpeed(
        fanIndex: number,
        calculatedSpeed: number
    ): Promise<void> {
        const speedWriteSuccess = ioAPI.setFanSpeedPercent(
            fanIndex,
            calculatedSpeed
        );

        if (!speedWriteSuccess) {
            console.log("Fan Control: Fan speed write with IO Api failed");
        }
    }

    public async getNumberFans(): Promise<number> {
        return ioAPI.getNumberFans();
    }

    public async clearTempValues(): Promise<void> {}

    public async checkAvailable(): Promise<boolean> {
        return ioAPI.wmiAvailable();
    }

    public async exit(): Promise<void> {
        ioAPI.setFansAuto(); // required to avoid high fan speed on wakeup for certain devices
        ioAPI.setEnableModeSet(false);
    }
}
