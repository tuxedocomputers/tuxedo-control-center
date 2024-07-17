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
import { tccWindow } from './browserWindows';


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
        } catch (err: unknown) {
            console.error("dbusBackendAPI: init failed =>", err)
            return false;
        }
    }

    async dbusAvailable(): Promise<boolean> {
        try {
            // Try one method to check connection
            await this.interface.TuxedoWmiAvailable();
            return true;
        } catch (err: unknown) {
            console.error("dbusBackendAPI: dbusAvailable failed =>", err)
            return false;
        }
    }


    async getNVIDIAPowerCTRLDefaultPowerLimit(): Promise<number> {
        await this.dbusErrorHandling();
        try {
            return await this.interface.GetNVIDIAPowerCTRLDefaultPowerLimit();
        } catch (err) {
            return undefined;
        }
    }

    async getHideCTGP(): Promise <boolean> {
        await this.dbusErrorHandling();
        try {
            return await this.interface.DeviceHideCTGP();
        } catch (err) {
            return undefined;
        }
    }

    async getNVIDIAPowerCTRLMaxPowerLimit(): Promise<number> {
        await this.dbusErrorHandling();
        try {
            return await this.interface.GetNVIDIAPowerCTRLMaxPowerLimit();
        } catch (err) {
            return undefined;
        }
    }

    async getNVIDIAPowerCTRLAvailable(): Promise<boolean> {
        await this.dbusErrorHandling();
        try {
            return await this.interface.GetNVIDIAPowerCTRLAvailable();
        } catch (err) {
            return false;
        }
    }

    async tuxedoWmiAvailable(): Promise<boolean> {
        try {
            return await this.interface.TuxedoWmiAvailable();
        } catch (err: unknown) {
            console.error("dbusBackendAPI: tuxedoWmiAvailable failed =>", err)
            return false;
        }
    }

    // checks if dbus is still alive and if it's not sends message to render process to display an error message
    // future implementations might try to restart the dbus a couple of times first
    private async dbusErrorHandling() {
        if (!(await this.dbusAvailable())) {
            // await setTimeout(async () => {
            //     if(!(await this.dbusAvailable())) {
            //         tccWindow.webContents.send('dbus-died');
            //     }
            // }, 2000);
            tccWindow.webContents.send('dbus-died');
        }
    }

    async fanHwmonAvailable(): Promise<boolean> {
        await this.dbusErrorHandling();
        try {
            return await this.interface.FanHwmonAvailable();
        } catch (err: unknown) {
            console.error("dbusBackendAPI: fanHwmonAvailable failed =>", err)
            return false;
        }
    }

    async deviceHasAquaris(): Promise<boolean> {
        await this.dbusErrorHandling();
        try {
            return await this.interface.DeviceHasAquaris();
        } catch (err: unknown) {
            console.error("dbusBackendAPI: deviceHasAquaris failed =>", err)
            return false;
        }
    }

    async tccdVersion(): Promise<string> {
        await this.dbusErrorHandling();
        try {
            return await this.interface.TccdVersion();
        } catch (err: unknown) {
            console.error("dbusBackendAPI: tccdVersion failed =>", err)
            return '';
        }
    }

    async getDeviceJSON(): Promise<string> {
        await this.dbusErrorHandling();
        try {
            return await this.interface.GetDeviceName();
        } catch (err: unknown) {
            console.error("dbusBackendAPI: getDeviceJSON failed =>", err)
            return '';
        }
    }

    async getFanDataJSON(): Promise<string> {
        await this.dbusErrorHandling();
        return this.interface.GetFanDataJSON();
    }


    async getDisplayModesJSON(): Promise<string> {
        await this.dbusErrorHandling();
        try {
            return await this.interface.GetDisplayModesJSON();
        } catch (err: unknown) {
            console.error("dbusBackendAPI: getDisplayModesJSON failed =>", err)
            return undefined;
        }
    }

    async getIsX11():Promise<boolean> {
        await this.dbusErrorHandling();
        try {
            return await this.interface.GetIsX11();
        } catch (err: unknown) {
            console.error("dbusBackendAPI: getIsX11 failed =>", err)
            return false;
        }
    }


    async webcamSWAvailable(): Promise<boolean> {
        await this.dbusErrorHandling();
        try {
            return await this.interface.WebcamSWAvailable();
        } catch (err: unknown) {
            console.error("dbusBackendAPI: webcamSWAvailable failed =>", err)
            return false;
        }
    }

    async getWebcamSWStatus(): Promise<boolean> {
        await this.dbusErrorHandling();
        try {
            return await this.interface.GetWebcamSWStatus();
        } catch (err: unknown) {
            console.error("dbusBackendAPI: getWebcamSWStatus failed =>", err)
            return false;
        }
    }

    async getForceYUV420OutputSwitchAvailable(): Promise<boolean> {
        await this.dbusErrorHandling();
        try {
            return await this.interface.GetForceYUV420OutputSwitchAvailable();
        } catch (err: unknown) {
            console.error("dbusBackendAPI: getForceYUV420OutputSwitchAvailable failed =>", err)
            return false;
        }
    }

    async getDGpuInfoValuesJSON(): Promise<string> {
        await this.dbusErrorHandling();
        try {
            return await this.interface.GetDGpuInfoValuesJSON();
        } catch (err: unknown) {
            console.error("dbusBackendAPI: getDGpuInfoValuesJSON failed =>", err)
            return undefined;
        }
    }

    async getIGpuInfoValuesJSON(): Promise<string> {
        await this.dbusErrorHandling();
        try {
            return await this.interface.GetIGpuInfoValuesJSON();
        } catch (err: unknown) {
            console.error("dbusBackendAPI: getIGpuInfoValuesJSON failed =>", err)
            return undefined;
        }
    }

    async getCpuPowerValuesJSON(): Promise<string> {
        await this.dbusErrorHandling();
        try {
            return await this.interface.GetCpuPowerValuesJSON();
        } catch (err: unknown) {
            console.error("dbusBackendAPI: getCpuPowerValuesJSON failed =>", err)
            return undefined;
        }
    }

    async getPrimeState(): Promise<string> {
        await this.dbusErrorHandling();
        try {
            return await this.interface.GetPrimeState();
        } catch (err: unknown) {
            console.error("dbusBackendAPI: getPrimeState failed =>", err)
            return undefined;
        }
    }

    async consumeModeReapplyPending(): Promise<boolean> {
        await this.dbusErrorHandling();
        try {
            return await this.interface.ConsumeModeReapplyPending();
        } catch (err: unknown) {
            console.error("dbusBackendAPI: consumeModeReapplyPending failed =>", err)
            return false;
        }
    }

    async getActiveProfileJSON(): Promise<string> {
        await this.dbusErrorHandling();
        try {
            return await this.interface.GetActiveProfileJSON();
        } catch (err: unknown) {
            console.error("dbusBackendAPI: getActiveProfileJSON failed =>", err)
            return undefined;
        }
    }

    async setTempProfileById(profileId: string): Promise<boolean> {
        await this.dbusErrorHandling();
        try {
            return await this.interface.SetTempProfileById(profileId);
        } catch (err: unknown) {
            console.error("dbusBackendAPI: setTempProfileById failed =>", err)
            return false;
        }
    }

    async getProfilesJSON(): Promise<string> {
        await this.dbusErrorHandling();
        try {
            return await this.interface.GetProfilesJSON();
        } catch (err: unknown) {
            console.error("dbusBackendAPI: getProfilesJSON failed =>", err)
            return undefined;
        }
    }

    async getCustomProfilesJSON(): Promise<string> {
        await this.dbusErrorHandling();
        try {
            return await this.interface.GetCustomProfilesJSON();
        } catch (err: unknown) {
            console.error("dbusBackendAPI: getCustomProfilesJSON failed =>", err)
            return undefined;
        }
    }

    async getDefaultProfilesJSON(): Promise<string> {
        await this.dbusErrorHandling();
        try {
            return await this.interface.GetDefaultProfilesJSON();
        } catch (err: unknown) {
            console.error("dbusBackendAPI: getDefaultProfilesJSON failed =>", err)
            return undefined;
        }
    }

    async getDefaultValuesProfileJSON(): Promise<string> {
        await this.dbusErrorHandling();
        try {
            return await this.interface.GetDefaultValuesProfileJSON();
        } catch (err: unknown) {
            console.error("dbusBackendAPI: getDefaultValuesProfileJSON failed =>", err)
            return undefined;
        }
    }

    async getSettingsJSON(): Promise<string> {
        await this.dbusErrorHandling();
        try {
            return await this.interface.GetSettingsJSON();
        } catch (err: unknown) {
            console.error("dbusBackendAPI: getSettingsJSON failed =>", err)
            return undefined;
        }
    }

    async odmProfilesAvailable(): Promise<string[]> {
        await this.dbusErrorHandling();
        try {
            return await this.interface.ODMProfilesAvailable();
        } catch (err: unknown) {
            console.error("dbusBackendAPI: odmProfilesAvailable failed =>", err)
            return undefined;
        }
    }

    async odmPowerLimits(): Promise<TDPInfo[]> {
        await this.dbusErrorHandling();
        try {
            return JSON.parse(await this.interface.ODMPowerLimitsJSON());
        } catch (err: unknown) {
            console.error("dbusBackendAPI: odmPowerLimits failed =>", err)
            return undefined;
        }
    }

    async odmPowerLimitsJSON(): Promise<string> {
        await this.dbusErrorHandling();
        try {
            return await this.interface.ODMPowerLimitsJSON();
        } catch (err: unknown) {
            console.error("dbusBackendAPI: odmPowerLimitsJSON failed =>", err)
            return undefined;
        }
    }

    async getKeyboardBacklightCapabilitiesJSON(): Promise<string> {
        await this.dbusErrorHandling();
        try {
            return await this.interface.GetKeyboardBacklightCapabilitiesJSON();
        } catch (err: unknown) {
            console.error("dbusBackendAPI: getKeyboardBacklightCapabilitiesJSON failed =>", err)
            return undefined;
        }
    }

    async getKeyboardBacklightStatesJSON(): Promise<string> {
        await this.dbusErrorHandling();
        try {
            return await this.interface.GetKeyboardBacklightStatesJSON();
        } catch (err: unknown) {
            console.error("dbusBackendAPI: getKeyboardBacklightStatesJSON failed =>", err)
            return undefined;
        }
    }

    async setKeyboardBacklightStatesJSON(keyboardBacklightStatesJSON: string): Promise<boolean> {
        await this.dbusErrorHandling();
        try {
            return await this.interface.SetKeyboardBacklightStatesJSON(keyboardBacklightStatesJSON);
        } catch (err: unknown) {
            console.error("dbusBackendAPI: setKeyboardBacklightStatesJSON failed =>", err)
            return undefined;
        }
    }

    async getFansMinSpeed(): Promise<number> {
        await this.dbusErrorHandling();
        try {
            return await this.interface.GetFansMinSpeed();
        } catch (err: unknown) {
            console.error("dbusBackendAPI: getFansMinSpeed failed =>", err)
            return undefined;
        }
    }

    async getFansOffAvailable(): Promise<boolean> {
        await this.dbusErrorHandling();
        try {
            return await this.interface.GetFansOffAvailable();
        } catch (err: unknown) {
            console.error("dbusBackendAPI: getFansOffAvailable failed =>", err)
            return undefined;
        }
    }

    async getChargingProfilesAvailable(): Promise<string[]> {
        await this.dbusErrorHandling();
        try {
            return JSON.parse(await this.interface.GetChargingProfilesAvailable());
        } catch (err: unknown) {
            console.error("dbusBackendAPI: getChargingProfilesAvailable failed =>", err)
            return [];
        }
    }

    async getCurrentChargingProfile(): Promise<string> {
        await this.dbusErrorHandling();
        try {
            return await this.interface.GetCurrentChargingProfile();
        } catch (err: unknown) {
            console.error("dbusBackendAPI: getCurrentChargingProfile failed =>", err)
            return '';
        }
    }

    async setChargingProfile(profileDescriptor: string): Promise<boolean> {
        await this.dbusErrorHandling();
        try {
            return await this.interface.SetChargingProfile(profileDescriptor);
        } catch (err: unknown) {
            console.error("dbusBackendAPI: setChargingProfile failed =>", err)
            return false;
        }
    }

    async getChargingPrioritiesAvailable(): Promise<string[]> {
        await this.dbusErrorHandling();
        try {
            return JSON.parse(await this.interface.GetChargingPrioritiesAvailable());
        } catch (err: unknown) {
            console.error("dbusBackendAPI: getChargingPrioritiesAvailable failed =>", err)
            return [];
        }
    }

    async getCurrentChargingPriority(): Promise<string> {
        await this.dbusErrorHandling();
        try {
            return await this.interface.GetCurrentChargingPriority();
        } catch (err: unknown) {
            console.error("dbusBackendAPI: getCurrentChargingPriority failed =>", err)
            return '';
        }
    }

    async setChargingPriority(priorityDescriptor: string): Promise<boolean> {
        await this.dbusErrorHandling();
        try {
            return await this.interface.SetChargingPriority(priorityDescriptor);
        } catch (err: unknown) {
            console.error("dbusBackendAPI: setChargingPriority failed =>", err)
            return false;
        }
    }

    async getChargeStartAvailableThresholds(): Promise<number[]> {
        await this.dbusErrorHandling();
        try {
            return JSON.parse(await this.interface.GetChargeStartAvailableThresholds());
        } catch (err: unknown) {
            console.error("dbusBackendAPI: getChargeStartAvailableThresholds failed =>", err)
            return [];
        }
    }

    async getChargeEndAvailableThresholds(): Promise<number[]> {
        await this.dbusErrorHandling();
        try {
            return JSON.parse(await this.interface.GetChargeEndAvailableThresholds());
        } catch (err: unknown) {
            console.error("dbusBackendAPI: getChargeEndAvailableThresholds failed =>", err)
            return [];
        }
    }

    async getChargeStartThreshold(): Promise<number> {
        await this.dbusErrorHandling();
        try {
            return await this.interface.GetChargeStartThreshold();
        } catch (err: unknown) {
            console.error("dbusBackendAPI: getChargeStartThreshold failed =>", err)
            return undefined;
        }
    }

    async setChargeStartThreshold(value: number): Promise<boolean> {
        await this.dbusErrorHandling();
        try {
            return await this.interface.SetChargeStartThreshold(value);
        } catch (err: unknown) {
            console.error("dbusBackendAPI: setChargeStartThreshold failed =>", err)
            return false;
        }
    }

    async getChargeEndThreshold(): Promise<number> {
        await this.dbusErrorHandling();
        try {
            return await this.interface.GetChargeEndThreshold();
        } catch (err: unknown) {
            console.error("dbusBackendAPI: getChargeEndThreshold failed =>", err)
            return undefined;
        }
    }

    async setChargeEndThreshold(value: number): Promise<boolean> {
        await this.dbusErrorHandling();
        try {
            return await this.interface.SetChargeEndThreshold(value);
        } catch (err: unknown) {
            console.error("dbusBackendAPI: setChargeEndThreshold failed =>", err)
            return false;
        }
    }

    async getChargeType(): Promise<string> {
        await this.dbusErrorHandling();
        try {
            return await this.interface.GetChargeType();
        } catch (err: unknown) {
            console.error("dbusBackendAPI: getChargeType failed =>", err)
            return ChargeType.Unknown.toString();
        }
    }

    async setChargeType(chargeType: ChargeType): Promise<boolean> {
        await this.dbusErrorHandling();
        try {
            return await this.interface.SetChargeType(chargeType);
        } catch (err: unknown) {
            console.error("dbusBackendAPI: setChargeType failed =>", err)
            return false;
        }
    }

    async getFnLockSupported(): Promise<boolean> {
        await this.dbusErrorHandling();
        try {
            return await this.interface.GetFnLockSupported();
        } catch (err: unknown) {
            console.error("dbusBackendAPI: getFnLockSupported failed =>", err)
            return false;
        }
    }

    async getFnLockStatus(): Promise<boolean> {
        await this.dbusErrorHandling();
        try {
            return await this.interface.GetFnLockStatus();
        } catch (err: unknown) {
            console.error("dbusBackendAPI: getFnLockStatus failed =>", err)
            return false;
        }
    }

    async setFnLockStatus(status: boolean): Promise<boolean> {
        await this.dbusErrorHandling();
        try {
            return await this.interface.SetFnLockStatus(status);
        } catch (err: unknown) {
            console.error("dbusBackendAPI: setFnLockStatus failed =>", err)
            return false;
        }
    }

    async setSensorDataCollectionStatus(status: boolean): Promise<boolean> {
        await this.dbusErrorHandling();
        try {
            return await this.interface.SetSensorDataCollectionStatus(status);
        } catch (err: unknown) {
            console.error("dbusBackendAPI: setSensorDataCollectionStatus failed =>", err)
            return false;
        }
    }

    async getSensorDataCollectionStatus(): Promise<boolean> {
        await this.dbusErrorHandling();
        try {
            return await this.interface.GetSensorDataCollectionStatus();
        } catch (err: unknown) {
            console.error("dbusBackendAPI: getSensorDataCollectionStatus failed =>", err)
            return false;
        }
    }

    async setDGpuD0Metrics(status: boolean): Promise<boolean> {
        await this.dbusErrorHandling();
        try {
            return await this.interface.SetDGpuD0Metrics(status);
        } catch (err: unknown) {
            console.error("dbusBackendAPI: setDGpuD0Metrics failed =>", err)
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

// exporting tccDBus so it can be initialized and utilized in main.ts / initMain.ts
export const tccDBus = new TccDBusController();

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
    })

    .set(DbusAPIFunctions.getNVIDIAPowerCTRLDefaultPowerLimit, async () => { 
        return new Promise<number>((resolve, reject) => {
            resolve(tccDBus.getNVIDIAPowerCTRLDefaultPowerLimit());
        });
    })


    .set(DbusAPIFunctions.getNVIDIAPowerCTRLMaxPowerLimit, async () => { 
        return new Promise<number>((resolve, reject) => {
            resolve(tccDBus.getNVIDIAPowerCTRLMaxPowerLimit());
        });
    })


    .set(DbusAPIFunctions.getNVIDIAPowerCTRLAvailable, async () => { 
        return new Promise<boolean>((resolve, reject) => {
            resolve(tccDBus.getNVIDIAPowerCTRLAvailable());
        });
    });

