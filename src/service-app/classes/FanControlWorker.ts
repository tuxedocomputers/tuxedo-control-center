/*!
 * Copyright (c) 2019-2021 TUXEDO Computers GmbH <tux@tuxedocomputers.com>
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
    SysFsPropertyInteger,
    SysFsPropertyString,
} from "../../common/classes/SysFsProperties";
import {
    TuxedoIOAPI as ioAPI,
    TuxedoIOAPI,
    ObjWrapper,
} from "../../native-lib/TuxedoIOAPI";
import { FanControlLogic, FAN_LOGIC } from "./FanControlLogic";
import { interpolatePointsArray } from "../../common/classes/FanUtils";
import { ITccFanProfile } from "src/common/models/TccFanTable";
import { exec } from "child_process";
import * as path from "path";
import * as fs from "fs";

export class FanControlWorker extends DaemonWorker {
    private fans: Map<number, FanControlLogic>;
    private cpuLogic = new FanControlLogic(
        this.tccd.getCurrentFanProfile(),
        FAN_LOGIC.CPU
    );
    private gpu1Logic = new FanControlLogic(
        this.tccd.getCurrentFanProfile(),
        FAN_LOGIC.GPU
    );
    private gpu2Logic = new FanControlLogic(
        this.tccd.getCurrentFanProfile(),
        FAN_LOGIC.GPU
    );

    private controlAvailableMessage = false;

    private modeSameSpeed = false;

    private fansOffAvailable: boolean = true;
    private fansMinSpeedHWLimit: number = 0;

    private hwmonPath: string;

    private previousFanProfile: ITccFanProfile;
    private previousFanSpeeds: { min: number; max: number; offset: number } = {
        min: -1,
        max: -1,
        offset: -1,
    };

    constructor(tccd: TuxedoControlCenterDaemon) {
        super(1000, tccd);
    }

    public async onStart(): Promise<void> {
        this.hwmonPath = await this.getHwmonPath();

        if (this.hwmonPath) {
            this.tccd.dbusData.fanHwmonAvailable = true;
        }

        if (!this.hwmonPath) {
            this.setupTuxedoIO();
        }
    }

    public onWork(): void {
        if (this.hwmonPath) {
            this.fanControl(this.hwmonPath);
        }

        if (!this.hwmonPath) {
            this.fallbackFanControl();
        }
    }

    public onExit(): void {}

    private setupTuxedoIO() {
        this.initHardwareCapabilities();
        this.initFanControl();

        const useFanControl = this.getFanControlStatus();

        if (useFanControl) {
            ioAPI.setEnableModeSet(true); // FIXME Dummy function, tuxedo-io always sets the manual bit
        }
    }

    private initHardwareCapabilities(): void {
        this.fansOffAvailable = ioAPI.getFansOffAvailable();
        this.fansMinSpeedHWLimit = ioAPI.getFansMinSpeed();

        this.tccd.dbusData.fansOffAvailable = this.fansOffAvailable;
        this.tccd.dbusData.fansMinSpeed = this.fansMinSpeedHWLimit;
    }

    private initFanControl(): void {
        const nrFans = ioAPI.getNumberFans();

        if (this.fans === undefined || this.fans.size !== nrFans) {
            this.mapLogicToFans(nrFans);
        }

        if (nrFans !== 0) {
            this.updateFanLogic();
        }
    }

    private mapLogicToFans(nrFans: number): void {
        this.fans = new Map();
        if (nrFans >= 1) {
            this.fans.set(1, this.cpuLogic);
        }
        if (nrFans >= 2) {
            this.fans.set(2, this.gpu1Logic);
        }
        if (nrFans >= 3) {
            this.fans.set(3, this.gpu2Logic);
        }
    }

    private getCurrentCustomProfile() {
        const { customFanCurve } = this.activeProfile.fan;
        const tableCPU = interpolatePointsArray(customFanCurve.tableCPU);
        const tableGPU = interpolatePointsArray(customFanCurve.tableGPU);
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

    private isEqual(first: ITccFanProfile, second: ITccFanProfile): boolean {
        return JSON.stringify(first) === JSON.stringify(second);
    }

    private setFanProfileValues(currentFanProfile: ITccFanProfile) {
        for (const fanNumber of this.fans.keys()) {
            if (this.activeProfile.fan.fanProfile == "Custom") {
                this.fans.get(fanNumber).minimumFanspeed = 0;
                this.fans.get(fanNumber).maximumFanspeed = 100;
                this.fans.get(fanNumber).offsetFanspeed = 0;

                this.fans.get(fanNumber).setFanProfile(currentFanProfile);
            }

            if (this.activeProfile.fan.fanProfile != "Custom") {
                this.fans.get(fanNumber).minimumFanspeed =
                    this.activeProfile.fan.minimumFanspeed;
                this.fans.get(fanNumber).maximumFanspeed =
                    this.activeProfile.fan.maximumFanspeed;
                this.fans.get(fanNumber).offsetFanspeed =
                    this.activeProfile.fan.offsetFanspeed;

                this.fans.get(fanNumber).setFanProfile(currentFanProfile);
            }
        }
    }

    private updateFanLogic(): void {
        const fanProfile = this.activeProfile.fan.fanProfile;
        const isCustomProfile = fanProfile === "Custom";
        
        const currentFanProfile = isCustomProfile
            ? this.getCurrentCustomProfile()
            : this.tccd.getCurrentFanProfile(this.activeProfile);

        const profileChanged =
            this.previousFanProfile &&
            (this.previousFanProfile.name !== fanProfile ||
                !this.isEqual(this.previousFanProfile, currentFanProfile));

        const profileValuesChanged =
            this.previousFanSpeeds.min !==
                this.activeProfile.fan.minimumFanspeed ||
            this.previousFanSpeeds.max !==
                this.activeProfile.fan.maximumFanspeed ||
            this.previousFanSpeeds.offset !==
                this.activeProfile.fan.offsetFanspeed;

        const profileNotSet = !this.previousProfile && currentFanProfile;

        if (profileChanged || profileValuesChanged || profileNotSet) {
            this.setFanProfileValues(currentFanProfile);
        }

        this.previousFanProfile = currentFanProfile;
        this.previousFanSpeeds = {
            min: this.activeProfile.fan.minimumFanspeed,
            max: this.activeProfile.fan.maximumFanspeed,
            offset: this.activeProfile.fan.offsetFanspeed,
        };
    }

    private fallbackFanControl(): void {
        this.initFanControl();

        const fanTemps: number[] = [];
        const fanSpeedsRead: number[] = [];
        const fanSpeedsSet: number[] = new Array<number>(this.fans.size);
        const fanTimestamps: number[] = [];
        const tempSensorAvailable: boolean[] = [];

        const fanCtrlUnavailableCondition =
            !TuxedoIOAPI.wmiAvailable() || this.fans.size === 0;
        if (fanCtrlUnavailableCondition) {
            if (this.controlAvailableMessage === false) {
                this.tccd.logLine("FanControlWorker: Control unavailable");
            }
            this.controlAvailableMessage = true;
            return;
        } else {
            if (this.controlAvailableMessage === true) {
                this.tccd.logLine("FanControlWorker: Control resumed");
            }
            this.controlAvailableMessage = false;
        }

        const useFanControl = this.getFanControlStatus();

        // Decide on a fan control approach
        // Per default fans are controlled using the 'same speed' approach setting the same speed for all fans chosen
        // from the max speed decided by each individual fan logic
        // Using the 'same speed' approach is necessary for uniwill devices since the fans on some
        // devices can not be controlled individually.
        this.modeSameSpeed = true;

        // For each fan read and process sensor values
        for (const fanNumber of this.fans.keys()) {
            const fanIndex: number = fanNumber - 1;

            const fanLogic = this.fans.get(fanNumber);

            // Read and store sensor values
            const currentTemperatureCelcius: ObjWrapper<number> = { value: 0 };
            const tempReadSuccess = ioAPI.getFanTemperature(
                fanIndex,
                currentTemperatureCelcius
            );
            const currentSpeedPercent: ObjWrapper<number> = { value: 0 };
            // const speedReadSuccess = ioAPI.getFanSpeedPercent(fanIndex, currentSpeedPercent);

            tempSensorAvailable.push(tempReadSuccess);
            fanTimestamps.push(Date.now());
            fanSpeedsRead.push(currentSpeedPercent.value);
            if (tempSensorAvailable[fanIndex]) {
                fanTemps.push(currentTemperatureCelcius.value);
            } else {
                fanTemps.push(-1);
            }

            // If there is temp sensor value report temperature to logic
            // Also, fill fanSpeedsSet
            if (tempSensorAvailable[fanIndex]) {
                fanLogic.reportTemperature(currentTemperatureCelcius.value);
                const calculatedSpeed = fanLogic.getSpeedPercent();
                fanSpeedsSet[fanIndex] = calculatedSpeed;
            } else {
                // Non existant sensor or wmi interface unavailable
                // Set "set speed" to zero to not affect the max value
                fanSpeedsSet[fanIndex] = 0;
            }
        }

        // Write fan speeds
        if (useFanControl) {
            const highestSpeed = fanSpeedsSet.reduce(
                (prev, cur) => (cur > prev ? cur : prev),
                0
            );

            for (const fanNumber of this.fans.keys()) {
                const fanIndex = fanNumber - 1;
                // Use highest speed decided by fan logic for current fan if "same speed" mode
                // or there is no sensor specific to this fan
                if (this.modeSameSpeed || !tempSensorAvailable[fanIndex]) {
                    fanSpeedsSet[fanIndex] = highestSpeed;
                }
                // Always write a fan speed previously decided
                ioAPI.setFanSpeedPercent(fanIndex, fanSpeedsSet[fanIndex]);
            }
        }

        // Publish the data on the dbus whether written by this control or values read from hw interface
        for (const fanNumber of this.fans.keys()) {
            const i = fanNumber - 1;
            let currentSpeed: number;

            if (fanTemps[i] === -1) {
                currentSpeed = -1;
            } else if (useFanControl) {
                currentSpeed = fanSpeedsSet[i];
            } else {
                currentSpeed = fanSpeedsRead[i];
            }

            this.tccd.dbusData.fans[i].temp.set(fanTimestamps[i], fanTemps[i]);
            this.tccd.dbusData.fans[i].speed.set(
                fanTimestamps[i],
                currentSpeed
            );
        }
    }

    private async getHwmonPath(): Promise<string | undefined> {
        return await execCommand(
            "grep -rl '^tuxedo$' /sys/class/hwmon/*/name | sed 's|/name$||'"
        );
    }

    private getFilteredAndMappedFiles(
        files: string[],
        pattern: RegExp
    ): string[] {
        return Array.from(
            new Set(
                files
                    .filter((entry) => entry.match(pattern))
                    .map((entry) => entry.split("_")[0])
            )
        );
    }

    private isPropertiesAvailable(
        ...props: (SysFsPropertyInteger | SysFsPropertyString)[]
    ): boolean {
        return props.every((prop) => prop.isAvailable());
    }

    private getLabelIndex(label: string): number | undefined {
        const labels = ["cpu0", "gpu0", "gpu1"];
        return labels.indexOf(label);
    }

    private getPropertyInteger(
        hwmonPath: string,
        fileName: string,
        suffix: string
    ): SysFsPropertyInteger {
        return new SysFsPropertyInteger(
            path.join(hwmonPath, fileName + suffix)
        );
    }

    private getPropertyString(
        hwmonPath: string,
        fileName: string,
        suffix: string
    ): SysFsPropertyString {
        return new SysFsPropertyString(path.join(hwmonPath, fileName + suffix));
    }

    private updateFanSpeed(index: number, input: number, max: number): void {
        this.tccd.dbusData.fans[index].speed.set(
            Date.now(),
            Math.round((input / max) * 100)
        );
    }

    private updateFanTemp(index: number, input: number): void {
        this.tccd.dbusData.fans[index].temp.set(
            Date.now(),
            Math.round(input / 1000)
        );
    }

    private fanControl(hwmonPath: string): void {
        const files = fs.readdirSync(hwmonPath);
        const fanFiles = this.getFanFiles(files);
        const tempFiles = this.getTempFiles(files);

        this.handleFanControl(hwmonPath, fanFiles);
        this.handleTempControl(hwmonPath, tempFiles);
    }

    private getFanFiles(files: string[]): string[] {
        return this.getFilteredAndMappedFiles(files, /^fan\d/);
    }

    private getTempFiles(files: string[]): string[] {
        return this.getFilteredAndMappedFiles(files, /^temp\d/);
    }

    private handleFanControl(hwmonPath: string, files: string[]) {
        for (const fanFile of files) {
            const fanInput = this.getPropertyInteger(
                hwmonPath,
                fanFile,
                "_input"
            );
            const fanLabel = this.getPropertyString(
                hwmonPath,
                fanFile,
                "_label"
            );
            const fanMin = this.getPropertyInteger(hwmonPath, fanFile, "_min");
            const fanMax = this.getPropertyInteger(hwmonPath, fanFile, "_max");

            if (
                this.isPropertiesAvailable(fanInput, fanLabel, fanMin, fanMax)
            ) {
                const input = fanInput.readValueNT();
                const label = fanLabel.readValueNT();
                const max = fanMax.readValueNT();

                const index = this.getLabelIndex(label);

                if (index !== undefined && index !== -1) {
                    this.updateFanSpeed(index, input, max);
                }
            }
        }
    }

    private handleTempControl(hwmonPath: string, files: string[]) {
        for (const tempFile of files) {
            const tempInput = this.getPropertyInteger(
                hwmonPath,
                tempFile,
                "_input"
            );
            const tempLabel = this.getPropertyString(
                hwmonPath,
                tempFile,
                "_label"
            );

            if (this.isPropertiesAvailable(tempInput, tempLabel)) {
                const input = tempInput.readValueNT();
                const label = tempLabel.readValueNT();

                const index = this.getLabelIndex(label);

                if (index !== undefined && index !== -1) {
                    this.updateFanTemp(index, input);
                }
            }
        }
    }

    private getFanControlStatus(): boolean {
        /*const dmi = new DMIController('/sys/class/dmi/id');
        const boardName = dmi.boardName.readValueNT();
        // when adding or removing devices here don't forget to also alter hasFanControl() from compatibility.service.ts from tcc
        if (boardName === "GMxRGxx") {
            return false;
        }*/
        return this.tccd.settings.fanControlEnabled;
    }
}

async function execCommand(command: string): Promise<string> {
    return new Promise((resolve, reject) => {
        exec(command, (error, stdout, stderr) => {
            if (error || stderr) {
                resolve(undefined);
            } else {
                resolve(stdout.trim());
            }
        });
    });
}
