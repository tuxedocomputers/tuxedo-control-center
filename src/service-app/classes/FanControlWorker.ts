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

import { TuxedoWMIAPI as wmiAPI, IFanInfo, TuxedoWMIAPI } from '../../native-lib/TuxedoWMIAPI';
import { FanControlLogic } from './FanControlLogic';

export class FanControlWorker extends DaemonWorker {

    private fans: Map<number, FanControlLogic>;
    private cpuLogic = new FanControlLogic(this.tccd.getCurrentFanProfile());
    private gpu1Logic = new FanControlLogic(this.tccd.getCurrentFanProfile());
    private gpu2Logic = new FanControlLogic(this.tccd.getCurrentFanProfile());

    private controlAvailableMessage = false;

    constructor(tccd: TuxedoControlCenterDaemon) {
        super(1000, tccd);

        // Map logic to fan number
        this.fans = new Map();
        this.fans.set(1, this.cpuLogic);
        this.fans.set(2, this.gpu1Logic);
        this.fans.set(3, this.gpu2Logic);
    }

    public onStart(): void {
        const profile = this.tccd.getCurrentProfile();
        let useFanControl;
        if (profile.fan === undefined || profile.fan.useControl === undefined || profile.fan.fanProfile === undefined) {
            useFanControl = this.tccd.getDefaultProfile().fan.useControl;
        } else {
            useFanControl = profile.fan.useControl;
        }

        if (!useFanControl) {
            // Stop TCC fan control for all fans
            wmiAPI.setFanAuto(true, true, true, true);
        }
    }

    public onWork(): void {
        const fanTemps: number[] = [];
        const fanSpeeds: number[] = [];
        const fanTimestamps: number[] = [];

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
            const fanInfo: IFanInfo = { speed: 0, temp1: 1, temp2: 1 };
            const result = wmiAPI.getFanInfo(fanNumber, fanInfo);
            const currentTemperature = fanInfo.temp2; // Temp2 hardcoded, note: temp1 is not used for gpu fans
            const currentSpeed = Math.round((fanInfo.speed / 0xff) * 100);
            fanTimestamps.push(Date.now());
            fanTemps.push(currentTemperature);
            fanSpeeds.push(currentSpeed);
            if (result === false) {
                this.tccd.logLine('FanControlWorker: Failed to read fan (' + fanNumber + ') fan info');
                continue;
            }
            if (currentTemperature === -1) {
                this.tccd.logLine('FanControlWorker: Failed to read fan (' + fanNumber + ') temperature');
                continue;
            }
            if (currentTemperature === 1) {
                // Probably not supported, do nothing
                continue;
            }
            fanLogic.reportTemperature(currentTemperature);
            if (useFanControl) {
                const calculatedSpeed = fanLogic.getSpeedPercent();
                fanSpeeds[fanNumber - 1] = calculatedSpeed;
            } else {
                fanSpeeds[fanNumber - 1] = currentSpeed;
            }
        }

        if (useFanControl) {
            wmiAPI.setFanSpeedByte(
                fanSpeeds[0] * 0xff / 100,
                fanSpeeds[1] * 0xff / 100,
                fanSpeeds[2] * 0xff / 100,
                1
            );
        }

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
        wmiAPI.setFanAuto(true, true, true, true);
    }
}
