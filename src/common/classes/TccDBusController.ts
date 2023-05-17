/*!
 * Copyright (c) 2019-2022 TUXEDO Computers GmbH <tux@tuxedocomputers.com>
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
import * as dbus from 'dbus-next';
import { FanData } from '../../service-app/classes/TccDBusInterface';
import { TDPInfo } from '../../native-lib/TuxedoIOAPI';
import { IDisplayFreqRes, IDisplayMode } from '../models/DisplayFreqRes';

export class TccDBusController {
    private busName = 'com.tuxedocomputers.tccd';
    private path = '/com/tuxedocomputers/tccd';
    private interfaceName = 'com.tuxedocomputers.tccd';
    private bus: dbus.MessageBus;
    private interface: dbus.ClientInterface;

    constructor() {
        this.bus = dbus.systemBus();
    }

    async init(): Promise<boolean> {
        try {
            const proxyObject = await this.bus.getProxyObject(this.busName, this.path);
            this.interface = proxyObject.getInterface(this.interfaceName);
            return true;
        } catch (err) {
            return false;
        }
    }

    async dbusAvailable(): Promise<boolean> {
        try {
            // Try one method to check connection
            await this.interface.TuxedoWmiAvailable();
            return true;
        } catch (err) {
            return false;
        }
    }

    async tuxedoWmiAvailable(): Promise<boolean> {
        try {
            return await this.interface.TuxedoWmiAvailable();
        } catch (err) {
            return false;
        }
    }

    async tccdVersion(): Promise<string> {
        try {
            return await this.interface.TccdVersion();
        } catch (err) {
            return '';
        }
    }

    async getFanDataCPU(): Promise<FanData> {
        try {
            return await this.interface.GetFanDataCPU();
        } catch (err) {
            return new FanData();
        }
    }

    async getFanDataGPU1(): Promise<FanData> {
        try {
            return await this.interface.GetFanDataGPU1();
        } catch (err) {
            return new FanData();
        }
    }

    async getDisplayModesJSON(): Promise<string>
    {
        try {
            return await this.interface.GetDisplayModesJSON();
        } catch (err) {
            return ""; 
        }
    }

    async getFanDataGPU2(): Promise<FanData> {
        try {
            return await this.interface.GetFanDataGPU2();
        } catch (err) {
            return new FanData();
        }
    }

    async webcamSWAvailable(): Promise<boolean> {
        try {
            return await this.interface.WebcamSWAvailable();
        } catch (err) {
            return false;
        }
    }

    async getWebcamSWStatus(): Promise<boolean> {
        try {
            return await this.interface.GetWebcamSWStatus();
        } catch (err) {
            return false;
        }
    }

    async getForceYUV420OutputSwitchAvailable(): Promise<boolean> {
        try {
            return await this.interface.GetForceYUV420OutputSwitchAvailable();
        } catch (err) {
            return false;
        }
    }

    async consumeModeReapplyPending(): Promise<boolean> {
        try {
            return await this.interface.ConsumeModeReapplyPending();
        } catch (err) {
            return false;
        }
    }

    async getActiveProfileJSON(): Promise<string> {
        try {
            return await this.interface.GetActiveProfileJSON();
        } catch (err) {
            return undefined;
        }
    }

    async setTempProfileName(profileName: string): Promise<boolean> {
        try {
            return await this.interface.SetTempProfile(profileName);
        } catch (err) {
            return false;
        }
    }

    async setTempProfileById(profileId: string): Promise<boolean> {
        try {
            return await this.interface.SetTempProfileById(profileId);
        } catch (err) {
            return false;
        }
    }

    async getProfilesJSON(): Promise<string> {
        try {
            return await this.interface.GetProfilesJSON();
        } catch (err) {
            return undefined;
        }
    }

    async getCustomProfilesJSON(): Promise<string> {
        try {
            return await this.interface.GetCustomProfilesJSON();
        } catch (err) {
            return undefined;
        }
    }

    async getDefaultProfilesJSON(): Promise<string> {
        try {
            return await this.interface.GetDefaultProfilesJSON();
        } catch (err) {
            return undefined;
        }
    }

    async getDefaultValuesProfileJSON(): Promise<string> {
        try {
            return await this.interface.GetDefaultValuesProfileJSON();
        } catch (err) {
            return undefined;
        }
    }

    async odmProfilesAvailable(): Promise<string[]> {
        try {
            return await this.interface.ODMProfilesAvailable();
        } catch (err) {
            return undefined;
        }
    }

    async odmPowerLimits(): Promise<TDPInfo[]> {
        try {
            return JSON.parse(await this.interface.ODMPowerLimitsJSON());
        } catch (err) {
            return undefined;
        }
    }

    async getKeyboardBacklightCapabilitiesJSON(): Promise<string> {
        try {
            return await this.interface.GetKeyboardBacklightCapabilitiesJSON();
        } catch (err) {
            return undefined;
        }
    }

    async getKeyboardBacklightStatesJSON(): Promise<string> {
        try {
            return await this.interface.GetKeyboardBacklightStatesJSON();
        } catch (err) {
            return undefined;
        }
    }

    async setKeyboardBacklightStatesJSON(keyboardBacklightStatesJSON: string): Promise<boolean> {
        try {
            return await this.interface.SetKeyboardBacklightStatesJSON(keyboardBacklightStatesJSON);
        } catch (err) {
            return undefined;
        }
    }

    async getFansMinSpeed(): Promise<number> {
        try {
            return await this.interface.GetFansMinSpeed();
        } catch (err) {
            return undefined;
        }
    }

    async getFansOffAvailable(): Promise<boolean> {
        try {
            return await this.interface.GetFansOffAvailable();
        } catch (err) {
            return undefined;
        }
    }

    async getChargingProfilesAvailable(): Promise<string[]> {
        try {
            return JSON.parse(await this.interface.GetChargingProfilesAvailable());
        } catch (err) {
            return [];
        }
    }

    async getCurrentChargingProfile(): Promise<string> {
        try {
            return await this.interface.GetCurrentChargingProfile();
        } catch (err) {
            return '';
        }
    }

    async setChargingProfile(profileDescriptor: string): Promise<boolean> {
        try {
            return await this.interface.SetChargingProfile(profileDescriptor);
        } catch (err) {
            return false;
        }
    }

    async getChargingPrioritiesAvailable(): Promise<string[]> {
        try {
            return JSON.parse(await this.interface.GetChargingPrioritiesAvailable());
        } catch (err) {
            return [];
        }
    }

    async getCurrentChargingPriority(): Promise<string> {
        try {
            return await this.interface.GetCurrentChargingPriority();
        } catch (err) {
            return '';
        }
    }

    async setChargingPriority(priorityDescriptor: string): Promise<boolean> {
        try {
            return await this.interface.SetChargingPriority(priorityDescriptor);
        } catch (err) {
            return false;
        }
    }

    onModeReapplyPendingChanged(callback_function) {
        this.interface.on('ModeReapplyPendingChanged', callback_function);
    }

    disconnect(): void {
        this.bus.disconnect();
    }
}
