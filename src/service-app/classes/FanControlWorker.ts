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

import { DaemonWorker } from "./DaemonWorker";
import { TuxedoControlCenterDaemon } from "./TuxedoControlCenterDaemon";
import {
    ITccFanProfile,
    ITccFanTableEntry,
} from "../../common/models/TccFanTable";
import { FanControlTuxedoIO } from "./FanControlTuxedoIO";
import { FanControlPwm } from "./FanControlPwm";
import { FanControlLogic } from "./FanControlLogic";
import { getCurrentCustomProfile } from "./FanControlUtils";
import { FanControlBaseClass } from "./FanControlBaseClass";

export class FanControlWorker extends DaemonWorker {
    private previousFanControlEnabled: boolean = undefined;

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

    constructor(tccd: TuxedoControlCenterDaemon) {
        super(1000, tccd);
    }

    public async onStart(retry?: boolean): Promise<void> {
        if (retry !== true) {
            this.retryFanInitCounter = 5;
        }

        this.mapStatus = false;

        if (this.fanApi === undefined || this.fanApi === null) {
            this.fanApi = new FanControlPwm(this.tccd);
            [this.fanReadAvailable, this.fanWriteAvailable] =
                await this.fanApi.checkAvailable();
            if (this.fanReadAvailable) {
                console.log("Fan Control: pwm available");
                await this.initFanControl();
                await this.setFanProfile();
                return;
            }

            this.fanApi = new FanControlTuxedoIO(this.tccd);
            [this.fanReadAvailable, this.fanWriteAvailable] =
                await this.fanApi.checkAvailable();
            if (this.fanReadAvailable) {
                console.log("Fan Control: tuxedo-io available");
                await this.initFanControl();
                await this.setFanProfile();
                return;
            }
        }

        if (this.fanApi !== undefined || this.fanApi !== null) {
            return;
        }

        this.fanApi = null;
    }

    public async onWork(): Promise<void> {
        try {
            const fanControlEnabled: boolean =
                this.tccd.settings.fanControlEnabled;
            const sensorCollection: boolean =
                this.tccd.dbusData.sensorDataCollectionStatus;

            await this.handleRetryInit();
            if (this.fanReadAvailable) {
                await this.handleFanControl(
                    fanControlEnabled,
                    sensorCollection
                );
            }
            await this.handleGlobalFanConfig(fanControlEnabled);
        } catch (error) {
            console.log(error);
        }
    }

    public async onExit(): Promise<void> {
        await this.fanApi.exit();
    }

    private async setPreviousFans(): Promise<void> {
        const numberFans: number = await this.fanApi.getNumberFans();

        for (let i: number = 0; i <= numberFans; i++) {
            this.previousTempValues.set(i, -1);
        }
    }

    private async handleRetryInit(): Promise<void> {
        const fanApiUnavailable: boolean =
            this.fanApi === undefined || this.fanApi === null;
        if (fanApiUnavailable && this.retryFanInitCounter > 0) {
            console.log("Fan Control: Fan Api not defined, retrying init");
            this.retryFanInitCounter = this.retryFanInitCounter - 1;
            this.onStart(true);
            return;
        }

        if (fanApiUnavailable && this.retryFanInitCounter === 0) {
            console.log("Fan Control: Fan Api init failed");
            this.retryFanInitCounter = this.retryFanInitCounter - 1;
        }
    }

    private async handleGlobalFanConfig(
        fanControlEnabled: boolean
    ): Promise<void> {
        const previousFanEnabled: boolean = this.previousFanControlEnabled;
        if (fanControlEnabled && !previousFanEnabled && this.fanApi) {
            console.log("Fan Control: Enabling fans");
            await this.fanApi.clearTempValues();
            await this.fanApi.initFanControl(this.fanWriteAvailable);
        } else if (!fanControlEnabled && previousFanEnabled && this.fanApi) {
            console.log("Fan Control: Disabling fans");
            await this.fanApi.exit();
        }

        if (this.fanApi) {
            this.previousFanControlEnabled = fanControlEnabled;
        }
    }

    private async handleFanControl(
        fanControlEnabled: boolean,
        sensorCollection: boolean
    ): Promise<void> {
        if ((fanControlEnabled || sensorCollection) && this.fanApi) {
            if (this.mapStatus === false) {
                console.log("Fan Control: Mapping failed, retrying init");
                await this.initFanControl();
                await this.setFanProfile();
            }

            if (this.mapStatus) {
                await this.fanControl();
            }
        }
    }

    private async initFanControl(): Promise<void> {
        await this.fanApi.initFanControl(this.fanWriteAvailable);
        const numberFans: number = await this.fanApi.getNumberFans();

        if (numberFans) {
            this.mapStatus = await this.fanApi.mapLogicToFans(numberFans);
            await this.setPreviousFans();
            return;
        }
        console.log("Fan Control: No fans found");
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

        console.log("Fan Control: Setting fan profile");
        await this.fanApi.setFanProfileValues(
            this.activeProfile,
            currentFanProfile
        );
    }

    private async fanControl(): Promise<void> {
        const fans: Map<number, FanControlLogic> = await this.fanApi.getFans();

        if (fans.size === 0) {
            console.log("Fan Control: Trying to set amount of fans");
            await this.initFanControl();
            return;
        }

        for (const fanNumber of fans.keys()) {
            const fanIndex: number = fanNumber - 1;

            await this.updateFan(fanIndex, fans.get(fanNumber));
        }
    }

    private async writeFanSpeed(
        fanLogic: FanControlLogic,
        fanIndex: number,
        temperature: number
    ): Promise<void> {
        fanLogic.reportTemperature(temperature);

        if (this.tccd.settings.fanControlEnabled) {
            const calculatedSpeed: number = fanLogic.getSpeedPercent();

            if (
                this.previousTempValues.get(fanIndex) !== calculatedSpeed &&
                calculatedSpeed > -1
            ) {
                await this.fanApi.writeFanSpeed(fanIndex, calculatedSpeed);
                this.previousTempValues.set(fanIndex, calculatedSpeed);
            }
        }
    }

    private async updateFan(
        fanIndex: number,
        fanLogic: FanControlLogic
    ): Promise<void> {
        const temperature: number = await this.getTemperature(fanIndex);

        if (temperature > -1) {
            if (this.fanWriteAvailable) {
                await this.writeFanSpeed(fanLogic, fanIndex, temperature);
            }

            if (this.tccd.dbusData.sensorDataCollectionStatus) {
                const currentSpeedPercent: number =
                    await this.fanApi.getFanSpeedPercent(fanIndex);

                await this.setDbusData(
                    fanIndex,
                    temperature,
                    currentSpeedPercent
                );
            } else {
                await this.setDbusData(fanIndex, temperature, -1);
            }
        } else {
            console.log("Fan Control: Invalid temperature");
        }
    }

    private async getTemperature(fanIndex: number): Promise<number> {
        return this.tccd.settings.fanControlEnabled ||
            this.tccd.dbusData.sensorDataCollectionStatus
            ? await this.fanApi.getFanTemperature(fanIndex)
            : -1;
    }

    private async setDbusData(
        fanIndex: number,
        currentFanTemp: number,
        currentSpeedPercent: number
    ): Promise<void> {
        this.tccd.dbusData.fans[fanIndex].temp.set(Date.now(), currentFanTemp);
        this.tccd.dbusData.fans[fanIndex].speed.set(
            Date.now(),
            currentSpeedPercent
        );
    }
}
