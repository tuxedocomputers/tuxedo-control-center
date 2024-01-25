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
import { DaemonWorker } from './DaemonWorker';
import { TuxedoControlCenterDaemon } from './TuxedoControlCenterDaemon';
import { FanData, IDBusFanData } from '../../common/models/IFanData';
import {
    SysFsPropertyInteger,
    SysFsPropertyString,
} from '../../common/classes/SysFsProperties';
import { TuxedoIOAPI as ioAPI, TuxedoIOAPI, ObjWrapper, ModuleInfo } from '../../native-lib/TuxedoIOAPI';
import { FanControlLogic, FAN_LOGIC } from './FanControlLogic';
import { exec } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
export class FanControlWorker extends DaemonWorker {

    private fans: Map<number, FanControlLogic>;
    private cpuLogic = new FanControlLogic(this.tccd.getCurrentFanProfile(), FAN_LOGIC.CPU);
    private gpu1Logic = new FanControlLogic(this.tccd.getCurrentFanProfile(), FAN_LOGIC.GPU);
    private gpu2Logic = new FanControlLogic(this.tccd.getCurrentFanProfile(), FAN_LOGIC.GPU);
    private fanData: IDBusFanData;
    private controlAvailableMessage = false;

    private modeSameSpeed = false;

    private fansOffAvailable: boolean = true;
    private fansMinSpeedHWLimit: number = 0;

    private hwmonPath: string

    constructor(tccd: TuxedoControlCenterDaemon) {
        super(1000, "FanControlWorker", tccd);
    }

    public async onStart(): Promise<void> {
        this.hwmonPath = await this.getHwmonPath();

        if(this.hwmonPath) {
            this.tccd.dbusData.fanHwmonAvailable = true
        }

        if(!this.hwmonPath) {
            this.setupTuxedoIO()
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
            this.mapLogicToFans(nrFans)
        }

        if (nrFans !== 0) {
            this.updateFanLogic()
        }
    }

    private mapLogicToFans(nrFans: number): void {
        this.fans = new Map();
        if (nrFans >= 1) { this.fans.set(1, this.cpuLogic); }
        if (nrFans >= 2) { this.fans.set(2, this.gpu1Logic); }
        if (nrFans >= 3) { this.fans.set(3, this.gpu2Logic); }
    }

    private updateFanLogic(): void {
        const currentFanProfile = this.tccd.getCurrentFanProfile(this.activeProfile);
        for (const fanNumber of this.fans.keys()) {
            if (this.fans.get(fanNumber).getFanProfile() === undefined ||
                this.fans.get(fanNumber).getFanProfile().name !== currentFanProfile.name) {
                this.fans.get(fanNumber).setFanProfile(currentFanProfile);
            }
            this.fans.get(fanNumber).minimumFanspeed = this.activeProfile.fan.minimumFanspeed;
            this.fans.get(fanNumber).offsetFanspeed = this.activeProfile.fan.offsetFanspeed;
        }

        for (const fanNumber of this.fans.keys()) {
            this.fans.get(fanNumber).fansMinSpeedHWLimit = this.fansMinSpeedHWLimit;
            this.fans.get(fanNumber).fansOffAvailable = this.fansOffAvailable;
        }
    }

    private fallbackFanControl(): void {
        this.initFanControl(); // Make sure structures are up to date before doing anything
        const fanTemps: number[] = [];
        const fanSpeedsRead: number[] = [];
        const fanSpeedsSet: number[] = new Array<number>(this.fans.size);
        const fanTimestamps: number[] = [];
        const tempSensorAvailable: boolean[] = [];

        // const moduleInfo = new ModuleInfo();
        const fanCtrlUnavailableCondition = !TuxedoIOAPI.wmiAvailable() || this.fans.size === 0;
        if (fanCtrlUnavailableCondition) {
            if (this.controlAvailableMessage === false) {
                this.tccd.logLine('FanControlWorker: Control unavailable');
            }
            this.controlAvailableMessage = true;
            return;
        } else {
            if (this.controlAvailableMessage === true) {
                this.tccd.logLine('FanControlWorker: Control resumed');
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
            const tempReadSuccess = ioAPI.getFanTemperature(fanIndex, currentTemperatureCelcius);
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
            const highestSpeed = fanSpeedsSet.reduce((prev, cur) => cur > prev ? cur : prev, 0);

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
        let cpu = new FanData(-1, -1, -1);
        let gpu1 = new FanData(-1, -1, -1);
        let gpu2 = new FanData(-1, -1, -1);

        // Publish the data on the dbus whether written by this control or values read from hw interface
        for (const fanNumber of this.fans.keys()) {
            const i = fanNumber - 1;
            let currentSpeed: number;

            if (fanTemps[i] === -1) {
                currentSpeed = -1
            } else if (useFanControl) {
                currentSpeed = fanSpeedsSet[i];
            } else {
                currentSpeed = fanSpeedsRead[i];
            }
            if ( i === 0)
            cpu = new FanData(fanTimestamps[i], currentSpeed, fanTemps[i]);
            if ( i === 1)
            gpu1 = new FanData(fanTimestamps[i], currentSpeed, fanTemps[i]);
            if ( i === 2)
            gpu2 = new FanData(fanTimestamps[i], currentSpeed, fanTemps[i]);
        }
        this.fanData = {
                cpu: cpu,
                gpu1: gpu1,
                gpu2: gpu2
              };
        this.updateFanData();
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

    // synchronizes local fanData and tccd stringified fanData
    private updateFanData()
    {
        this.tccd.dbusData.fanData = JSON.stringify(this.fanData);
    }

    private fanControl(hwmonPath: string): void {
        const files = fs.readdirSync(hwmonPath);

        const fanFiles = this.getFilteredAndMappedFiles(files, /^fan\d/);
        const tempFiles = this.getFilteredAndMappedFiles(files, /^temp\d/);
        var tempFanData = [
                { 
                    speed: -1,
                    temp: -1,
                    max: -1
                },
                { 
                    speed: -1,
                    temp: -1,
                    max: -1
                },
                { 
                    speed: -1,
                    temp: -1,
                    max: -1
                },
        ];
        for (const fanFile of fanFiles) {
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
                // const min = fanMin.readValueNT();
                const max = fanMax.readValueNT();

                const index = this.getLabelIndex(label);

                if (index !== undefined && index !== -1) {
                    tempFanData[index].speed = input;
                    tempFanData[index].max = max;
                }
            }
        }

        for (const tempFile of tempFiles) {
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
                    tempFanData[index].temp = input;
                }
            }
        }

        let cpu = new FanData(Date.now(), Math.round((tempFanData[0].speed / tempFanData[0].max) * 100), tempFanData[0].temp );
        let gpu1 = new FanData(Date.now(), Math.round((tempFanData[0].speed / tempFanData[0].max) * 100), tempFanData[0].temp );
        let gpu2 = new FanData(Date.now(), Math.round((tempFanData[0].speed / tempFanData[0].max) * 100), tempFanData[0].temp );
    
        this.fanData = {
                cpu: cpu,
                gpu1: gpu1,
                gpu2: gpu2
              };

        this.updateFanData();


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
