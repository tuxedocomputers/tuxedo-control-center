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

/* 
########################################################
############## DBUS Backend #########################
########################################################
*/

import  { DbusAPIFunctions } from '../../common/models/IDbusAPI'
import * as dbus from 'dbus-next';
import { TDPInfo } from '../../native-lib/TuxedoIOAPI';
import { ChargeType } from '../../common/classes/PowerSupplyController';

class TccDBusController {
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
// TODO
    async dbusAvailable(): Promise<boolean> {
        try {
            // Try one method to check connection
            await this.interface.TuxedoWmiAvailable();
            return true;
        } catch (err) {
            return false;
        }
    }
// TODO does the same as other method lol beinahe
    async tuxedoWmiAvailable(): Promise<boolean> {
        try {
            return await this.interface.TuxedoWmiAvailable();
        } catch (err) {
            return false;
        }
    }

    async fanHwmonAvailable(): Promise<boolean> {
        try {
            return await this.interface.FanHwmonAvailable();
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

    async getDeviceJSON(): Promise<string> {
        try {
            return await this.interface.GetDeviceName();
        } catch (err) {
            return '';
        }
    }

    async getFanDataJSON(): Promise<string> {
        return this.interface.GetFanDataJSON();
    }


    async getDisplayModesJSON(): Promise<string>
    {
        try {
            return await this.interface.GetDisplayModesJSON();
        } catch (err) {
            return undefined; 
        }
    }

    async getIsX11():Promise<boolean>
    {
        try {
            return await this.interface.GetIsX11();
        } catch (err) {
            return false; 
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

    async getDGpuInfoValuesJSON(): Promise<string> {
        try {
            return await this.interface.GetDGpuInfoValuesJSON();
        } catch (err) {
            return undefined;
        }
    }

    async getIGpuInfoValuesJSON(): Promise<string> {
        try {
            return await this.interface.GetIGpuInfoValuesJSON();
        } catch (err) {
            return undefined;
        }
    }

    async getCpuPowerValuesJSON(): Promise<string> {
        try {
            return await this.interface.GetCpuPowerValuesJSON();
        } catch (err) {
            return undefined;
        }
    }

    async getPrimeState(): Promise<string> {
        try {
            return await this.interface.GetPrimeState();
        } catch (err) {
            return undefined;
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

    async getSettingsJSON(): Promise<string> {
        try {
            return await this.interface.GetSettingsJSON();
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

    async odmPowerLimitsJSON(): Promise<string> {
        try {
            return await this.interface.ODMPowerLimitsJSON();
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

    async getChargeStartAvailableThresholds(): Promise<number[]> {
        try {
            return JSON.parse(await this.interface.GetChargeStartAvailableThresholds());
        } catch (err) {
            return [];
        }
    }

    async getChargeEndAvailableThresholds(): Promise<number[]> {
        try {
            return JSON.parse(await this.interface.GetChargeEndAvailableThresholds());
        } catch (err) {
            return [];
        }
    }

    async getChargeStartThreshold(): Promise<number> {
        try {
            return await this.interface.GetChargeStartThreshold();
        } catch (err) {
            return undefined;
        }
    }

    async setChargeStartThreshold(value: number): Promise<boolean> {
        try {
            return await this.interface.SetChargeStartThreshold(value);
        } catch (err) {
            return false;
        }
    }

    async getChargeEndThreshold(): Promise<number> {
        try {
            return await this.interface.GetChargeEndThreshold();
        } catch (err) {
            return undefined;
        }
    }

    async setChargeEndThreshold(value: number): Promise<boolean> {
        try {
            return await this.interface.SetChargeEndThreshold(value);
        } catch (err) {
            return false;
        }
    }

    async getChargeType(): Promise<string> {
        try {
            return await this.interface.GetChargeType();
        } catch (err) {
            return ChargeType.Unknown.toString();
        }
    }

    async setChargeType(chargeType: ChargeType): Promise<boolean> {
        try {
            return await this.interface.SetChargeType(chargeType);
        } catch (err) {
            return false;
        }
    }

    async getFnLockSupported(): Promise<boolean> {
        try {
            return await this.interface.GetFnLockSupported();
        } catch (err) {
            return false;
        }
    }

    async getFnLockStatus(): Promise<boolean> {
        try {
            return await this.interface.GetFnLockStatus();
        } catch (err) {
            return false;
        }
    }

    async setFnLockStatus(status: boolean): Promise<boolean> {
        try {
            return await this.interface.SetFnLockStatus(status);
        } catch (err) {
            return false;
        }
    }

    async setSensorDataCollectionStatus(status: boolean): Promise<boolean> {
        try {
            return await this.interface.SetSensorDataCollectionStatus(status);
        } catch (err) {
            return false;
        }
    }

    async getSensorDataCollectionStatus(): Promise<boolean> {
        try {
            return await this.interface.GetSensorDataCollectionStatus();
        } catch (err) {
            return false;
        }
    }

    async setDGpuD0Metrics(status: boolean): Promise<boolean> {
        try {
            return await this.interface.SetDGpuD0Metrics(status);
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

// TODO how do we solve this problem?
// because now main.ts and this file here use sepparate dbuscontrollers
// maybe export the variable? does that work? it's a single process anyway??
export const tccDBus = new TccDBusController();
tccDBus.init();

export const dbusHandlers = new Map<string, (...args: any[]) => any>()
    .set(DbusAPIFunctions.getVersion, async () => { 
        return new Promise<string>((resolve, reject) => {
            resolve(tccDBus.tccdVersion());
        });
    })

    .set(DbusAPIFunctions.tuxedoWmiAvailable, async () => { 
        return new Promise<boolean>((resolve, reject) => {
            resolve(tccDBus.tuxedoWmiAvailable());
        });
    })

    .set(DbusAPIFunctions.getFanData, async () => { 
        return new Promise<string>((resolve, reject) => {
            resolve(tccDBus.getFanDataJSON());
        });
    })

    .set(DbusAPIFunctions.webcamSWAvailable, async () => { 
        return new Promise<boolean>((resolve, reject) => {
            resolve(tccDBus.webcamSWAvailable());
        });
    })

    .set(DbusAPIFunctions.getForceYUV420OutputSwitchAvailable, async () => { 
        return new Promise<boolean>((resolve, reject) => {
            resolve(tccDBus.getForceYUV420OutputSwitchAvailable());
        });
    })

    .set(DbusAPIFunctions.consumeModeReapplyPending, async () => { 
        return new Promise<boolean>((resolve, reject) => {
            resolve(tccDBus.consumeModeReapplyPending());
        });
    })

    .set(DbusAPIFunctions.getActiveProfileJSON, async () => { 
        return new Promise<string>((resolve, reject) => {
            resolve(tccDBus.getActiveProfileJSON());
        });
    })

    .set(DbusAPIFunctions.setTempProfileById, async (profileId) => { 
        return new Promise<boolean>((resolve, reject) => {
            resolve(tccDBus.setTempProfileById(profileId));
        });
    })

    .set(DbusAPIFunctions.getProfilesJSON, async () => { 
        return new Promise<string>((resolve, reject) => {
            resolve(tccDBus.getProfilesJSON());
        });
    })

    .set(DbusAPIFunctions.getCustomProfilesJSON, async () => { 
        return new Promise<string>((resolve, reject) => {
            resolve(tccDBus.getCustomProfilesJSON());
        });
    })

    .set(DbusAPIFunctions.getDefaultProfilesJSON, async () => { 
        return new Promise<string>((resolve, reject) => {
            resolve(tccDBus.getDefaultProfilesJSON());
        });
    })

    .set(DbusAPIFunctions.getDefaultValuesProfileJSON, async () => { 
        return new Promise<string>((resolve, reject) => {
            resolve(tccDBus.getDefaultValuesProfileJSON());
        });
    })

    .set(DbusAPIFunctions.getSettingsJSON, async () => { 
        return new Promise<string>((resolve, reject) => {
            resolve(tccDBus.getSettingsJSON());
        });
    })

    .set(DbusAPIFunctions.odmProfilesAvailable, async () => { 
        return new Promise<string[]>((resolve, reject) => {
            resolve(tccDBus.odmProfilesAvailable());
        });
    })

    .set(DbusAPIFunctions.odmPowerLimitsJSON, async () => { 
        return new Promise<string>((resolve, reject) => {
            resolve(tccDBus.odmPowerLimitsJSON());
        });
    })

    .set(DbusAPIFunctions.getKeyboardBacklightCapabilitiesJSON, async () => { 
        return new Promise<string>((resolve, reject) => {
            resolve(tccDBus.getKeyboardBacklightCapabilitiesJSON());
        });
    })

    .set(DbusAPIFunctions.getKeyboardBacklightStatesJSON, async () => { 
        return new Promise<string>((resolve, reject) => {
            resolve(tccDBus.getKeyboardBacklightStatesJSON());
        });
    })

    .set(DbusAPIFunctions.setKeyboardBacklightStatesJSON, async (keyboardBacklightStatesJSON) => { 
        return new Promise<boolean>((resolve, reject) => {
            resolve(tccDBus.setKeyboardBacklightStatesJSON(keyboardBacklightStatesJSON));
        });
    })

    .set(DbusAPIFunctions.getFansMinSpeed, async () => { 
        return new Promise<number>((resolve, reject) => {
            resolve(tccDBus.getFansMinSpeed());
        });
    })

    .set(DbusAPIFunctions.getFansOffAvailable, async () => { 
        return new Promise<boolean>((resolve, reject) => {
            resolve(tccDBus.getFansOffAvailable());
        });
    })

    .set(DbusAPIFunctions.getChargingProfilesAvailable, async () => { 
        return new Promise<string[]>((resolve, reject) => {
            resolve(tccDBus.getChargingProfilesAvailable());
        });
    })

    .set(DbusAPIFunctions.getCurrentChargingProfile, async () => { 
        return new Promise<string>((resolve, reject) => {
            resolve(tccDBus.getCurrentChargingProfile());
        });
    })

    .set(DbusAPIFunctions.setChargingProfile, async (profileDescriptor) => { 
        return new Promise<boolean>((resolve, reject) => {
            resolve(tccDBus.setChargingProfile(profileDescriptor));
        });
    })

    .set(DbusAPIFunctions.getChargingPrioritiesAvailable, async () => { 
        return new Promise<string[]>((resolve, reject) => {
            resolve(tccDBus.getChargingPrioritiesAvailable());
        });
    })

    .set(DbusAPIFunctions.getCurrentChargingPriority, async () => { 
        return new Promise<string>((resolve, reject) => {
            resolve(tccDBus.getCurrentChargingPriority());
        });
    })

    .set(DbusAPIFunctions.setChargingPriority, async (priorityDescriptor) => { 
        return new Promise<boolean>((resolve, reject) => {
            resolve(tccDBus.setChargingPriority(priorityDescriptor));
        });
    })

    .set(DbusAPIFunctions.getDGpuInfoValuesJSON, async () => { 
        return new Promise<string>((resolve, reject) => {
            resolve(tccDBus.getDGpuInfoValuesJSON());
        });
    })

    .set(DbusAPIFunctions.getIGpuInfoValuesJSON, async () => { 
        return new Promise<string>((resolve, reject) => {
            resolve(tccDBus.getIGpuInfoValuesJSON());
        });
    })

    .set(DbusAPIFunctions.getSensorDataCollectionStatus, async () => { 
        return new Promise<boolean>((resolve, reject) => {
            resolve(tccDBus.getSensorDataCollectionStatus());
        });
    })

    .set(DbusAPIFunctions.getPrimeState, async () => { 
        return new Promise<string>((resolve, reject) => {
            resolve(tccDBus.getPrimeState());
        });
    })

    .set(DbusAPIFunctions.getCpuPowerValuesJSON, async () => { 
        return new Promise<string>((resolve, reject) => {
            resolve(tccDBus.getCpuPowerValuesJSON());
        });
    })

    .set(DbusAPIFunctions.getDisplayModesJSON, async () => { 
        return new Promise<string>((resolve, reject) => {
            resolve(tccDBus.getDisplayModesJSON());
        });
    })

    .set(DbusAPIFunctions.getIsX11, async () => { 
        return new Promise<boolean>((resolve, reject) => {
            resolve(tccDBus.getIsX11());
        });
    })

    .set(DbusAPIFunctions.setSensorDataCollectionStatus, async (status) => { 
        return new Promise<boolean>((resolve, reject) => {
            resolve(tccDBus.setSensorDataCollectionStatus(status));
        });
    })

    .set(DbusAPIFunctions.setDGpuD0Metrics, async (status) => { 
        return new Promise<boolean>((resolve, reject) => {
            resolve(tccDBus.setDGpuD0Metrics(status));
        });
    })

    .set(DbusAPIFunctions.getChargeStartAvailableThresholds, async () => { 
        return new Promise<number[]>((resolve, reject) => {
            resolve(tccDBus.getChargeStartAvailableThresholds());
        });
    })

    .set(DbusAPIFunctions.getChargeEndAvailableThresholds, async () => { 
        return new Promise<number[]>((resolve, reject) => {
            resolve(tccDBus.getChargeEndAvailableThresholds());
        });
    })

    .set(DbusAPIFunctions.getChargeStartThreshold, async () => { 
        return new Promise<number>((resolve, reject) => {
            resolve(tccDBus.getChargeStartThreshold());
        });
    })

    .set(DbusAPIFunctions.getChargeEndThreshold, async () => { 
        return new Promise<number>((resolve, reject) => {
            resolve(tccDBus.getChargeEndThreshold());
        });
    })

    .set(DbusAPIFunctions.getChargeType, async () => { 
        return new Promise<string>((resolve, reject) => {
            resolve(tccDBus.getChargeType());
        });
    })

    .set(DbusAPIFunctions.setChargeStartThreshold, async (newValue) => { 
        return new Promise<boolean>((resolve, reject) => {
            resolve(tccDBus.setChargeStartThreshold(newValue));
        });
    })

    .set(DbusAPIFunctions.setChargeEndThreshold, async (newValue) => { 
        return new Promise<boolean>((resolve, reject) => {
            resolve(tccDBus.setChargeEndThreshold(newValue));
        });
    })


    .set(DbusAPIFunctions.setChargeType, async (chargeType) => { 
        return new Promise<boolean>((resolve, reject) => {
            resolve(tccDBus.setChargeType(chargeType));
        });
    })


    .set(DbusAPIFunctions.dbusAvailable, async () => { 
        return new Promise<boolean>((resolve, reject) => {
            resolve(tccDBus.dbusAvailable());
        });
    })

    .set(DbusAPIFunctions.fanHwmonAvailable, async () => { 
        return new Promise<boolean>((resolve, reject) => {
            resolve(tccDBus.fanHwmonAvailable());
        });
    })

    .set(DbusAPIFunctions.getWebcamSWStatus, async () => { 
        return new Promise<boolean>((resolve, reject) => {
            resolve(tccDBus.getWebcamSWStatus());
        });
    })

    .set(DbusAPIFunctions.getDeviceJSON, async () => { 
        return new Promise<string>((resolve, reject) => {
            resolve(tccDBus.getDeviceJSON());
        });
    });

