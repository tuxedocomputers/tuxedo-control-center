/*!
 * Copyright (c) 2019-2025 TUXEDO Computers GmbH <tux@tuxedocomputers.com>
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

import type { ObjWrapper } from '../../native-lib/TuxedoIOAPI';
import { TuxedoIOAPI as ioAPI } from '../../native-lib/TuxedoIOAPI';
import { FanControlBaseClass } from './FanControlBaseClass';
import { FAN_LOGIC } from './FanControlLogic';

export class FanControlTuxedoIO extends FanControlBaseClass {
    public async initFanControl(fanWriteAvailable: boolean, fanControlEnabled: boolean): Promise<void> {
        if (fanWriteAvailable) {
            if (fanControlEnabled) {
                ioAPI.setEnableModeSet(true);
                console.log('FanControlTuxedoIO: Enabling manual mode');
            }
            if (!fanControlEnabled) {
                ioAPI.setFansAuto();
                ioAPI.setEnableModeSet(false);
                console.log('FanControlTuxedoIO: Enabling automatic mode');
            }

            this.tccd.dbusData.fansOffAvailable = ioAPI.getFansOffAvailable();
            this.tccd.dbusData.fansMinSpeed = ioAPI.getFansMinSpeed();
        } else {
            console.log('FanControlTuxedoIO: Fan write not available');
        }
    }

    public async mapLogicToFans(numberInterfaces: number, reset?: boolean): Promise<boolean> {
        if (!this.fans || this.fans.size === 0 || reset) {
            this.fans = new Map();
            const [fanTemp0, fanTemp1, fanTemp2] = await Promise.all([
                this.getFanTemperature(0, false),
                this.getFanTemperature(1, false),
                this.getFanTemperature(2, false),
            ]);

            // todo: maybe add change into tuxedo-drivers to return -1 if value not available
            if (fanTemp0 > 1 && numberInterfaces >= 1) {
                this.setFan(1, FAN_LOGIC.CPU);
            }
            if (fanTemp1 > 1 && numberInterfaces >= 2) {
                this.setFan(2, FAN_LOGIC.GPU);
            }
            if (fanTemp2 > 1 && numberInterfaces >= 3) {
                this.setFan(3, FAN_LOGIC.GPU);
            }

            if (this.fans.size === 0) {
                return false;
            }
        }

        return true;
    }

    public async getNumberFansAvailable(): Promise<number> {
        const [fanTemp0, fanTemp1, fanTemp2] = await Promise.all([
            this.getFanTemperature(0, false),
            this.getFanTemperature(1, false),
            this.getFanTemperature(2, false),
        ]);

        if (fanTemp2 > 1 && fanTemp1 > 1 && fanTemp0 > 1) {
            return 3;
        }
        if (fanTemp1 > 1 && fanTemp0 > 1) {
            return 2;
        }
        if (fanTemp0 > 1) {
            return 1;
        }
        return 0;
    }

    public async getFanSpeedPercent(fanIndex: number): Promise<number> {
        const currentSpeedPercent: ObjWrapper<number> = { value: -1 };
        const speedReadSuccess: boolean = ioAPI.getFanSpeedPercent(fanIndex, currentSpeedPercent);

        if (!speedReadSuccess) {
            console.log(`FanControlTuxedoIO: Fan speed read with IO API index ${fanIndex} failed`);
        }

        return currentSpeedPercent.value;
    }

    public async getFanTemperature(fanIndex: number, logging?: boolean): Promise<number> {
        const currentTemperatureCelcius: ObjWrapper<number> = { value: -1 };
        const tempReadSuccess: boolean = ioAPI.getFanTemperature(fanIndex, currentTemperatureCelcius);

        if (!tempReadSuccess && (logging ?? true)) {
            console.log(`FanControlTuxedoIO: Fan temperature read with IO API index ${fanIndex} failed`);
        }

        return currentTemperatureCelcius.value;
    }

    public async writeFanSpeed(fanIndex: number, calculatedSpeed: number): Promise<void> {
        const speedWriteSuccess: boolean = ioAPI.setFanSpeedPercent(fanIndex, calculatedSpeed);

        if (!speedWriteSuccess) {
            console.log(`FanControlTuxedoIO: Fan speed write with IO API index ${fanIndex} failed`);
        }
    }

    public async getNumberFanInterfaces(): Promise<number> {
        return ioAPI.getNumberFans();
    }

    public async getNumberFans(): Promise<number> {
        return this.fans.size;
    }

    public async clearTempValues(): Promise<void> {}

    public async checkAvailable(): Promise<[boolean, boolean]> {
        const wmiStatus: boolean = ioAPI.wmiAvailable();
        return [wmiStatus, wmiStatus];
    }

    public async exit(): Promise<void> {
        ioAPI.setFansAuto(); // required to avoid high fan speed on wakeup for certain devices
        ioAPI.setEnableModeSet(false);
        console.log('FanControlTuxedoIO: Enabling automatic mode');
    }
}
