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

import * as fs from "fs";
import { SysFsPropertyInteger } from "../../common/classes/SysFsProperties";
import { execCommandAsync } from "../../common/classes/Utils";
import { FanControlLogic, FAN_LOGIC } from "./FanControlLogic";
import { apiBaseClass } from "./FanControlBaseClass";
import { IFanDataInputs } from "../../common/models/ITccFans";

export class pwmAPI extends apiBaseClass {
    private hwmonPath: string = "";
    private pwmAvailable: boolean = false;
    private fanControlPath: string =
        "/sys/bus/platform/devices/tuxedo_fan_control/";

    private fanSpeedInputMap: Map<number, SysFsPropertyInteger>;
    private fanMaxInputMap: Map<number, SysFsPropertyInteger>;
    private tempInputMap: Map<number, SysFsPropertyInteger>;
    private pwmInputMap: Map<number, SysFsPropertyInteger>;
    private sensorValueMap = new Map<number, number>();
    private fanLabelMap = new Map<number, string>();
    private tempLabelMap = new Map<number, string>();

    private async getHwmonPath(): Promise<string | undefined> {
        return await execCommandAsync(
            "grep -rl '^tuxedo$' /sys/class/hwmon/*/name | sed 's|/name$||'"
        );
    }

    private async getFilteredAndMappedFiles(
        files: string[],
        pattern: RegExp
    ): Promise<string[]> {
        return Array.from(
            new Set(
                files
                    .filter((entry) => entry.match(pattern))
                    .map((entry) => entry.split("_")[0])
            )
        );
    }

    private async getFanFiles(files: string[]): Promise<string[]> {
        return await this.getFilteredAndMappedFiles(files, /^fan\d/);
    }

    // 1 = manual mode, 2 = auto mode
    private async setHwmonPwmEnable(status: number): Promise<void> {
        const pwmfiles = await fs.promises.readdir(this.fanControlPath);
        const fanFiles = await this.getFanFiles(pwmfiles);

        for (const fanFile of fanFiles) {
            const fanPwm = await this.getPropertyInteger(
                this.fanControlPath,
                fanFile,
                "_pwm_enable"
            );
            await fanPwm.writeValueA(status);
        }
    }

    public async initFanControl(): Promise<void> {
        const pwmAvailability = await this.checkPwmAvailability();

        if (pwmAvailability) {
            this.tccd.dbusData.fanHwmonAvailable = true;
            await this.setHwmonPwmEnable(1);
        }
    }

    public async initPaths(): Promise<void> {
        this.fanSpeedInputMap = new Map();
        this.fanMaxInputMap = new Map();
        this.tempInputMap = new Map();
        this.pwmInputMap = new Map();
        this.tempLabelMap = new Map();

        const fanNumbers = await this.getFans().then((fans) =>
            Array.from(fans.keys())
        );

        const fanDataPromises = fanNumbers.map((fanIndex) =>
            this.getFanData(fanIndex)
        );
        const fanDataResults = await Promise.all(fanDataPromises);

        for (const fanIndex in fanDataResults) {
            const fanIndexNumber = parseInt(fanIndex) + 1;
            const fanData = fanDataResults[fanIndex];
            this.fanSpeedInputMap.set(fanIndexNumber, fanData.speedInput);
            this.fanMaxInputMap.set(fanIndexNumber, fanData.fanMaxInput);
            this.tempInputMap.set(fanIndexNumber, fanData.tempInput);
            this.pwmInputMap.set(fanIndexNumber, fanData.pwmInput);

            const [fanLabelRead, tempLabelRead] = await Promise.all([
                fanData.fanLabel.readValueNTA(),
                fanData.tempLabel.readValueNTA(),
            ]);

            this.fanLabelMap.set(fanIndexNumber, fanLabelRead);
            this.tempLabelMap.set(fanIndexNumber, tempLabelRead);
        }
    }

    private async getFanData(fanIndex: number): Promise<IFanDataInputs> {
        return {
            speedInput: await this.getPropertyInteger(
                this.hwmonPath,
                "fan" + fanIndex.toString(),
                "_input"
            ),
            fanMaxInput: await this.getPropertyInteger(
                this.hwmonPath,
                "fan" + fanIndex.toString(),
                "_max"
            ),
            tempInput: await this.getPropertyInteger(
                this.hwmonPath,
                "temp" + fanIndex.toString(),
                "_input"
            ),
            pwmInput: await this.getPropertyInteger(
                this.fanControlPath,
                "fan" + fanIndex.toString(),
                "_pwm"
            ),
            fanLabel: await this.getPropertyString(
                this.hwmonPath,
                "fan" + fanIndex.toString(),
                "_label"
            ),
            tempLabel: await this.getPropertyString(
                this.hwmonPath,
                "temp" + fanIndex.toString(),
                "_label"
            ),
        };
    }

    // todo: discern between fans, currently no fan mapping available
    public async mapLogicToFans(nrFans: number): Promise<boolean> {
        this.fans = new Map();
        for (let i = 1; i <= nrFans; i++) {
            this.fans.set(
                i,
                new FanControlLogic(
                    this.tccd.getCurrentFanProfile(),
                    FAN_LOGIC.CPU
                )
            );
        }
        await this.initPaths();
        return true;
    }

    public async getFanSpeedPercent(fanIndex: number): Promise<number> {
        const speedEntry = this.fanSpeedInputMap.get(fanIndex + 1);
        const maxEntry = this.fanMaxInputMap.get(fanIndex + 1);

        if (speedEntry === undefined || maxEntry === undefined) {
            return -1;
        }

        const [input, fanMax] = await Promise.all([
            speedEntry.readValueNTA(),
            maxEntry.readValueNTA(),
        ]);

        if (input === undefined || fanMax === undefined) {
            return -1;
        }

        return Math.round((Math.min(input, fanMax) / fanMax) * 100);
    }

    public async clearTempValues(): Promise<void> {
        this.sensorValueMap = new Map();
    }

    public async getFanTemperature(fanIndex: number): Promise<number> {
        // todo: maybe better fallback strategy
        if (
            this.tempLabelMap !== undefined &&
            this.sensorValueMap !== undefined
        ) {
            if (this.tempLabelMap.get(fanIndex + 1) === undefined) {
                return this.sensorValueMap.get(1);
            }
        }

        let tempEntry: SysFsPropertyInteger;
        if (this.tempInputMap !== undefined) {
            tempEntry = this.tempInputMap.get(fanIndex + 1);
        }

        if (tempEntry !== undefined) {
            const readValue = await tempEntry.readValueNTA();
            if (readValue) {
                this.sensorValueMap.set(fanIndex + 1, readValue / 1000);
                return readValue / 1000;
            }
        }
        return -1;
    }

    public async writeFanSpeed(
        fanIndex: number,
        calculatedSpeed: number
    ): Promise<void> {
        let pwmEntry: SysFsPropertyInteger;
        if (this.pwmInputMap !== undefined) {
            pwmEntry = this.pwmInputMap.get(fanIndex + 1);
        }

        if (pwmEntry !== undefined) {
            await pwmEntry.writeValueA(
                Math.round((calculatedSpeed / 100) * 255)
            );
        }
    }

    public async getNumberFans(): Promise<number> {
        const pwmfiles = await fs.promises.readdir(this.fanControlPath);
        const fanFiles = await this.getFanFiles(pwmfiles);
        return fanFiles.length;
    }

    private async checkPwmAvailability(): Promise<boolean> {
        this.hwmonPath = await this.getHwmonPath();
        if (this.hwmonPath) {
            this.pwmAvailable = await fs.promises
                .access(this.fanControlPath)
                .then(() => true)
                .catch(() => false);
            return this.pwmAvailable;
        }
        return false;
    }

    public async checkAvailable(): Promise<boolean> {
        return await this.checkPwmAvailability();
    }

    public async exit(): Promise<void> {
        await this.setHwmonPwmEnable(2);
    }
}
