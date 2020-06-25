/*!
 * Copyright (c) 2019-2020 TUXEDO Computers GmbH <tux@tuxedocomputers.com>
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

import { TuxedoWMIAPI as wmiAPI, TuxedoWMIAPI, ObjWrapper, ModuleInfo } from '../../native-lib/TuxedoWMIAPI';
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
        const nrFans = wmiAPI.getNumberFans();

        // Map logic to fan number
        this.fans = new Map();
        if (nrFans >= 1) { this.fans.set(1, this.cpuLogic); }
        if (nrFans >= 2) { this.fans.set(2, this.gpu1Logic); }
        if (nrFans >= 3) { this.fans.set(3, this.gpu2Logic); }
    }

    public onStart(): void {
        const profile = this.tccd.getCurrentProfile();
        let useFanControl;
        if (profile.fan === undefined || profile.fan.useControl === undefined || profile.fan.fanProfile === undefined) {
            useFanControl = this.tccd.getDefaultProfile().fan.useControl;
        } else {
            useFanControl = profile.fan.useControl;
        }

        wmiAPI.setEnableModeSet(true);

        if (!useFanControl) {
            // Stop TCC fan control for all fans
            wmiAPI.setFansAuto();
        }
    }

    public onWork(): void {
        const fanTemps: number[] = [];
        const fanSpeeds: number[] = [];
        const fanTimestamps: number[] = [];

        const moduleInfo = new ModuleInfo();

        if (!TuxedoWMIAPI.wmiAvailable()) {
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

        // Decide on a fan control approach
        // Per default fans are controlled individually depending on temp sensor and their chosen logic
        wmiAPI.getModuleInfo(moduleInfo);
        // Use 'same speed' approach for uniwill devices. Necessary since the fans on some
        // devices can not be controlled individually.
        if (moduleInfo.activeInterface === 'uniwill') {
            this.modeSameSpeed = true;
        }

        const profile = this.tccd.getCurrentProfile();
        let useFanControl;
        if (profile.fan === undefined || profile.fan.useControl === undefined || profile.fan.fanProfile === undefined) {
            useFanControl = this.tccd.getDefaultProfile().fan.useControl;
        } else {
            useFanControl = profile.fan.useControl;
        }

        for (const fanNumber of this.fans.keys()) {
            // Update fan profile
            this.fans.get(fanNumber).setFanProfile(this.tccd.getCurrentFanProfile());

            const fanLogic = this.fans.get(fanNumber);

            const currentTemperatureCelcius: ObjWrapper<number> = { value: 0 };
            const tempReadSuccess = wmiAPI.getFanTemperature(fanNumber - 1, currentTemperatureCelcius);
            const currentSpeedPercent: ObjWrapper<number> = { value: 0 };
            const speedReadSuccess = wmiAPI.getFanSpeedPercent(fanNumber - 1, currentSpeedPercent);

            fanTimestamps.push(Date.now());
            fanTemps.push(currentTemperatureCelcius.value);
            fanSpeeds.push(currentSpeedPercent.value);

            if (!tempReadSuccess) {
                // Invalid sensor value or wmi interface unavailable
                continue;
            }

            fanLogic.reportTemperature(currentTemperatureCelcius.value);
            if (useFanControl) {
                const calculatedSpeed = fanLogic.getSpeedPercent();
                fanSpeeds[fanNumber - 1] = calculatedSpeed;
            } else {
                fanSpeeds[fanNumber - 1] = currentSpeedPercent.value;
            }

        }

        // Write fan speeds
        if (useFanControl) {
            const highestSpeed = fanSpeeds.reduce((prev, cur) => cur > prev ? cur : prev, 0);
            for (const fanNumber of this.fans.keys()) {
                if (this.modeSameSpeed) { fanSpeeds[fanNumber - 1] = highestSpeed; }
                wmiAPI.setFanSpeedPercent(fanNumber - 1, fanSpeeds[fanNumber - 1]);
            }
        }

        // Publish the data on the dbus weather written by this control or values read from hw interface
        for (const fanNumber of this.fans.keys()) {
            const i = fanNumber - 1;
            if (fanSpeeds[i] !== undefined) {
                this.tccd.dbusData.fans[i].temp.set(fanTimestamps[i], fanTemps[i]);
                this.tccd.dbusData.fans[i].speed.set(fanTimestamps[i], fanSpeeds[i]);
            }
        }
    }

    public onExit(): void {
        // Stop TCC fan control for all fans
        wmiAPI.setFansAuto();
        wmiAPI.setEnableModeSet(false);
    }
}
