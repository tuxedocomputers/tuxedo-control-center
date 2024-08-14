/*!
 * Copyright (c) 2019-2023 TUXEDO Computers GmbH <tux@tuxedocomputers.com>
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
import { FanData } from "../../common/models/IFanData";
import { FanControlLogic, FAN_LOGIC } from "./FanControlLogic";
import { interpolatePointsArray } from "../../common/classes/FanUtils";
import {
    ITccFanProfile,
    ITccFanTableEntry,
    customFanPreset,
} from "../../common/models/TccFanTable";
import { exec } from "child_process";
import * as path from "path";
import * as fs from "fs";
import { ITccProfile } from "../../common/models/TccProfile";

export class FanControlWorker extends DaemonWorker {
    private fans: Map<number, FanControlLogic>;
    private cpuLogic: FanControlLogic = new FanControlLogic(
        this.tccd.getCurrentFanProfile(),
        FAN_LOGIC.CPU
    );
    private gpu1Logic: FanControlLogic = new FanControlLogic(
        this.tccd.getCurrentFanProfile(),
        FAN_LOGIC.GPU
    );
    private gpu2Logic: FanControlLogic = new FanControlLogic(
        this.tccd.getCurrentFanProfile(),
        FAN_LOGIC.GPU
    );

    private controlAvailableMessage: boolean = false;

    private modeSameSpeed: boolean = false;

    private fansOffAvailable: boolean = true;
    private fansMinSpeedHWLimit: number = 0;

    private hwmonPath: string;
    private pwmPath: string = "/sys/bus/platform/devices/tuxedo_fan_control";
    private hwmonAvailable: boolean = false;
    private pwmAvailable: boolean = false;

    private previousFanProfile: ITccFanProfile;
    private previousFanSpeeds: { min: number; max: number; offset: number } = {
        min: -1,
        max: -1,
        offset: -1,
    };
    private previousCustomCurve: {
        tableCPU: ITccFanTableEntry[];
        tableGPU: ITccFanTableEntry[];
    } = {
        tableCPU: [],
        tableGPU: [],
    };
    private dbusData: {
        fans: {
            temp: { timestamp: number; temp: number; };
            speed: { timestamp: number; speed: number; };
        }[];
    } = {
        fans: [
            {
                temp: {
                    timestamp: -1,
                    temp: -1
                },
                speed:
                {
                    timestamp: -1,
                    speed: -1
                }
            },
            {
                temp: {
                    timestamp: -1,
                    temp: -1
                },
                speed:
                {
                    timestamp: -1,
                    speed: -1
                }
            },
            {
                temp: {
                    timestamp: -1,
                    temp: -1
                },
                speed:
                {
                    timestamp: -1,
                    speed: -1
                }
            }
        ]
    }

    constructor(tccd: TuxedoControlCenterDaemon) {
        super(1000, "FanControlWorker", tccd);
    }

    public async onStart(): Promise<void> {
        this.setupPwm();

        if (!this.pwmAvailable) {
            this.setupTuxedoIO();
        }
    }

    public onWork(): void {
        if (this.pwmAvailable && this.hwmonAvailable) {
            this.fanControl(this.hwmonPath);
        }

        if (!this.pwmAvailable && this.hwmonAvailable) {
            this.dashboardHwmonMetrics(this.hwmonPath)
        }

        if (!this.pwmAvailable && !this.hwmonAvailable) {
            this.fallbackFanControl();
        }
    }

    public onExit(): void {
        if (this.getFanControlStatus()) {
            ioAPI.setFansAuto(); // required to avoid high fan speed on wakeup for certain devices
            ioAPI.setEnableModeSet(false); //FIXME Dummy function, tuxedo-io always sets the manual bit
        }

        if (this.pwmAvailable) {
            this.setHwmonPwmEnable(2);
        }
    }

    private async setupPwm(): Promise<void> {
        this.hwmonPath = await this.getHwmonPath();
        this.hwmonAvailable = fs.existsSync(this.hwmonPath);

        if (this.hwmonPath) {
            this.pwmAvailable = fs.existsSync(this.pwmPath);
            if (this.pwmAvailable) {
                this.tccd.dbusData.fanHwmonAvailable = true;

                this.setHwmonPwmEnable(1);
                this.initFanControl();
            }
        }
    }

    private initFanControl(): void {
        // todo: discern between fan types
        // code assumes there is one fan per device (CPU, iGPU, dGPU)
        const files: string[] = fs.readdirSync(
            "/sys/bus/platform/devices/tuxedo_fan_control"
        );
        const fanFiles: string[] = this.getFanFiles(files);
        this.mapLogicToFans(fanFiles.length);
    }

    // 1 = manual mode, 2 = auto mode
    setHwmonPwmEnable(status: number): void {
        const pwmfiles: string[] = fs.readdirSync(this.pwmPath);
        const fanFiles: string[] = this.getFanFiles(pwmfiles);

        for (const fanFile of fanFiles) {
            const fanPwm: SysFsPropertyInteger = this.getPropertyInteger(
                this.pwmPath,
                fanFile,
                "_pwm_enable"
            );
            fanPwm.writeValue(status);
        }
    }

    private setupTuxedoIO(): void {
        this.initHardwareCapabilities();
        this.initFallbackFanControl();

        const useFanControl: boolean = this.getFanControlStatus();

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

    private initFallbackFanControl(): void {
        const nrFans: number = ioAPI.getNumberFans();

        if (this.fans === undefined || this.fans.size !== nrFans) {
            this.mapLogicToFans(nrFans);
        }

        if (nrFans !== 0) {
            this.updateFanLogic();
        }
    }

    private getCustomFanCurve(profile: ITccProfile): ITccFanProfile {
        if (profile.fan.customFanCurve === undefined) {
            return customFanPreset;
        } else {
            return profile.fan.customFanCurve;
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

    private getCurrentCustomProfile(): ITccFanProfile {
        const customFanCurve: ITccFanProfile = this.getCustomFanCurve(this.activeProfile);
        const tableCPU: number[] = interpolatePointsArray(customFanCurve.tableCPU);
        const tableGPU: number[] = interpolatePointsArray(customFanCurve.tableGPU);
        const tccFanTable: (temp: number, i: number) => {
            temp: number;
            speed: number;
        } = (temp: number, i: number): { temp: number; speed: number} => ({
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

    private setPreviousValues(currentFanProfile: ITccFanProfile): void {
        const customFanCurve: ITccFanProfile = this.getCustomFanCurve(this.activeProfile);

        this.previousCustomCurve = {
            tableCPU: customFanCurve.tableCPU,
            tableGPU: customFanCurve.tableGPU,
        };

        this.previousFanSpeeds = {
            min: this.activeProfile.fan.minimumFanspeed,
            max: this.activeProfile.fan.maximumFanspeed,
            offset: this.activeProfile.fan.offsetFanspeed,
        };

        this.previousFanProfile = currentFanProfile;
    }

    private isCustomProfileChanged(): boolean {
        const { customFanCurve } = this.activeProfile.fan;

        return !this.isEqual(this.previousCustomCurve, customFanCurve);
    }

    private isMinMaxOffsetChanged(): boolean {
        return (
            this.previousFanSpeeds.min !==
                this.activeProfile.fan.minimumFanspeed ||
            this.previousFanSpeeds.max !==
                this.activeProfile.fan.maximumFanspeed ||
            this.previousFanSpeeds.offset !==
                this.activeProfile.fan.offsetFanspeed
        );
    }

    private isProfileNameChanged(fanProfile: string): boolean {
        return (
            this.previousFanProfile?.name !== fanProfile ||
            this.previousFanProfile === undefined
        );
    }

    private updateFanLogic(currentTemp?: number): void {
        const fanProfile: string = this.activeProfile.fan.fanProfile;
        const isCustomProfile: boolean = fanProfile === "Custom";
        const isCustomProfileChanged: boolean = this.isCustomProfileChanged();
        const isMinMaxOffsetChanged: boolean = this.isMinMaxOffsetChanged();
        const isProfileNameChanged: boolean = this.isProfileNameChanged(fanProfile);

        if (
            isProfileNameChanged ||
            isCustomProfileChanged ||
            isMinMaxOffsetChanged
        ) {
            const currentFanProfile: ITccFanProfile = isCustomProfile
                ? this.getCurrentCustomProfile()
                : this.tccd.getCurrentFanProfile(this.activeProfile);

            this.setFanProfileValues(currentFanProfile);
            this.setPreviousValues(currentFanProfile);
        }

        if (this.pwmAvailable) {
            for (const fanNumber of this.fans.keys()) {
                const fanLogic: FanControlLogic = this.fans.get(fanNumber);

                fanLogic.reportTemperature(currentTemp / 1000);
                const fanSpeed: number = fanLogic.getSpeedPercent();

                // todo: discern between fans
                this.setHwmonFan(fanNumber, fanSpeed);
            }
        }
    }

    private setHwmonFan(fanNumber: number, tempSpeed: number): void {
        const fanPwm: SysFsPropertyInteger = this.getPropertyInteger(
            "/sys/bus/platform/devices/tuxedo_fan_control/",
            "fan" + fanNumber.toString(),
            "_pwm"
        );
        fanPwm.writeValue(Math.round((tempSpeed / 100) * 255));
    }

    private fallbackFanControl(): void {
        this.initFallbackFanControl();

        const fanTemps: number[] = [];
        const fanSpeedsRead: number[] = [];
        const fanSpeedsSet: number[] = new Array<number>(this.fans.size);
        const fanTimestamps: number[] = [];
        const tempSensorAvailable: boolean[] = [];

        const fanCtrlUnavailableCondition: boolean =
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

            const fanLogic: FanControlLogic = this.fans.get(fanNumber);

            // Read and store sensor values
            const currentTemperatureCelsius: ObjWrapper<number> = { value: 0 };
            const tempReadSuccess: boolean = ioAPI.getFanTemperature(
                fanIndex,
                currentTemperatureCelsius
            );
            const currentSpeedPercent: ObjWrapper<number> = { value: 0 };
            // const speedReadSuccess = ioAPI.getFanSpeedPercent(fanIndex, currentSpeedPercent);

            tempSensorAvailable.push(tempReadSuccess);
            fanTimestamps.push(Date.now());
            fanSpeedsRead.push(currentSpeedPercent.value);
            if (tempSensorAvailable[fanIndex]) {
                fanTemps.push(currentTemperatureCelsius.value);
            } else {
                fanTemps.push(-1);
            }

            // If there is temp sensor value report temperature to logic
            // Also, fill fanSpeedsSet
            if (tempSensorAvailable[fanIndex]) {
                fanLogic.reportTemperature(currentTemperatureCelsius.value);
                const calculatedSpeed: number = fanLogic.getSpeedPercent();
                fanSpeedsSet[fanIndex] = calculatedSpeed;
            } else {
                // Non existant sensor or wmi interface unavailable
                // Set "set speed" to zero to not affect the max value
                fanSpeedsSet[fanIndex] = 0;
            }
        }

        // Write fan speeds
        if (useFanControl) {
            const highestSpeed: number = fanSpeedsSet.reduce(
                (prev: number, cur: number): number => (cur > prev ? cur : prev),
                0
            );

            for (const fanNumber of this.fans.keys()) {
                const fanIndex: number = fanNumber - 1;
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
            const i: number = fanNumber - 1;
            let currentSpeed: number;

            if (fanTemps[i] === -1) {
                currentSpeed = -1;
            } else if (useFanControl) {
                currentSpeed = fanSpeedsSet[i];
            } else {
                currentSpeed = fanSpeedsRead[i];
            }

            this.dbusData.fans[i].temp = { timestamp: fanTimestamps[i], temp: fanTemps[i] };
            this.dbusData.fans[i].speed = {
                timestamp: fanTimestamps[i],
                speed: currentSpeed }
            this.updateDbusData();
        }
    }

    private updateDbusData()
     {
        let cpu: FanData = new FanData(-1, -1, -1);
        let gpu1: FanData = new FanData(-1, -1, -1);
        let gpu2: FanData = new FanData(-1, -1, -1);

        cpu = new FanData(this.dbusData.fans[0].temp.timestamp, this.dbusData.fans[0].speed.speed, this.dbusData.fans[0].temp.temp);
        gpu1 = new FanData(this.dbusData.fans[1].temp.timestamp, this.dbusData.fans[1].speed.speed, this.dbusData.fans[1].temp.temp);
        gpu2 = new FanData(this.dbusData.fans[2].temp.timestamp, this.dbusData.fans[2].speed.speed, this.dbusData.fans[2].temp.temp);
        let fanData: { cpu: FanData, gpu1: FanData, gpu2: FanData } = {
                cpu: cpu,
                gpu1: gpu1,
                gpu2: gpu2
            };
        this.tccd.dbusData.fanData = JSON.stringify(fanData);
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
                    .filter((entry: string): RegExpMatchArray => entry.match(pattern))
                    .map((entry: string): string => entry.split("_")[0])
            )
        );
    }

    private isPropertiesAvailable(
        ...props: (SysFsPropertyInteger | SysFsPropertyString)[]
    ): boolean {
        return props.every((prop: SysFsPropertyInteger | SysFsPropertyString): boolean => prop.isAvailable());
    }

    private getLabelIndex(label: string): number | undefined {
        const labels: string[] = ["cpu0", "gpu0", "gpu1"];
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
        this.dbusData.fans[index].speed= {
            timestamp: Date.now(),
            speed: Math.round((Math.min(input / max) / max) * 100)
        };
        this.updateDbusData();
    }

    private updateFanTemp(index: number, input: number): void {
        this.dbusData.fans[index].temp = {
            timestamp: Date.now(),
            temp: Math.round(input / 1000) };
            this.updateDbusData();
    }

    // todo: refactor code
    private dashboardHwmonMetrics(hwmonPath: string): void {
        const files: string[] = fs.readdirSync(hwmonPath);
        const fanFiles: string[] = this.getFanFiles(files);
        const tempFiles: string[] = this.getTempFiles(files);

        this.handleFanControl(hwmonPath, fanFiles);
        this.handleTempControl(hwmonPath, tempFiles)
    }

    private fanControl(hwmonPath: string): void {
        const files: string[] = fs.readdirSync(hwmonPath);
        const fanFiles: string[] = this.getFanFiles(files);
        const tempFiles: string[] = this.getTempFiles(files);

        this.handleFanControl(hwmonPath, fanFiles);
        // todo: differentiate between cpu and gpu temps, using cpu temp for now
        let tempValue: number = this.handleTempControl(hwmonPath, tempFiles);

        if (this.pwmAvailable) {
            this.updateFanLogic(tempValue);
        }
    }

    private getFanFiles(files: string[]): string[] {
        return this.getFilteredAndMappedFiles(files, /^fan\d/);
    }

    private getTempFiles(files: string[]): string[] {
        return this.getFilteredAndMappedFiles(files, /^temp\d/);
    }

    private handleFanControl(hwmonPath: string, files: string[]) {
        for (const fanFile of files) {
            const fanInput: SysFsPropertyInteger = this.getPropertyInteger(
                hwmonPath,
                fanFile,
                "_input"
            );
            const fanLabel: SysFsPropertyString = this.getPropertyString(
                hwmonPath,
                fanFile,
                "_label"
            );
            const fanMin: SysFsPropertyInteger = this.getPropertyInteger(hwmonPath, fanFile, "_min");
            const fanMax: SysFsPropertyInteger = this.getPropertyInteger(hwmonPath, fanFile, "_max");

            if (
                this.isPropertiesAvailable(fanInput, fanLabel, fanMin, fanMax)
            ) {
                const input: number = fanInput.readValueNT();
                const label: string = fanLabel.readValueNT();
                const max: number = fanMax.readValueNT();

                const index: number = this.getLabelIndex(label);

                if (index !== undefined && index !== -1) {
                    this.updateFanSpeed(index, input, max);
                }
            }
        }
    }

    private handleTempControl(hwmonPath: string, files: string[]) {
        // todo: differentiate between cpu and gpu temps, using cpu temp for now
        let tempValue: number;

        for (const tempFile of files) {
            const tempInput: SysFsPropertyInteger = this.getPropertyInteger(
                hwmonPath,
                tempFile,
                "_input"
            );
            const tempLabel: SysFsPropertyString = this.getPropertyString(
                hwmonPath,
                tempFile,
                "_label"
            );

            if (this.isPropertiesAvailable(tempInput, tempLabel)) {
                const input: number = tempInput.readValueNT();
                const label: string = tempLabel.readValueNT();

                if (label == "cpu0") {
                    tempValue = input;
                }

                const index: number = this.getLabelIndex(label);

                if (index !== undefined && index !== -1) {
                    this.updateFanTemp(index, input);
                }
            }
        }

        return tempValue;
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
        return new Promise<string>((resolve: (value: string | PromiseLike<string>) => void, reject: (reason?: unknown) => void): void => {
        exec(command, (err: unknown, stdout: string, stderr: string): void => {
            if (err || stderr) {
                console.error("FanControlWorker: execCommand failed =>", err)
                resolve(undefined);
            } else {
                resolve(stdout.trim());
            }
        });
    });
}
