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

import { DaemonWorker } from "./DaemonWorker";
import type { TuxedoControlCenterDaemon } from "./TuxedoControlCenterDaemon";
import type {
    ITccFanProfile,
    ITccFanTableEntry,
} from "../../common/models/TccFanTable";
import { FanControlTuxedoIO } from "./FanControlTuxedoIO";
import { FanControlPwm } from "./FanControlPwm";
import type { FanControlLogic } from "./FanControlLogic";
import { getCurrentCustomProfile } from "./FanControlUtils";
import type { FanControlBaseClass } from "./FanControlBaseClass";
import { FanData } from "../../common/models/IFanData";
import { FanControlTuxi } from "./FanControlTuxi";
import type { TUXEDODevice } from "src/common/models/DefaultProfiles";

export class FanControlWorker extends DaemonWorker {
    private fanApi: FanControlBaseClass;
    private mapStatus: boolean = false;

    private fanReadAvailable: boolean;
    private fanWriteAvailable: boolean;

    public previousCustomCurve: {
        tableCPU: ITccFanTableEntry[];
        tableGPU: ITccFanTableEntry[];
    } = {
        tableCPU: [],
        tableGPU: [],
    };
    private previousTempValues: Map<number, number> = new Map();
    private retryFanInitCounter: number = 5;
    private dbusData: {
        fans: {
            temp: { timestamp: number; temp: number };
            speed: { timestamp: number; speed: number };
        }[];
    } = {
        fans: Array.from({ length: 3 }, (): {
            temp: { timestamp: number; temp: number };
            speed: { timestamp: number; speed: number };
        } => ({
            temp: {
                timestamp: -1,
                temp: -1,
            },
            speed: {
                timestamp: -1,
                speed: -1,
            },
        })),
    };
    private tuxedoDevice: TUXEDODevice;
    private fanCheckCounter: number = 0;


    constructor(tccd: TuxedoControlCenterDaemon, tuxedoDevice: TUXEDODevice) {
        super(1000, "FanControlWorker", tccd);
        this.tuxedoDevice = tuxedoDevice;
        this.updateDbusData();
    }

    public async onStart(retry?: boolean): Promise<void> {
        if (retry !== true) {
            this.retryFanInitCounter = 5;
        }

        this.mapStatus = false;

        if (!this.fanApi) {
            const fanControlClasses: {
                class: FanControlTuxi | FanControlPwm | FanControlTuxedoIO
                name: string;
            }[] = [
                { class: new FanControlTuxi(this.tccd, this.tuxedoDevice), name: "tuxi" },
                { class: new FanControlPwm(this.tccd), name: "pwm" },
                { class: new FanControlTuxedoIO(this.tccd), name: "tuxedo-io" },
            ];

            for (const { class: fanClass, name } of fanControlClasses) {
                this.fanApi = fanClass;
                if (await this.initializeFanControl(this.fanApi, name)) {
                    return;
                }
            }
            
            this.fanApi = null;
            console.log("FanControlWorker: onStart: Fan API not available")
        }
    }

    public async onWork(): Promise<void> {
        try {
            const fanControlEnabled: boolean =
                this.tccd.settings.fanControlEnabled;
            const sensorCollection: boolean =
                this.tccd.dbusData.sensorDataCollectionStatus;

            await this.checkFanApiAvailable();
            if (this.fanReadAvailable) {
                await this.checkFanControlAvailable(fanControlEnabled);

                if (this.fanApi && this.mapStatus && (fanControlEnabled || sensorCollection)) {
                    await this.updateFanControlValues(fanControlEnabled);
                }
            }
            
            if (this.fanCheckCounter < 20) {
                await this.checkNumberFansAvailable();
                this.fanCheckCounter += 1
            }
            
        } catch (err: unknown) {
            console.log(`FanControlWorker: onWork failed => ${err}`);
        }
    }
    
    public async onExit(): Promise<void> {
        await this.fanApi.exit();
    }

    private async initializeFanControl(
        fanApiInstance: FanControlBaseClass,
        name?: string,
        resetFanMap?: boolean
    ): Promise<boolean> {
        [this.fanReadAvailable, this.fanWriteAvailable] =
            await fanApiInstance.checkAvailable();
        if (this.fanReadAvailable) {
            if (name) {
                console.log(`FanControlWorker: initializeFanControl: ${name} available`);

            }
            await this.initializeFanControlApi(
                this.tccd.settings.fanControlEnabled, resetFanMap
            );
            await this.setFanProfile();
            const numberFans: number = await fanApiInstance.getNumberFans();

            if (numberFans === 1) {
                console.log(`FanControlWorker: initializeFanControl: Detected ${numberFans} fan`);
            } else {
                console.log(`FanControlWorker: initializeFanControl: Detected ${numberFans} fans`);
            }
            return true;
        }
        return false;
    }

    private async checkNumberFansAvailable(): Promise<void> {
        const numberFansAvailable: number = await this.fanApi.getNumberFansAvailable();
        const numberFans: number = await this.fanApi.getNumberFans();

        if (numberFansAvailable !== numberFans) {
            console.log(`FanControlWorker: checkNumberFansAvailable: Check failed (${numberFansAvailable} !== ${numberFans}), retrying`)  
            await this.initializeFanControl(this.fanApi, undefined, true)
        }
    }
        
    private async setPreviousFans(): Promise<void> {
        const numberInterfaces: number =
            await this.fanApi.getNumberFanInterfaces();

        for (let i: number = 0; i <= numberInterfaces; i++) {
            this.previousTempValues.set(i, -1);
        }
    }

    private async checkFanApiAvailable(): Promise<void> {
        const fanApiUnavailable: boolean =
            this.fanApi === undefined || this.fanApi === null;
        if (fanApiUnavailable && this.retryFanInitCounter > 0) {
            console.log(
                "FanControlWorker: checkFanApiAvailable: Fan API not defined, retrying initialization",
            );
            this.retryFanInitCounter = this.retryFanInitCounter - 1;
            this.onStart(true);
            return;
        }

        if (fanApiUnavailable && this.retryFanInitCounter === 0) {
            console.log("FanControlWorker: checkFanApiAvailable: Fan API initialization failed");
            this.retryFanInitCounter = this.retryFanInitCounter - 1;
        }
    }

    private async checkFanControlAvailable(
        fanControlEnabled: boolean
    ): Promise<void> {
        if (this.fanApi) {
            if (this.mapStatus === false) {
                console.log(
                    "FanControlWorker: checkFanControlAvailable: No fans found, retrying initialization",
                );
                await this.initializeFanControlApi(fanControlEnabled);
                await this.setFanProfile();

                const numberFans: number = await this.fanApi.getNumberFans();
                if (numberFans === 1) {
                    console.log(`FanControlWorker: checkFanControlAvailable: Detected ${numberFans} fan`);
                } else {
                    console.log(
                        `FanControlWorker: checkFanControlAvailable: Detected ${numberFans} fans`,
                    );
                }
            }
        }
    }

    private async initializeFanControlApi(
        fanControlEnabled: boolean,
        resetFanMap?: boolean
    ): Promise<void> {
        await this.fanApi.initFanControl(
            this.fanWriteAvailable,
            fanControlEnabled,
        );
        const numberInterfaces: number =
            await this.fanApi.getNumberFanInterfaces();

        if (numberInterfaces) {
            this.mapStatus = await this.fanApi.mapLogicToFans(numberInterfaces, resetFanMap);
            await this.setPreviousFans();
            return;
        }
        console.log("FanControlWorker: initializeFanControlApi: No fan interfaces found");
    }

    public async isEqual(
        first: ITccFanProfile,
        second: ITccFanProfile
    ): Promise<boolean> {
        return JSON.stringify(first) === JSON.stringify(second);
    }

    private async setFanProfile(): Promise<void> {
        const fanProfile: string = this.activeProfile.fan.fanProfile;
        const isCustomProfile: boolean = fanProfile === "Custom";

        const currentFanProfile: ITccFanProfile = isCustomProfile
            ? await getCurrentCustomProfile(this.activeProfile)
            : this.tccd.getCurrentFanProfile(this.activeProfile);

        console.log("FanControlWorker: setFanProfile: Setting fan profile");
        await this.fanApi.setFanProfileValues(
            this.activeProfile,
            currentFanProfile
        );
    }

    private async updateTempLogic(
        fans: Map<number, FanControlLogic>,
        fanNumber: number,
    ) {
        const fanIndex = fanNumber - 1;
        const fanLogic = fans.get(fanNumber);
        const temp = await this.getTemperature(fanIndex);
        fanLogic.reportTemperature(temp);
        return { fanLogic, fanIndex, temp };
    }

    private async setFansWithMaxSpeed(fans: Map<number, FanControlLogic>) {
        const fanNumbers = Array.from(fans.keys());

        const fanInformationArray: {
            fanLogic: FanControlLogic;
            fanIndex: number;
            temp: number;
        }[] = await Promise.all(
            fanNumbers.map(async (fanNumber: number) => {
                return await this.updateTempLogic(fans, fanNumber);
            }),
        );

        const speedArray: number[] = fanInformationArray.map(({ fanLogic }) =>
            fanLogic.getSpeedPercent(),
        );
        const maxSpeed = Math.max(...speedArray);

        await Promise.all(
            fanInformationArray.map(async ({ fanLogic, fanIndex, temp }) => {
                await this.updateFanDbusData(
                    fanIndex,
                    fanLogic,
                    maxSpeed,
                    temp,
                );
            }),
        );
    }
    
    private async updateFanControlValues(fanControlEnabled: boolean): Promise<void> {
        const fans: Map<number, FanControlLogic> = await this.fanApi.getFans();

        if (fans.size === 0) {
            console.log("FanControlWorker: updateFanControlValues: No fans found, retrying initialization");
            await this.initializeFanControlApi(fanControlEnabled);
            return;
        }

        await this.fanApi.clearTempValues();
        await this.setFansWithMaxSpeed(fans);
    }

    private async writeFanSpeed(
        fanLogic: FanControlLogic,
        fanIndex: number,
        calculatedSpeed: number
    ): Promise<void> {
        if (!fanLogic) return;

        if (this.tccd.settings.fanControlEnabled) {
            if (
                this.previousTempValues.get(fanIndex) !== calculatedSpeed &&
                calculatedSpeed > -1
            ) {
                await this.fanApi.writeFanSpeed(fanIndex, calculatedSpeed);
                this.previousTempValues.set(fanIndex, calculatedSpeed);
            }
        }
    }

    private async updateFanDbusData(
        fanIndex: number,
        fanLogic: FanControlLogic,
        calculatedSpeed: number,
        temperature: number
    ): Promise<void> {
        if (temperature > -1) {
            if (this.fanWriteAvailable) {
                await this.writeFanSpeed(fanLogic, fanIndex, calculatedSpeed);
            }

            if (this.tccd.dbusData.sensorDataCollectionStatus) {
                const currentSpeedPercent: number =
                    await this.fanApi.getFanSpeedPercent(fanIndex);

                await this.setFanDbusData(
                    fanIndex,
                    temperature,
                    currentSpeedPercent
                );
            } else {
                await this.setFanDbusData(fanIndex, temperature, -1);
            }
        } else {
            console.log("FanControlWorker: updateFanDbusData: Invalid temperature");
        }
    }

    private async getTemperature(fanIndex: number): Promise<number> {
        return this.tccd.settings.fanControlEnabled ||
            this.tccd.dbusData.sensorDataCollectionStatus
            ? await this.fanApi.getFanTemperature(fanIndex)
            : -1;
    }

    private async setFanDbusData(
        fanIndex: number,
        currentFanTemp: number,
        currentSpeedPercent: number
    ): Promise<void> {
        this.dbusData.fans[fanIndex].temp = {
            timestamp: Date.now(),
            temp: currentFanTemp,
        };
        this.dbusData.fans[fanIndex].speed = {
            timestamp: Date.now(),
            speed: currentSpeedPercent,
        };
        this.updateDbusData();
    }

    private updateDbusData(): void {
        const cpu = new FanData(
            this.dbusData.fans[0].temp.timestamp,
            this.dbusData.fans[0].speed.speed,
            this.dbusData.fans[0].temp.temp
        );
        const gpu1 = new FanData(
            this.dbusData.fans[1].temp.timestamp,
            this.dbusData.fans[1].speed.speed,
            this.dbusData.fans[1].temp.temp
        );
        const gpu2 = new FanData(
            this.dbusData.fans[2].temp.timestamp,
            this.dbusData.fans[2].speed.speed,
            this.dbusData.fans[2].temp.temp
        );
        const fanData: { cpu: FanData; gpu1: FanData; gpu2: FanData } = {
            cpu: cpu,
            gpu1: gpu1,
            gpu2: gpu2,
        };
        this.tccd.dbusData.fanData = JSON.stringify(fanData);
    }
}
