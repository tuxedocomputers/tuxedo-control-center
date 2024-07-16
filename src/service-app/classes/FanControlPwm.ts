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
import { FanControlBaseClass } from "./FanControlBaseClass";
import { IFanDataInputs } from "../../common/models/ITccFans";
import { FAN_LOGIC, FanControlLogic } from "./FanControlLogic";

export class FanControlPwm extends FanControlBaseClass {
    private hwmonPath: string = "";
    private pwmAvailable: boolean = false;
    private fanControlPath: string =
        "/sys/bus/platform/devices/tuxedo_fan_control/";

    private fanSpeedInputMap: Map<number, SysFsPropertyInteger>;
    private fanMaxInputMap: Map<number, SysFsPropertyInteger>;
    private tempInputMap: Map<number, SysFsPropertyInteger>;
    private pwmInputMap: Map<number, SysFsPropertyInteger>;
    private sensorValueMap: Map<number, number> = new Map<number, number>();
    private fanLabelMap: Map<number, string> = new Map<number, string>();
    private tempLabelMap: Map<number, string> = new Map<number, string>();

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
                    .filter(
                        (entry: string): RegExpMatchArray =>
                            entry.match(pattern)
                    )
                    .map((entry: string): string => entry.split("_")[0])
            )
        );
    }

    private async getFanFiles(files: string[]): Promise<string[]> {
        return await this.getFilteredAndMappedFiles(files, /^fan\d/);
    }

    // 1 = manual mode, 2 = auto mode
    private async setHwmonPwmEnable(status: number): Promise<void> {
        if (this.pwmAvailable) {
            const pwmfiles: string[] = await fs.promises.readdir(
                this.fanControlPath
            );
            const fanFiles: string[] = await this.getFanFiles(pwmfiles);

            for (const fanFile of fanFiles) {
                const fanPwm: SysFsPropertyInteger =
                    await this.getPropertyInteger(
                        this.fanControlPath,
                        fanFile,
                        "_pwm_enable"
                    );
                await fanPwm.writeValueA(status);
            }
        }
    }

    public async initFanControl(fanWriteAvailable: boolean): Promise<void> {
        if (this.pwmAvailable) {
            this.tccd.dbusData.fanHwmonAvailable = true;
        }

        if (
            this.pwmAvailable &&
            fanWriteAvailable &&
            this.tccd.settings.fanControlEnabled
        ) {
            console.log("Fan Control: Enabling manual mode");
            await this.setHwmonPwmEnable(1);
        }
    }

    public async initPaths(): Promise<void> {
        this.fanSpeedInputMap = new Map();
        this.fanMaxInputMap = new Map();
        this.tempInputMap = new Map();
        this.pwmInputMap = new Map();
        this.tempLabelMap = new Map();

        const fanNumbers: number[] = await this.getFans().then(
            (fans: Map<number, FanControlLogic>): number[] =>
                Array.from(fans.keys())
        );

        const fanDataPromises: Promise<IFanDataInputs>[] = fanNumbers.map(
            (fanIndex: number): Promise<IFanDataInputs> =>
                this.getFanData(fanIndex)
        );
        const fanDataResults: IFanDataInputs[] = await Promise.all(
            fanDataPromises
        );

        for (const fanIndex in fanDataResults) {
            const fanIndexNumber: number = parseInt(fanIndex) + 1;
            const fanData: IFanDataInputs = fanDataResults[fanIndex];
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

    public async mapLogicToFans(nrFans: number): Promise<boolean> {
        if (!this.fans) {
            this.fans = new Map();
            for (let i: number = 1; i <= nrFans; i++) {
                this.fans.set(i, undefined);
            }

            await this.initPaths();

            for (let i: number = 1; i <= nrFans; i++) {
                const label: string = this.fanLabelMap.get(i);

                if (label.includes("cpu")) {
                    this.setFan(i, FAN_LOGIC.CPU);
                }
                if (label.includes("gpu0") || label.includes("gpu1")) {
                    this.setFan(i, FAN_LOGIC.GPU);
                }
            }
        }

        return true;
    }

    public async getFanSpeedPercent(fanIndex: number): Promise<number> {
        const speedEntry: SysFsPropertyInteger = this.fanSpeedInputMap.get(
            fanIndex + 1
        );
        const maxEntry: SysFsPropertyInteger = this.fanMaxInputMap.get(
            fanIndex + 1
        );

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
            const readValue: number = await tempEntry.readValueNTA();
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
        try {
            if (this.hwmonPath) {
                const hwmonfiles: string[] = await fs.promises.readdir(
                    this.hwmonPath
                );
                const fanFiles: string[] = await this.getFanFiles(hwmonfiles);
                return fanFiles.length;
            }
        } catch (error) {
            console.error(error);
            return;
        }
    }

    public async checkAvailable(): Promise<[boolean, boolean]> {
        this.hwmonPath = await this.getHwmonPath();

        if (this.hwmonPath) {
            this.pwmAvailable = await fs.promises
                .access(this.fanControlPath)
                .then((): boolean => true)
                .catch((): boolean => false);
        }
        return [!!this.hwmonPath, this.pwmAvailable];
    }

    public async exit(): Promise<void> {
        await this.setHwmonPwmEnable(2);
    }
}
