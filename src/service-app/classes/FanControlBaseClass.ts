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

import * as path from "node:path";
import type { TuxedoControlCenterDaemon } from "./TuxedoControlCenterDaemon";
import { FanControlLogic } from "./FanControlLogic";
import type { FAN_LOGIC } from "./FanControlLogic";
import type { ITccFanProfile } from "../../common/models/TccFanTable";
import type { ITccProfile } from "../../common/models/TccProfile";
import {
    SysFsPropertyInteger,
    SysFsPropertyString,
} from "../../common/classes/SysFsProperties";

export abstract class FanControlBaseClass {
    constructor(public tccd: TuxedoControlCenterDaemon) {}

    public fans: Map<number, FanControlLogic>;

    public async setFan(index: number, logic: FAN_LOGIC): Promise<void> {
        const cpuLogic = new FanControlLogic(
            this.tccd.getCurrentFanProfile(),
            logic,
            this.tccd
        );
        this.fans.set(index, cpuLogic);
    }

    public async setFanProfileValues(
        activeProfile: ITccProfile,
        currentFanProfile: ITccFanProfile
    ): Promise<void> {
        const isCustomProfile: boolean =
            activeProfile.fan.fanProfile === "Custom";

        for (const fanNumber of this.fans.keys()) {
            const fan: FanControlLogic = this.fans.get(fanNumber);

            fan.minimumFanspeed = isCustomProfile
                ? 0
                : activeProfile.fan.minimumFanspeed;
            fan.maximumFanspeed = isCustomProfile
                ? 100
                : activeProfile.fan.maximumFanspeed;
            fan.offsetFanspeed = isCustomProfile
                ? 0
                : activeProfile.fan.offsetFanspeed;

            await fan.setFanProfile(currentFanProfile);
        }
    }

    public async getFans(): Promise<Map<number, FanControlLogic>> {
        return this.fans;
    }

    public async getPropertyInteger(
        hwmonPath: string,
        fileName: string,
        suffix: string
    ): Promise<SysFsPropertyInteger> {
        return new SysFsPropertyInteger(
            path.join(hwmonPath, fileName + suffix)
        );
    }

    public async getPropertyString(
        hwmonPath: string,
        fileName: string,
        suffix: string
    ): Promise<SysFsPropertyString> {
        return new SysFsPropertyString(path.join(hwmonPath, fileName + suffix));
    }

    public abstract initFanControl(fanWriteAvailable: boolean): Promise<void>;

    public abstract mapLogicToFans(numberInterfaces: number): Promise<boolean>;

    public abstract getFanSpeedPercent(fanIndex: number): Promise<number>;

    public abstract clearTempValues(): Promise<void>;

    public abstract getNumberFanInterfaces(): Promise<number>;

    public abstract getNumberFans(): Promise<number>;

    public abstract checkAvailable(): Promise<[boolean, boolean]>;

    public abstract getFanTemperature(fanIndex: number): Promise<number>;

    public abstract writeFanSpeed(
        fanIndex: number,
        calculatedSpeed: number
    ): Promise<void>;

    public abstract exit(): Promise<void>;
}
