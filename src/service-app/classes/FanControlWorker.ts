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
import { DaemonWorker } from './DaemonWorker';
import { TuxedoControlCenterDaemon } from './TuxedoControlCenterDaemon';

import { TuxedoIOAPI as ioAPI, TuxedoIOAPI, ObjWrapper, ModuleInfo } from '../../native-lib/TuxedoIOAPI';
import { FanControlLogic, FAN_LOGIC } from './FanControlLogic';

export class FanControlWorker extends DaemonWorker {

    private fans: Map<number, FanControlLogic>;
    private cpuLogic = new FanControlLogic(this.tccd.getCurrentFanProfile(), FAN_LOGIC.CPU);
    private gpu1Logic = new FanControlLogic(this.tccd.getCurrentFanProfile(), FAN_LOGIC.GPU);
    private gpu2Logic = new FanControlLogic(this.tccd.getCurrentFanProfile(), FAN_LOGIC.GPU);

    private controlAvailableMessage = false;

    private modeSameSpeed = false;

    constructor(tccd: TuxedoControlCenterDaemon) {
        super(1000, tccd);
    }

    private initFanControl(): void {
        const nrFans = ioAPI.getNumberFans();

        if (this.fans === undefined || this.fans.size !== nrFans) {

            // Map logic to fan number
            this.fans = new Map();
            if (nrFans >= 1) { this.fans.set(1, this.cpuLogic); }
            if (nrFans >= 2) { this.fans.set(2, this.gpu1Logic); }
            if (nrFans >= 3) { this.fans.set(3, this.gpu2Logic); }
        }
    }

    public onStart(): void {
        this.initFanControl();

        const useFanControl = this.getFanControlStatus();

        if (this.tccd.settings.fanControlEnabled) {
            ioAPI.setEnableModeSet(true); //FIXME Dummy function, tuxedo-io always sets the manual bit

            if (!useFanControl) { //FIXME Dummy variable, useFanControl always true
                // Stop TCC fan control for all fans
                ioAPI.setFansAuto();
            }
        }
    }

    public onWork(): void {
        this.initFanControl(); // Make sure structures are up to date before doing anything

        const fanTemps: number[] = [];
        const fanSpeedsRead: number[] = [];
        const fanSpeedsSet: number[] = new Array<number>(this.fans.size);
        const fanTimestamps: number[] = [];
        const tempSensorAvailable: boolean[] = [];

        const moduleInfo = new ModuleInfo();

        if (!TuxedoIOAPI.wmiAvailable()) {
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
            // Update fan profile
            this.fans.get(fanNumber).setFanProfile(this.tccd.getCurrentFanProfile());
            this.fans.get(fanNumber).minimumFanspeed = this.tccd.getCurrentProfile().fan.minimumFanspeed;

            const fanLogic = this.fans.get(fanNumber);

            // Read and store sensor values
            const currentTemperatureCelcius: ObjWrapper<number> = { value: 0 };
            const tempReadSuccess = ioAPI.getFanTemperature(fanIndex, currentTemperatureCelcius);
            const currentSpeedPercent: ObjWrapper<number> = { value: 0 };
            const speedReadSuccess = ioAPI.getFanSpeedPercent(fanIndex, currentSpeedPercent);

            tempSensorAvailable.push(tempReadSuccess);
            fanTimestamps.push(Date.now());
            fanSpeedsRead.push(currentSpeedPercent.value);
            if (tempSensorAvailable[fanIndex]) {
                fanTemps.push(currentTemperatureCelcius.value);
            } else {
                fanTemps.push(0);
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

        // Publish the data on the dbus whether written by this control or values read from hw interface
        for (const fanNumber of this.fans.keys()) {
            const i = fanNumber - 1;
            let currentSpeed: number;
            if (useFanControl) {
                currentSpeed = fanSpeedsSet[i];
            } else {
                currentSpeed = fanSpeedsRead[i];
            }
            this.tccd.dbusData.fans[i].temp.set(fanTimestamps[i], fanTemps[i]);
            this.tccd.dbusData.fans[i].speed.set(fanTimestamps[i], currentSpeed);
        }
    }

    public onExit(): void {
        // Stop TCC fan control for all fans
        if (this.getFanControlStatus()) {
            ioAPI.setFansAuto();
            ioAPI.setEnableModeSet(false);  //FIXME Dummy function, tuxedo-io always sets the manual bit
        }
    }

    private getFanControlStatus(): boolean {
        return this.tccd.settings.fanControlEnabled;
    }
}
