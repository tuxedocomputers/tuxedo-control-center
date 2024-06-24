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
import { tuxedoIoAPI } from "./FanControlTuxedoIO";
import { pwmAPI } from "./FanControlPwm";
import { FanControlLogic } from "./FanControlLogic";
import { getCurrentCustomProfile } from "./FanControlUtils";

export class FanControlWorker extends DaemonWorker {
    private pwmAvailable: boolean = false;
    private previousFanControlEnabled: boolean = undefined;

    private pwm: pwmAPI;
    private fanApi: tuxedoIoAPI;
    private io: pwmAPI | tuxedoIoAPI;
    private mapStatus: boolean = false;

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
            this.pwm = new pwmAPI(this.tccd);
            this.pwmAvailable = await this.pwm.checkAvailable();
            if (this.pwmAvailable) {
                this.fanApi = this.pwm;
                await this.initFanControl();
                await this.setFanProfile();
                return;
            }

            this.io = new tuxedoIoAPI(this.tccd);
            const ioAvailable = await this.io.checkAvailable();
            if (ioAvailable) {
                this.fanApi = this.io;
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
        const fanControlEnabled = this.tccd.settings.fanControlEnabled;
        const sensorCollection = this.tccd.dbusData.sensorDataCollectionStatus;

        await this.handleRetryInit();
        await this.handleFanControl(fanControlEnabled, sensorCollection);
        await this.handleGlobalFanConfig(fanControlEnabled);
    }

    public async onExit(): Promise<void> {
        await this.fanApi.exit();
    }

    private async setPreviousFans() {
        const numberFans = await this.fanApi.getNumberFans();

        for (let i = 0; i <= numberFans; i++) {
            this.previousTempValues.set(i, -1);
        }
    }

    private async handleRetryInit() {
        const fanApiUnavailable =
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

    private async handleGlobalFanConfig(fanControlEnabled: boolean) {
        const previousFanEnabled = this.previousFanControlEnabled;
        if (fanControlEnabled && !previousFanEnabled && this.fanApi) {
            console.log("Fan Control: Enabling fans");
            await this.fanApi.clearTempValues();
            await this.fanApi.initFanControl();
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
                await this.initFanControl();
                await this.setFanProfile();
            }

            if (this.mapStatus) {
                await this.fanControl();
            }
        }
    }

    private async initFanControl(): Promise<void> {
        await this.fanApi.initFanControl();
        const numberFans = await this.fanApi.getNumberFans();

        this.mapStatus = await this.fanApi.mapLogicToFans(numberFans);
        await this.setPreviousFans();
    }

    public async isEqual(
        first: ITccFanProfile,
        second: ITccFanProfile
    ): Promise<boolean> {
        return JSON.stringify(first) === JSON.stringify(second);
    }

    private async setFanProfile(): Promise<void> {
        const fanProfile = this.activeProfile.fan.fanProfile;
        const isCustomProfile = fanProfile === "Custom";

        const currentFanProfile = isCustomProfile
            ? await getCurrentCustomProfile(this.activeProfile)
            : this.tccd.getCurrentFanProfile(this.activeProfile);

        console.log("Fan Control: Setting fan profile");
        await this.fanApi.setFanProfileValues(
            this.activeProfile,
            currentFanProfile
        );
    }

    private async fanControl(): Promise<void> {
        const fans = await this.fanApi.getFans();

        for (const fanNumber of fans.keys()) {
            const fanIndex = fanNumber - 1;

            await this.updateFan(fanIndex, fans.get(fanNumber));
        }
    }

    private async updateFan(
        fanIndex: number,
        fanLogic: FanControlLogic
    ): Promise<void> {
        const temperature = await this.getTemperature(fanIndex);

        if (temperature > -1) {
            fanLogic.reportTemperature(temperature);

            if (this.tccd.settings.fanControlEnabled) {
                const calculatedSpeed = fanLogic.getSpeedPercent();

                if (
                    this.previousTempValues.get(fanIndex) !== calculatedSpeed &&
                    calculatedSpeed > -1
                ) {
                    await this.fanApi.writeFanSpeed(fanIndex, calculatedSpeed);
                    this.previousTempValues.set(fanIndex, calculatedSpeed);
                }
            }

            if (this.tccd.dbusData.sensorDataCollectionStatus) {
                const currentSpeedPercent =
                    await this.fanApi.getFanSpeedPercent(fanIndex);

                await this.setDbusData(
                    fanIndex,
                    temperature,
                    currentSpeedPercent
                );
            } else {
                await this.setDbusData(fanIndex, temperature, -1);
            }
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
