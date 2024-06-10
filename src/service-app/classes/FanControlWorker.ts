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
import { interpolatePointsArray } from "../../common/classes/FanUtils";
import {
    ITccFanProfile,
    ITccFanTableEntry,
    customFanPreset,
} from "../../common/models/TccFanTable";
import { ITccProfile } from "../../common/models/TccProfile";
import { tuxedoIoAPI } from "./FanControlTuxedoIO";
import { pwmAPI } from "./FanControlPwm";
import { FanControlLogic } from "./FanControlLogic";

export class FanControlWorker extends DaemonWorker {
    private pwmAvailable: boolean = false;
    private previousFanProfile: ITccFanProfile;
    private previousFanControlEnabled: boolean = undefined;
    private previousFanSpeeds: { min: number; max: number; offset: number } = {
        min: -1,
        max: -1,
        offset: -1,
    };

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

    constructor(tccd: TuxedoControlCenterDaemon) {
        super(1000, tccd);
    }

    public async onStart(): Promise<void> {
        this.pwm = new pwmAPI(this.tccd);
        this.pwmAvailable = await this.pwm.checkAvailable();
        if (this.pwmAvailable) {
            this.fanApi = this.pwm;
            await this.initFanControl();
            await this.updateFanLogic();
            return;
        }

        this.io = new tuxedoIoAPI(this.tccd);
        const ioAvailable = await this.io.checkAvailable();
        if (ioAvailable) {
            this.fanApi = this.io;
            await this.initFanControl();
            await this.updateFanLogic();
            return;
        }
    }

    public async onWork(): Promise<void> {
        const fanControlEnabled = this.tccd.settings.fanControlEnabled;

        if (fanControlEnabled) {
            if (this.mapStatus === false) {
                await this.initFanControl();
            }

            if (this.mapStatus) {
                await this.fanControl();
            }
        }

        if (fanControlEnabled && !this.previousFanControlEnabled) {
            await this.fanApi.clearTempValues();
            await this.fanApi.initFanControl();
        } else if (!fanControlEnabled && this.previousFanControlEnabled) {
            await this.fanApi.exit();
        }

        this.previousFanControlEnabled = fanControlEnabled;
    }

    public async onExit(): Promise<void> {
        await this.fanApi.exit();
    }

    private async initFanControl(): Promise<void> {
        await this.fanApi.initFanControl();
        const numberFans = await this.fanApi.getNumberFans();

        this.mapStatus = await this.fanApi.mapLogicToFans(numberFans);
    }

    private async getCurrentCustomProfile(
        activeProfile: ITccProfile
    ): Promise<ITccFanProfile> {
        const customFanCurve = await this.getCustomFanCurve(activeProfile);
        const [tableCPU, tableGPU] = await Promise.all([
            interpolatePointsArray(customFanCurve.tableCPU),
            interpolatePointsArray(customFanCurve.tableGPU),
        ]);

        const tccFanTable = (temp: number, i: number) => ({
            temp: i,
            speed: temp,
        });
        const tccFanProfile: ITccFanProfile = {
            name: "Custom",
            tableCPU: tableCPU.map(tccFanTable),
            tableGPU: tableGPU.map(tccFanTable),
        };
        return tccFanProfile;
    }

    public async getCustomFanCurve(
        profile: ITccProfile
    ): Promise<ITccFanProfile> {
        if (profile.fan.customFanCurve === undefined) {
            return customFanPreset;
        } else {
            return profile.fan.customFanCurve;
        }
    }

    public async isEqual(
        first: ITccFanProfile,
        second: ITccFanProfile
    ): Promise<boolean> {
        return JSON.stringify(first) === JSON.stringify(second);
    }

    public async setPreviousValues(
        activeProfile: ITccProfile,
        currentFanProfile: ITccFanProfile
    ): Promise<void> {
        const customFanCurve = await this.getCustomFanCurve(activeProfile);

        this.previousCustomCurve = {
            tableCPU: customFanCurve.tableCPU,
            tableGPU: customFanCurve.tableGPU,
        };

        this.previousFanSpeeds = {
            min: activeProfile.fan.minimumFanspeed,
            max: activeProfile.fan.maximumFanspeed,
            offset: activeProfile.fan.offsetFanspeed,
        };

        this.previousFanProfile = currentFanProfile;
    }

    private async isCustomProfileChanged(): Promise<boolean> {
        const { customFanCurve } = this.activeProfile.fan;

        return !(await this.isEqual(this.previousCustomCurve, customFanCurve));
    }

    private async isMinMaxOffsetChanged(): Promise<boolean> {
        return (
            this.previousFanSpeeds.min !==
                this.activeProfile.fan.minimumFanspeed ||
            this.previousFanSpeeds.max !==
                this.activeProfile.fan.maximumFanspeed ||
            this.previousFanSpeeds.offset !==
                this.activeProfile.fan.offsetFanspeed
        );
    }

    private async isProfileNameChanged(fanProfile: string): Promise<boolean> {
        return (
            this.previousFanProfile?.name !== fanProfile ||
            this.previousFanProfile === undefined
        );
    }

    private async updateFanLogic(): Promise<void> {
        const fanProfile = this.activeProfile.fan.fanProfile;
        const isCustomProfile = fanProfile === "Custom";
        const [
            isCustomProfileChanged,
            isMinMaxOffsetChanged,
            isProfileNameChanged,
        ] = await Promise.all([
            this.isCustomProfileChanged(),
            this.isMinMaxOffsetChanged(),
            this.isProfileNameChanged(fanProfile),
        ]);

        if (
            isProfileNameChanged ||
            isCustomProfileChanged ||
            isMinMaxOffsetChanged
        ) {
            const currentFanProfile = isCustomProfile
                ? await this.getCurrentCustomProfile(this.activeProfile)
                : this.tccd.getCurrentFanProfile(this.activeProfile);

            await this.fanApi.setFanProfileValues(
                this.activeProfile,
                currentFanProfile
            );

            await this.setPreviousValues(this.activeProfile, currentFanProfile);
        }
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
                await this.fanApi.writeFanSpeed(fanIndex, calculatedSpeed);
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
