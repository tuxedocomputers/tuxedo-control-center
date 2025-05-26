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

import * as fs from "node:fs";
import type { SysFsPropertyInteger } from "../../common/classes/SysFsProperties";
import { FanControlBaseClass } from "./FanControlBaseClass";
import type { IFanDataInputs } from "../../common/models/ITccFans";
import { FAN_LOGIC } from "./FanControlLogic";
import type { FanControlLogic } from "./FanControlLogic";

export class FanControlHwmon extends FanControlBaseClass {
    public fanControlName: string = "";
    private hwmonPath: string = "";
    private writeAvailable: boolean = false;
    private fanControlPath: string =
        "/sys/bus/platform/devices/tuxedo_fan_control/";

    private fanSpeedInputMap: Map<number, SysFsPropertyInteger>;
    private fanMaxInputMap: Map<number, SysFsPropertyInteger>;
    private tempInputMap: Map<number, SysFsPropertyInteger>;
    private pwmInputMap: Map<number, SysFsPropertyInteger>;
    private sensorValueMap: Map<number, number> = new Map<number, number>();
    private fanLabelMap: Map<number, string> = new Map<number, string>();
    private tempLabelMap: Map<number, string> = new Map<number, string>();
    private fanTempMap: Map<number, any> = new Map<number, string>();
    private tempCache: Map<number, number | null> = new Map();


    private async getFilteredAndMappedFiles(
        files: string[],
        pattern: RegExp,
    ): Promise<string[]> {
        return Array.from(
            new Set(
                files
                    .filter(
                        (entry: string): RegExpMatchArray =>
                            entry.match(pattern),
                    )
                    .map((entry: string): string => entry.split("_")[0]),
            ),
        );
    }

    private async getFanFiles(files: string[]): Promise<string[]> {
        return await this.getFilteredAndMappedFiles(files, /^fan\d/);
    }

    private async getTempFiles(files: string[]): Promise<string[]> {
        return await this.getFilteredAndMappedFiles(files, /^temp\d/);
    }

    // 1 = manual mode, 2 = auto mode
    private async setHwmonPwmEnable(status: number): Promise<void> {
        if (this.writeAvailable) {
            const pwmfiles: string[] = await fs.promises.readdir(
                this.fanControlPath,
            );
            const fanFiles: string[] = await this.getFanFiles(pwmfiles);

            for (const fanFile of fanFiles) {
                const fanPwm: SysFsPropertyInteger =
                    await this.getPropertyInteger(
                        this.fanControlPath,
                        fanFile,
                        "_pwm_enable",
                    );
                await fanPwm.writeValueA(status);
            }
        }
    }

    public async initFanControl(fanWriteAvailable: boolean): Promise<void> {
        if (this.writeAvailable) {
            this.tccd.dbusData.fanHwmonAvailable = true;
        }

        if (
            this.writeAvailable &&
            fanWriteAvailable &&
            this.tccd.settings.fanControlEnabled
        ) {
            console.log("FanControlHwmon: Enabling manual mode");
            await this.setHwmonPwmEnable(1);
        }
    }

    public async initPaths(): Promise<void> {
        await this.setMapData();
        this.matchLabels();
        this.printLabelInformation();
    }

    public async setMapData(): Promise<void> {
        this.fanSpeedInputMap = new Map();
        this.fanMaxInputMap = new Map();
        this.tempInputMap = new Map();
        this.pwmInputMap = new Map();
        this.tempLabelMap = new Map();

        const fanDataResults: IFanDataInputs[] = await this.fetchFanData();
        const tempDataResults: IFanDataInputs[] = await this.fetchTempData();

        await this.populateFanMaps(fanDataResults);
        await this.populateTempMaps(tempDataResults);
    }

    private async fetchFanData(): Promise<IFanDataInputs[]> {
        const fanNumbers: number[] = await this.getFans().then(
            (fans: Map<number, FanControlLogic>): number[] =>
                Array.from(fans.keys()),
        );
        return Promise.all(
            fanNumbers.map(
                (fanIndex: number): Promise<any> => this.getFanData(fanIndex),
            ),
        );
    }

    private async fetchTempData(): Promise<IFanDataInputs[]> {
        const tempCount: number = await this.getNumberTemp();
        const tempNumbers: number[] = Array.from(
            { length: tempCount },
            (_: number, i: number): number => i + 1,
        );
        return Promise.all(
            tempNumbers.map(
                (tempIndex: number): Promise<any> =>
                    this.getTempData(tempIndex),
            ),
        );
    }

    private async populateFanMaps(
        fanDataResults: IFanDataInputs[],
    ): Promise<void> {
        for (const [index, fanData] of fanDataResults.entries()) {
            const fanIndexNumber: number = index + 1;
            this.fanSpeedInputMap.set(fanIndexNumber, fanData.speedInput);
            this.fanMaxInputMap.set(fanIndexNumber, fanData.fanMaxInput);
            this.pwmInputMap.set(fanIndexNumber, fanData.pwmInput);

            if (fanData?.fanLabel) {
                this.fanLabelMap.set(
                    fanIndexNumber,
                    await fanData.fanLabel.readValueNTA(),
                );
            }
        }
    }

    private async populateTempMaps(
        tempDataResults: IFanDataInputs[],
    ): Promise<void> {
        for (const [index, tempData] of tempDataResults.entries()) {
            const tempIndexNumber: number = index + 1;
            this.tempInputMap.set(tempIndexNumber, tempData.tempInput);

            if (tempData?.tempLabel) {
                this.tempLabelMap.set(
                    tempIndexNumber,
                    await tempData.tempLabel.readValueNTA(),
                );
            }
        }
    }

    public matchLabels(): void {
        this.fanTempMap = new Map();
        
        for (const [fanIndex, fanLabel] of this.fanLabelMap) {
            let matchedTempLabel: string | undefined;
            let matchedTempInput: SysFsPropertyInteger | undefined;
                        
            // multiple cpu fans can have one cpu temperature sensor
            matchedTempLabel = [...this.tempLabelMap.values()].find(
                (tempLabel: string): boolean =>
                    tempLabel.startsWith(fanLabel.replace(/cpu\d+/i, "cpu")),
            );

            const matchedTempLabelIndex: [number, string] | undefined = [
                ...this.tempLabelMap.entries(),
            ].find(
                ([_, tempLabel]: [number, string]): boolean =>
                    tempLabel === matchedTempLabel,
            );

            if (matchedTempLabelIndex) {
                const [tempIndex] = matchedTempLabelIndex;
                matchedTempInput = this.tempInputMap.get(tempIndex);
            }

            if (matchedTempLabel && matchedTempInput) {
                this.fanTempMap.set(fanIndex, {
                    tempLabel: matchedTempLabel,
                    tempInput: matchedTempInput,
                });
            } else {
                console.log(`FanControlHwmon: matchLabels: Failed to set fan with index ${fanIndex} and label ${fanLabel}`)
                console.log("FanControlHwmon: matchLabels: fanLabelMap: ", this.fanLabelMap)
                console.log("FanControlHwmon: matchLabels: tempLabelMap: ", this.tempLabelMap)
                console.log("FanControlHwmon: matchLabels: tempInputMap: ", this.tempInputMap)
                this.tccd.onExit()
                process.exit(0)
            }
        }
    }

    private printLabelInformation(): void {
        const fanInfo: string = Array.from(this.fanTempMap)
            .map(
                ([key, value]: [number, any]): string =>
                    `Fan Index: ${key}, Temperature Label: ${value?.tempLabel}`,
            )
            .join(" | ");
        console.log(fanInfo);
    }

    private async getFanData(fanIndex: number): Promise<any> {
        return {
            speedInput: await this.getPropertyInteger(
                this.hwmonPath,
                `fan${fanIndex.toString()}`,
                "_input",
            ),
            fanMaxInput: await this.getPropertyInteger(
                this.hwmonPath,
                `fan${fanIndex.toString()}`,
                "_max",
            ),
            pwmInput: await this.getPropertyInteger(
                this.fanControlPath,
                `fan${fanIndex.toString()}`,
                "_pwm",
            ),
            fanLabel: await this.getPropertyString(
                this.hwmonPath,
                `fan${fanIndex.toString()}`,
                "_label",
            ),
        };
    }
    private async getTempData(fanIndex: number): Promise<any> {
        return {
            tempInput: await this.getPropertyInteger(
                this.hwmonPath,
                `temp${fanIndex.toString()}`,
                "_input",
            ),
            tempLabel: await this.getPropertyString(
                this.hwmonPath,
                `temp${fanIndex.toString()}`,
                "_label",
            ),
        };
    }

    public async mapLogicToFans(numberInterfaces: number): Promise<boolean> {
        if (!this.fans) {
            this.fans = new Map();
            for (let i: number = 1; i <= numberInterfaces; i++) {
                this.fans.set(i, undefined);
            }

            await this.initPaths();

            for (let i: number = 1; i <= numberInterfaces; i++) {
                const label: string = this.fanLabelMap.get(i);

                if (label) {
                    if (label.includes("cpu")) {
                        this.setFan(i, FAN_LOGIC.CPU);
                        continue;
                    }
                    if (label.includes("gpu")) {
                        this.setFan(i, FAN_LOGIC.GPU);
                        continue;
                    }
                    console.log(
                        `FanControlHwmon: unknown label ${label}, setting fan as cpu fan`,
                    );
                    this.setFan(i, FAN_LOGIC.CPU);
                }

                if (!label) {
                    console.log(
                        `FanControlHwmon: label not found for index ${
                            i - 1
                        }, setting fan as cpu fan`,
                    );
                    this.setFan(i, FAN_LOGIC.CPU);
                }
            }
        }

        return true;
    }

    public async getFanSpeedPercent(fanIndex: number): Promise<number> {
        const speedEntry: SysFsPropertyInteger = this.fanSpeedInputMap.get(
            fanIndex + 1,
        );
        const maxEntry: SysFsPropertyInteger = this.fanMaxInputMap.get(
            fanIndex + 1,
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
        this.tempCache.clear();
    }

    public async getFanTemperature(fanIndex: number): Promise<number> {
        const fanData = this.fanTempMap.get(fanIndex + 1);
        if (!fanData) {
            console.warn(`No fan data found for index: ${fanIndex}`);
            return -1;
        }

        const { tempLabel } = fanData;
        const cachedValue = this.tempCache.get(tempLabel);

        if (cachedValue !== undefined && cachedValue !== null) {
            return cachedValue;
        }

        const tempEntry: SysFsPropertyInteger | undefined = fanData.tempInput;

        if (tempEntry !== undefined) {
            const readValue: number = await tempEntry.readValueNTA();
            if (readValue) {
                const tempCelsius = readValue / 1000;
                this.sensorValueMap.set(tempLabel, tempCelsius);
                this.tempCache.set(tempLabel, tempCelsius);
                return tempCelsius;
            }
        }

        this.tempCache.set(tempLabel, null);
        return -1;
    }

    public async writeFanSpeed(
        fanIndex: number,
        calculatedSpeed: number,
    ): Promise<void> {
        let pwmEntry: SysFsPropertyInteger;
        if (this.pwmInputMap !== undefined) {
            pwmEntry = this.pwmInputMap.get(fanIndex + 1);
        }

        if (pwmEntry !== undefined) {
            await pwmEntry.writeValueA(
                Math.round((calculatedSpeed / 100) * 255),
            );
        }
    }

    public async getNumberFanInterfaces(): Promise<number> {
        try {
            if (this.hwmonPath) {
                const hwmonfiles: string[] = await fs.promises.readdir(
                    this.hwmonPath,
                );
                const fanFiles: string[] = await this.getFanFiles(hwmonfiles);
                return fanFiles.length;
            }
        } catch (error) {
            console.error(error);
            return;
        }
    }
    
    public async getNumberFans(): Promise<number> {
        return await this.getNumberFanInterfaces();
    }

    public async getNumberTemp(): Promise<number> {
        try {
            if (this.hwmonPath) {
                const hwmonfiles: string[] = await fs.promises.readdir(
                    this.hwmonPath,
                );
                const fanFiles: string[] = await this.getTempFiles(hwmonfiles);
                return fanFiles.length;
            }
        } catch (error) {
            console.error(error);
            return;
        }
    }

    public async getHwmonPath(): Promise<string | undefined> {
        throw new Error("FanControlHwmon: getHwmonPath() not implemented");
    }

    public async checkAvailable(): Promise<[boolean, boolean]> {
        this.hwmonPath = await this.getHwmonPath();

        if (this.hwmonPath) {
            this.writeAvailable = await fs.promises
                .access(this.fanControlPath)
                .then((): boolean => true)
                .catch((): boolean => false);
        }

        const readAvailable: boolean = !!this.hwmonPath;
        const writeAvailable: boolean = this.writeAvailable;

        return [readAvailable, writeAvailable];
    }

    public async exit(): Promise<void> {
        await this.setHwmonPwmEnable(2);
        console.log("FanControlHwmon: Enabling auto mode");
    }

    public testMatchLabels(): Map<
        number,
        { tempLabel: string; tempInput: SysFsPropertyInteger }
    > {
        this.matchLabels();
        return this.fanTempMap;
    }

    public setFanLabelMap(fanLabelMap: Map<number, string>): void {
        this.fanLabelMap = fanLabelMap;
    }

    public setTempLabelMap(tempLabelMap: Map<number, string>): void {
        this.tempLabelMap = tempLabelMap;
    }

    public setTempInputMap(
        tempInputMap: Map<number, SysFsPropertyInteger>
    ): void {
        this.tempInputMap = tempInputMap;
    }

    public setHwmonPath(hwmonPath: string): void {
        this.hwmonPath = hwmonPath;
    }

    public getFanSpeedInputMap(): Map<number, SysFsPropertyInteger> {
        return this.fanSpeedInputMap;
    }

    public getFanMaxInputMap(): Map<number, SysFsPropertyInteger> {
        return this.fanMaxInputMap;
    }

    public getPwmInputMap(): Map<number, SysFsPropertyInteger> {
        return this.pwmInputMap;
    }

    public getFanLabelMap(): Map<number, string> {
        return this.fanLabelMap;
    }

    public getTempInputMap(): Map<number, SysFsPropertyInteger> {
        return this.tempInputMap;
    }

    public getTempLabelMap(): Map<number, string> {
        return this.tempLabelMap;
    }
}
