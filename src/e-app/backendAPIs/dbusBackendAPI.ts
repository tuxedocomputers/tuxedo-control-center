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
    private busName: string = 'com.tuxedocomputers.tccd';
    private path: string = '/com/tuxedocomputers/tccd';
    private interfaceName: string = 'com.tuxedocomputers.tccd';
    private bus: dbus.MessageBus;
    private interface: dbus.ClientInterface;
    private dbusStatus: boolean = true

    constructor() {
        try {
            this.bus = dbus.systemBus();
        } catch (err: unknown) {
            console.error("dbusBackendAPI: constructor failed =>", err)
        }
    }

    async init(): Promise<boolean> {
        try {
            const proxyObject = await this.bus.getProxyObject(this.busName, this.path)
            this.interface = proxyObject.getInterface(this.interfaceName);
            return true;
        } catch (err: unknown) {
            console.error("dbusBackendAPI: init failed =>", err)
            return false;
        }

    }
    async dbusAvailable(): Promise<boolean> {
        try {
            if (!this.dbusStatus) {
                console.log("dbusBackendAPI: dbusAvailable: trying to connect to dbus")
            }
            const status: boolean = await this.interface.dbusAvailable();

            if (!this.dbusStatus && status) {
                console.log("dbusBackendAPI: dbusAvailable: dbus connected")
            }

            this.dbusStatus = status
            return status
        } catch (err: unknown) {
            console.error("dbusBackendAPI: dbusAvailable: dbus access was requested, but dbus is offline")
            this.dbusStatus = false
            return false;
        }
    }

    async getNVIDIAPowerCTRLDefaultPowerLimit(): Promise<number> {
        try {
            return await this.interface.GetNVIDIAPowerCTRLDefaultPowerLimit();
        } catch (err: unknown) {
            this.dbusStatus = false

            if (err instanceof dbus.DBusError) {
                console.error("dbusBackendAPI: getNVIDIAPowerCTRLDefaultPowerLimit failed =>", err.text)
                return -1
            }

            console.error("dbusBackendAPI: getNVIDIAPowerCTRLDefaultPowerLimit failed =>", err)
            return -1;
        }
    }

    async getNVIDIAPowerCTRLMaxPowerLimit(): Promise<number> {
        try {
            return await this.interface.GetNVIDIAPowerCTRLMaxPowerLimit();
        } catch (err: unknown) {
            this.dbusStatus = false

            if (err instanceof dbus.DBusError) {
                console.error("dbusBackendAPI: getNVIDIAPowerCTRLMaxPowerLimit failed =>", err.text)
                return -1
            }

            console.error("dbusBackendAPI: getNVIDIAPowerCTRLMaxPowerLimit failed =>", err)
            return -1;
        }
    }

    async getNVIDIAPowerCTRLAvailable(): Promise<boolean> {
        try {
            return await this.interface.GetNVIDIAPowerCTRLAvailable();
        } catch (err: unknown) {
            this.dbusStatus = false

            if (err instanceof dbus.DBusError) {
                console.error("dbusBackendAPI: getNVIDIAPowerCTRLAvailable failed =>", err.text)
                return false
            }

            console.error("dbusBackendAPI: getNVIDIAPowerCTRLAvailable failed =>", err)
            return false;
        }
    }
    async getHideCTGP(): Promise <boolean> {
        try {
            return await this.interface.GetHideCTGP();
        } catch (err: unknown) {
            this.dbusStatus = false

            if (err instanceof dbus.DBusError) {
                console.error("dbusBackendAPI: GetHideCTGP failed =>", err.text)
                return false
            }

            console.error("dbusBackendAPI: GetHideCTGP failed =>", err)
            return false;
        }
    }
    async tuxedoWmiAvailable(): Promise<boolean> {
        try {
            if (this.dbusStatus) {
                return await this.interface.TuxedoWmiAvailable();
            }
        } catch (err: unknown) {
            this.dbusStatus = false

            if (err instanceof dbus.DBusError) {
                console.error("dbusBackendAPI: tuxedoWmiAvailable failed =>", err.text)
                return false
            }

            console.error("dbusBackendAPI: tuxedoWmiAvailable failed =>", err)
            return false;
        }
    }

    async fanHwmonAvailable(): Promise<boolean> {
        try {
            if (this.dbusStatus) {
                return await this.interface.FanHwmonAvailable();
            }
        } catch (err: unknown) {
            this.dbusStatus = false

            if (err instanceof dbus.DBusError) {
                console.error("dbusBackendAPI: fanHwmonAvailable failed =>", err.text)
                return false
            }

            console.error("dbusBackendAPI: fanHwmonAvailable failed =>", err)
            return false;
        }
    }

    async deviceHasAquaris(): Promise<boolean> {
        try {
            if (this.dbusStatus) {
                return await this.interface.DeviceHasAquaris();
            }
        } catch (err: unknown) {
            this.dbusStatus = false

            if (err instanceof dbus.DBusError) {
                console.error("dbusBackendAPI: deviceHasAquaris failed =>", err.text)
                return false
            }

            console.error("dbusBackendAPI: deviceHasAquaris failed =>", err)
            return false;
        }
    }

    async tccdVersion(): Promise<string> {
        try {
            if (this.dbusStatus) {
                return await this.interface.TccdVersion();
            }
        } catch (err: unknown) {
            this.dbusStatus = false

            if (err instanceof dbus.DBusError) {
                console.error("dbusBackendAPI: tccdVersion failed =>", err.text)
                return ''
            }

            console.error("dbusBackendAPI: tccdVersion failed =>", err)
            return '';
        }
    }

    async getDeviceJSON(): Promise<string> {
        try {
            if (this.dbusStatus) {
                return await this.interface.GetDeviceName();
            }
        } catch (err: unknown) {
            this.dbusStatus = false

            if (err instanceof dbus.DBusError) {
                console.error("dbusBackendAPI: getDeviceJSON failed =>", err.text)
                return '{}'
            }

            console.error("dbusBackendAPI: getDeviceJSON failed =>", err)
            return '{}';
        }
    }

    async getFanDataJSON(): Promise<string> {
        try {
            if (this.dbusStatus) {
                return this.interface.GetFanDataJSON();
            }
        } catch (err: unknown) {
            this.dbusStatus = false

            if (err instanceof dbus.DBusError) {
                console.error("dbusBackendAPI: getFanDataJSON failed =>", err.text)
                return '{}';
            }

            console.error("dbusBackendAPI: getFanDataJSON failed =>", err)
            return '{}';
        }
    }


    async getDisplayModesJSON(): Promise<string> {
        try {
            if (this.dbusStatus) {
                return await this.interface.GetDisplayModesJSON();
            }
        } catch (err: unknown) {
            this.dbusStatus = false

            if (err instanceof dbus.DBusError) {
                console.error("dbusBackendAPI: getDisplayModesJSON failed =>", err.text)
                return undefined
            }

            console.error("dbusBackendAPI: getDisplayModesJSON failed =>", err)

            return undefined;
        }
    }

    async getIsX11():Promise<boolean> {
        try {
            if (this.dbusStatus) {
                return await this.interface.GetIsX11();
            }
        } catch (err: unknown) {
            this.dbusStatus = false

            if (err instanceof dbus.DBusError) {
                console.error("dbusBackendAPI: getIsX11 failed =>", err.text)
                return false
            }

            console.error("dbusBackendAPI: getIsX11 failed =>", err)
            return false;
        }
    }


    async webcamSWAvailable(): Promise<boolean> {
        try {
            if (this.dbusStatus) {
                return await this.interface.WebcamSWAvailable();
            }
        } catch (err: unknown) {
            this.dbusStatus = false

            if (err instanceof dbus.DBusError) {
                console.error("dbusBackendAPI: webcamSWAvailable failed =>", err.text)
                return false
            }

            console.error("dbusBackendAPI: webcamSWAvailable failed =>", err)
            return false;
        }
    }

    async getWebcamSWStatus(): Promise<boolean> {
        try {
            if (this.dbusStatus) {
                return await this.interface.GetWebcamSWStatus();
            }
        } catch (err: unknown) {
            this.dbusStatus = false

            if (err instanceof dbus.DBusError) {
                console.error("dbusBackendAPI: getWebcamSWStatus failed =>", err.text)
                return false
            }

            console.error("dbusBackendAPI: getWebcamSWStatus failed =>", err)
            return false;
        }
    }

    async getForceYUV420OutputSwitchAvailable(): Promise<boolean> {
        try {
            if (this.dbusStatus) {
                return await this.interface.GetForceYUV420OutputSwitchAvailable();
            }
        } catch (err: unknown) {
            this.dbusStatus = false

            if (err instanceof dbus.DBusError) {
                console.error("dbusBackendAPI: getForceYUV420OutputSwitchAvailable failed =>", err.text)
                return false
            }

            console.error("dbusBackendAPI: getForceYUV420OutputSwitchAvailable failed =>", err)
            return false;
        }
    }

    async getDGpuInfoValuesJSON(): Promise<string> {
        try {
            if (this.dbusStatus) {
                return await this.interface.GetDGpuInfoValuesJSON();
            }
        } catch (err: unknown) {
            this.dbusStatus = false

            if (err instanceof dbus.DBusError) {
                console.error("dbusBackendAPI: getDGpuInfoValuesJSON failed =>", err.text)
                return undefined
            }

            console.error("dbusBackendAPI: getDGpuInfoValuesJSON failed =>", err)
            return undefined;
        }
    }

    async getIGpuInfoValuesJSON(): Promise<string> {
        try {
            if (this.dbusStatus) {
                return await this.interface.GetIGpuInfoValuesJSON();
            }
        } catch (err: unknown) {
            this.dbusStatus = false

            if (err instanceof dbus.DBusError) {
                console.error("dbusBackendAPI: getIGpuInfoValuesJSON failed =>", err.text)
                return undefined
            }

            console.error("dbusBackendAPI: getIGpuInfoValuesJSON failed =>", err)
            return undefined;
        }
    }

    async getCpuPowerValuesJSON(): Promise<string> {
        try {
            if (this.dbusStatus) {
                return await this.interface.GetCpuPowerValuesJSON();
            }
        } catch (err: unknown) {
            this.dbusStatus = false

            if (err instanceof dbus.DBusError) {
                console.error("dbusBackendAPI: getCpuPowerValuesJSON failed =>", err.text)
                return undefined
            }

            console.error("dbusBackendAPI: getCpuPowerValuesJSON failed =>", err)
            return undefined;
        }
    }

    async getPrimeState(): Promise<string> {
        try {
            if (this.dbusStatus) {
                return await this.interface.GetPrimeState();
            }
        } catch (err: unknown) {
            this.dbusStatus = false

            if (err instanceof dbus.DBusError) {
                console.error("dbusBackendAPI: getPrimeState failed =>", err.text)
                return undefined
            }

            console.error("dbusBackendAPI: getPrimeState failed =>", err)
            return undefined;
        }
    }

    async consumeModeReapplyPending(): Promise<boolean> {
        try {
            if (this.dbusStatus) {
                return await this.interface.ConsumeModeReapplyPending();
            }
        } catch (err: unknown) {
            this.dbusStatus = false

            if (err instanceof dbus.DBusError) {
                console.error("dbusBackendAPI: consumeModeReapplyPending failed =>", err.text)
                return false
            }

            console.error("dbusBackendAPI: consumeModeReapplyPending failed =>", err)

            return false;
        }
    }

    async getActiveProfileJSON(): Promise<string> {
        try {
            if (this.dbusStatus) {
                return await this.interface.GetActiveProfileJSON();
            }
        } catch (err: unknown) {
            this.dbusStatus = false

            if (err instanceof dbus.DBusError) {
                console.error("dbusBackendAPI: getActiveProfileJSON failed =>", err.text)
                return undefined
            }

            console.error("dbusBackendAPI: getActiveProfileJSON failed failed =>", err)
            return undefined;
        }
    }

    async setTempProfileById(profileId: string): Promise<boolean> {
        try {
            if (this.dbusStatus) {
                return await this.interface.SetTempProfileById(profileId);
            }
        } catch (err: unknown) {
            this.dbusStatus = false

            if (err instanceof dbus.DBusError) {
                console.error("dbusBackendAPI: setTempProfileById failed =>", err.text)
                return false
            }

            console.error("dbusBackendAPI: setTempProfileById failed =>", err)
            return false;
        }
    }

    async getProfilesJSON(): Promise<string> {
        try {
            if (this.dbusStatus) {
                return await this.interface.GetProfilesJSON();
            }
        } catch (err: unknown) {
            this.dbusStatus = false

            if (err instanceof dbus.DBusError) {
                console.error("dbusBackendAPI: getProfilesJSON failed =>", err.text)
                return undefined
            }

            console.error("dbusBackendAPI: getProfilesJSON failed =>", err)
            return undefined;
        }
    }

    async getCustomProfilesJSON(): Promise<string> {
        try {
            if (this.dbusStatus) {
                return await this.interface.GetCustomProfilesJSON();
            }
        } catch (err: unknown) {
            this.dbusStatus = false

            if (err instanceof dbus.DBusError) {
                console.error("dbusBackendAPI: getCustomProfilesJSON failed =>", err.text)
                return undefined
            }

            console.error("dbusBackendAPI: getCustomProfilesJSON failed =>", err)
            return undefined;
        }
    }

    async getDefaultProfilesJSON(): Promise<string> {
        try {
            if (this.dbusStatus) {
                return await this.interface.GetDefaultProfilesJSON();
            }
        } catch (err: unknown) {
            this.dbusStatus = false

            if (err instanceof dbus.DBusError) {
                console.error("dbusBackendAPI: getDefaultProfilesJSON failed =>", err.text)
                return undefined
            }

            console.error("dbusBackendAPI: getDefaultProfilesJSON failed =>", err)
            return undefined;
        }
    }

    async getDefaultValuesProfileJSON(): Promise<string> {
        try {
            if (this.dbusStatus) {
                return await this.interface.GetDefaultValuesProfileJSON();
            }
        } catch (err: unknown) {
            this.dbusStatus = false

            if (err instanceof dbus.DBusError) {
                console.error("dbusBackendAPI: getDefaultValuesProfileJSON failed =>", err.text)
                return undefined
            }

            console.error("dbusBackendAPI: getDefaultValuesProfileJSON failed =>", err)
            return undefined;
        }
    }

    async getSettingsJSON(): Promise<string> {
        try {
            if (this.dbusStatus) {
                return await this.interface.GetSettingsJSON();
            }
        } catch (err: unknown) {
            this.dbusStatus = false

            if (err instanceof dbus.DBusError) {
                console.error("dbusBackendAPI: getSettingsJSON failed =>", err.text)
                return undefined
            }

            console.error("dbusBackendAPI: getSettingsJSON failed =>", err)
            return undefined;
        }
    }

    async odmProfilesAvailable(): Promise<string[]> {
        try {
            if (this.dbusStatus) {
                return await this.interface.ODMProfilesAvailable();
            }
        } catch (err: unknown) {
            this.dbusStatus = false

            if (err instanceof dbus.DBusError) {
                console.error("dbusBackendAPI: odmProfilesAvailable failed =>", err.text)
                return undefined
            }

            console.error("dbusBackendAPI: odmProfilesAvailable failed =>", err)
            return undefined;
        }
    }

    async odmPowerLimits(): Promise<TDPInfo[]> {
        try {
            if (this.dbusStatus) {
                return JSON.parse(await this.interface.ODMPowerLimitsJSON());
            }
        } catch (err: unknown) {
            this.dbusStatus = false

            if (err instanceof dbus.DBusError) {
                console.error("dbusBackendAPI: odmPowerLimits failed =>", err.text)
                return undefined
            }

            console.error("dbusBackendAPI: odmPowerLimits failed =>", err)
            return undefined;
        }
    }

    async odmPowerLimitsJSON(): Promise<string> {
        try {
            if (this.dbusStatus) {
                return await this.interface.ODMPowerLimitsJSON();
            }
        } catch (err: unknown) {
            this.dbusStatus = false

            if (err instanceof dbus.DBusError) {
                console.error("dbusBackendAPI: odmPowerLimitsJSON failed =>", err.text)
                return undefined
            }

            console.error("dbusBackendAPI: odmPowerLimitsJSON failed =>", err)
            return undefined;
        }
    }

    async getKeyboardBacklightCapabilitiesJSON(): Promise<string> {
        try {
            if (this.dbusStatus) {
                return await this.interface.GetKeyboardBacklightCapabilitiesJSON();
            }
        } catch (err: unknown) {
            this.dbusStatus = false

            if (err instanceof dbus.DBusError) {
                console.error("dbusBackendAPI: getKeyboardBacklightCapabilitiesJSON failed =>", err.text)
                return undefined
            }

            console.error("dbusBackendAPI: getKeyboardBacklightCapabilitiesJSON failed =>", err)
            return undefined;
        }
    }

    async getKeyboardBacklightStatesJSON(): Promise<string> {
        try {
            if (this.dbusStatus) {
                return await this.interface.GetKeyboardBacklightStatesJSON();
            }
        } catch (err: unknown) {
            this.dbusStatus = false

            if (err instanceof dbus.DBusError) {
                console.error("dbusBackendAPI: getKeyboardBacklightStatesJSON failed =>", err.text)
                return undefined
            }

            console.error("dbusBackendAPI: getKeyboardBacklightStatesJSON failed =>", err)
            return undefined;
        }
    }

    async setKeyboardBacklightStatesJSON(keyboardBacklightStatesJSON: string): Promise<boolean> {
        try {
            if (this.dbusStatus) {
                return await this.interface.SetKeyboardBacklightStatesJSON(keyboardBacklightStatesJSON);
            }
        } catch (err: unknown) {
            this.dbusStatus = false

            if (err instanceof dbus.DBusError) {
                console.error("dbusBackendAPI: setKeyboardBacklightStatesJSON failed =>", err.text)
                return undefined
            }

            console.error("dbusBackendAPI: setKeyboardBacklightStatesJSON failed =>", err)
            return undefined;
        }
    }

    async getFansMinSpeed(): Promise<number> {
        try {
            if (this.dbusStatus) {
                return await this.interface.GetFansMinSpeed();
            }
        } catch (err: unknown) {
            this.dbusStatus = false

            if (err instanceof dbus.DBusError) {
                console.error("dbusBackendAPI: getFansMinSpeed failed =>", err.text)
                return undefined
            }

            console.error("dbusBackendAPI: getFansMinSpeed failed =>", err)
            return undefined;
        }
    }

    async getFansOffAvailable(): Promise<boolean> {
        try {
            if (this.dbusStatus) {
                return await this.interface.GetFansOffAvailable();
            }
        } catch (err: unknown) {
            this.dbusStatus = false

            if (err instanceof dbus.DBusError) {
                console.error("dbusBackendAPI: getFansOffAvailable failed =>", err.text)
                return undefined
            }

            console.error("dbusBackendAPI: getFansOffAvailable failed =>", err)
            return undefined;
        }
    }

    async getChargingProfilesAvailable(): Promise<string[]> {
        try {
            if (this.dbusStatus) {
                return JSON.parse(await this.interface.GetChargingProfilesAvailable());
            }
        } catch (err: unknown) {
            this.dbusStatus = false

            if (err instanceof dbus.DBusError) {
                console.error("dbusBackendAPI: getChargingProfilesAvailable failed =>", err.text)
                return []
            }

            console.error("dbusBackendAPI: getChargingProfilesAvailable failed =>", err)
            return [];
        }
    }

    async getCurrentChargingProfile(): Promise<string> {
        try {
            if (this.dbusStatus) {
                return await this.interface.GetCurrentChargingProfile();
            }
        } catch (err: unknown) {
            this.dbusStatus = false

            if (err instanceof dbus.DBusError) {
                console.error("dbusBackendAPI: getCurrentChargingProfile failed =>", err.text)
                return ''
            }

            console.error("dbusBackendAPI: getCurrentChargingProfile failed =>", err)
            return '';
        }
    }

    async setChargingProfile(profileDescriptor: string): Promise<boolean> {
        try {
            if (this.dbusStatus) {
                return await this.interface.SetChargingProfile(profileDescriptor);
            }
        } catch (err: unknown) {
            this.dbusStatus = false

            if (err instanceof dbus.DBusError) {
                console.error("dbusBackendAPI: setChargingProfile failed =>", err.text)
                return false
            }

            console.error("dbusBackendAPI: setChargingProfile failed =>", err)
            return false;
        }
    }

    async getChargingPrioritiesAvailable(): Promise<string[]> {
        try {
            if (this.dbusStatus) {
                return JSON.parse(await this.interface.GetChargingPrioritiesAvailable());
            }
        } catch (err: unknown) {
            this.dbusStatus = false

            if (err instanceof dbus.DBusError) {
                console.error("dbusBackendAPI: getChargingPrioritiesAvailable failed =>", err.text)
                return []
            }

            console.error("dbusBackendAPI: getChargingPrioritiesAvailable failed =>", err)
            return [];
        }
    }

    async getCurrentChargingPriority(): Promise<string> {
        try {
            if (this.dbusStatus) {
                return await this.interface.GetCurrentChargingPriority();
            }
        } catch (err: unknown) {
            this.dbusStatus = false

            if (err instanceof dbus.DBusError) {
                console.error("dbusBackendAPI: getCurrentChargingPriority failed =>", err.text)
                return ''
            }

            console.error("dbusBackendAPI: getCurrentChargingPriority failed =>", err)
            return '';
        }
    }

    async setChargingPriority(priorityDescriptor: string): Promise<boolean> {
        try {
            if (this.dbusStatus) {
                return await this.interface.SetChargingPriority(priorityDescriptor);
            }
        } catch (err: unknown) {
            this.dbusStatus = false

            if (err instanceof dbus.DBusError) {
                console.error("dbusBackendAPI: setChargingPriority failed =>", err.text)
                return false
            }

            console.error("dbusBackendAPI: setChargingPriority failed =>", err)
            return false;
        }
    }

    async getChargeStartAvailableThresholds(): Promise<number[]> {
        try {
            if (this.dbusStatus) {
                return JSON.parse(await this.interface.GetChargeStartAvailableThresholds());
            }
        } catch (err: unknown) {
            this.dbusStatus = false

            if (err instanceof dbus.DBusError) {
                console.error("dbusBackendAPI: getChargeStartAvailableThresholds failed =>", err.text)
                return []
            }

            console.error("dbusBackendAPI: getChargeStartAvailableThresholds failed =>", err)
            return [];
        }
    }

    async getChargeEndAvailableThresholds(): Promise<number[]> {
        try {
            if (this.dbusStatus) {
                return JSON.parse(await this.interface.GetChargeEndAvailableThresholds());
            }
        } catch (err: unknown) {
            this.dbusStatus = false

            if (err instanceof dbus.DBusError) {
                console.error("dbusBackendAPI: getChargeEndAvailableThresholds failed =>", err.text)
                return []
            }


            console.error("dbusBackendAPI: getChargeEndAvailableThresholds failed =>", err)
            return [];
        }
    }

    async getChargeStartThreshold(): Promise<number> {
        try {
            if (this.dbusStatus) {
                return await this.interface.GetChargeStartThreshold();
            }
        } catch (err: unknown) {
            this.dbusStatus = false

            if (err instanceof dbus.DBusError) {
                console.error("dbusBackendAPI: getChargeStartThreshold failed =>", err.text)
                return undefined
            }

            console.error("dbusBackendAPI: getChargeStartThreshold failed =>", err)
            return undefined;
        }
    }

    async setChargeStartThreshold(value: number): Promise<boolean> {
        try {
            if (this.dbusStatus) {
                return await this.interface.SetChargeStartThreshold(value);
            }
        } catch (err: unknown) {
            this.dbusStatus = false

            if (err instanceof dbus.DBusError) {
                console.error("dbusBackendAPI: setChargeStartThreshold failed =>", err.text)
                return false
            }

            console.error("dbusBackendAPI: setChargeStartThreshold failed =>", err)
            return false;
        }
    }

    async getChargeEndThreshold(): Promise<number> {
        try {
            if (this.dbusStatus) {
                return await this.interface.GetChargeEndThreshold();
            }
        } catch (err: unknown) {
            this.dbusStatus = false

            if (err instanceof dbus.DBusError) {
                console.error("dbusBackendAPI: getChargeEndThreshold failed =>", err.text)
                return undefined
            }

            console.error("dbusBackendAPI: getChargeEndThreshold failed =>", err)
            return undefined;
        }
    }

    async setChargeEndThreshold(value: number): Promise<boolean> {
        try {
            if (this.dbusStatus) {
                return await this.interface.SetChargeEndThreshold(value);
            }
        } catch (err: unknown) {
            this.dbusStatus = false

            if (err instanceof dbus.DBusError) {
                console.error("dbusBackendAPI: setChargeEndThreshold failed =>", err.text)
                return false
            }

            console.error("dbusBackendAPI: setChargeEndThreshold failed =>", err)
            return false;
        }
    }

    async getChargeType(): Promise<string> {
        try {
            if (this.dbusStatus) {
                return await this.interface.GetChargeType();
            }
        } catch (err: unknown) {
            this.dbusStatus = false

            if (err instanceof dbus.DBusError) {
                console.error("dbusBackendAPI: getChargeType failed =>", err.text)
                return ChargeType.Unknown.toString();
            }

            console.error("dbusBackendAPI: getChargeType failed =>", err)
            return ChargeType.Unknown.toString();
        }
    }

    async setChargeType(chargeType: ChargeType): Promise<boolean> {
        try {
            if (this.dbusStatus) {
                return await this.interface.SetChargeType(chargeType);
            }
        } catch (err: unknown) {
            this.dbusStatus = false

            if (err instanceof dbus.DBusError) {
                console.error("dbusBackendAPI: setChargeType failed =>", err.text)
                return false
            }

            console.error("dbusBackendAPI: setChargeType failed =>", err)
            return false;
        }
    }

    async getFnLockSupported(): Promise<boolean> {
        try {
            if (this.dbusStatus) {
                return await this.interface.GetFnLockSupported();
            }
        } catch (err: unknown) {
            this.dbusStatus = false

            if (err instanceof dbus.DBusError) {
                console.error("dbusBackendAPI: getFnLockSupported failed =>", err.text)
                return false
            }

            console.error("dbusBackendAPI: getFnLockSupported failed =>", err)
            return false;
        }
    }

    async getFnLockStatus(): Promise<boolean> {
        try {
            if (this.dbusStatus) {
                return await this.interface.GetFnLockStatus();
            }
        } catch (err: unknown) {
            this.dbusStatus = false

            if (err instanceof dbus.DBusError) {
                console.error("dbusBackendAPI: getFnLockStatus failed =>", err.text)
                return false
            }

            console.error("dbusBackendAPI: getFnLockStatus failed =>", err)
            return false;
        }
    }

    async setFnLockStatus(status: boolean): Promise<boolean> {
        try {
            if (this.dbusStatus) {
                return await this.interface.SetFnLockStatus(status);
            }
        } catch (err: unknown) {
            this.dbusStatus = false

            if (err instanceof dbus.DBusError) {
                console.error("dbusBackendAPI: setFnLockStatus failed =>", err.text)
                return false
            }

            console.error("dbusBackendAPI: setFnLockStatus failed =>", err)
            return false;
        }
    }

    async setSensorDataCollectionStatus(status: boolean): Promise<boolean> {
        try {
            if (this.dbusStatus) {
                return await this.interface.SetSensorDataCollectionStatus(status);
            }
        } catch (err: unknown) {
            this.dbusStatus = false

            if (err instanceof dbus.DBusError) {
                console.error("dbusBackendAPI: setSensorDataCollectionStatus failed =>", err.text)
                return false
            }

            console.error("dbusBackendAPI: setSensorDataCollectionStatus failed =>", err)
            return false;
        }
    }

    async getSensorDataCollectionStatus(): Promise<boolean> {
        try {
            if (this.dbusStatus) {
                return await this.interface.GetSensorDataCollectionStatus();
            }
        } catch (err: unknown) {
            this.dbusStatus = false

            if (err instanceof dbus.DBusError) {
                console.error("dbusBackendAPI: getSensorDataCollectionStatus failed =>", err.text)
                return false
            }

            console.error("dbusBackendAPI: getSensorDataCollectionStatus failed =>", err)
            return false;
        }
    }

    async setDGpuD0Metrics(status: boolean): Promise<boolean> {
        try {
            if (this.dbusStatus) {
                return await this.interface.SetDGpuD0Metrics(status);
            }
        } catch (err: unknown) {
            this.dbusStatus = false

            if (err instanceof dbus.DBusError) {
                console.error("dbusBackendAPI: setDGpuD0Metrics failed =>", err.text)
                return false
            }

            console.error("dbusBackendAPI: setDGpuD0Metrics failed =>", err)
            return false;
        }
    }

    onModeReapplyPendingChanged(callback_function: () => void): boolean {
        try {
            if (this.dbusStatus) {
                this.interface.on('ModeReapplyPendingChanged', callback_function);
            }
        } catch (err: unknown) {
            this.dbusStatus = false

            if (err instanceof dbus.DBusError) {
                console.error("dbusBackendAPI: onModeReapplyPendingChanged failed =>", err.text)
                return false
            }

            console.error("dbusBackendAPI: oncall failed =>", err)
            return false;
        }
    }

    disconnect(): void {
        try {
            this.bus.disconnect();
        } catch (err: unknown) {
            console.error("dbusBackendAPI: disconnect failed =>", err)

        }
    }
}

export const tccDBus = new TccDBusController();

export const dbusHandlers: Map<string, (...args: any[]) => any> = new Map<string, (...args: any[]) => any>()
    .set(DbusAPIFunctions.getVersion, (): Promise<string> => {
        return new Promise<string>((resolve: (value: string | PromiseLike<string>) => void, reject: (reason?: unknown) => void): void => {
            try {
                resolve(tccDBus.tccdVersion());
            } catch (err: unknown) {
                console.error("dbusBackendAPI: DbusAPIFunctions.getVersion failed =>", err)
            }
        });
    })

    .set(DbusAPIFunctions.tuxedoWmiAvailable, (): Promise<boolean> => {
        return new Promise<boolean>((resolve: (value: boolean | PromiseLike<boolean>) => void, reject: (reason?: unknown) => void): void => {
            try {
                resolve(tccDBus.tuxedoWmiAvailable());
            } catch (err: unknown) {
                console.error("dbusBackendAPI: DbusAPIFunctions.tuxedoWmiAvailable failed =>", err)
            }
        });
    })

    .set(DbusAPIFunctions.getFanData, (): Promise<string> => {
        return new Promise<string>((resolve: (value: string | PromiseLike<string>) => void, reject: (reason?: unknown) => void): void => {
            try {
                resolve(tccDBus.getFanDataJSON());
            } catch (err: unknown) {
                console.error("dbusBackendAPI: DbusAPIFunctions.getFanData failed =>", err)
            }
        });
    })

    .set(DbusAPIFunctions.webcamSWAvailable, (): Promise<boolean> => {
        return new Promise<boolean>((resolve: (value: boolean | PromiseLike<boolean>) => void, reject: (reason?: unknown) => void): void => {
            try {
                resolve(tccDBus.webcamSWAvailable());
            } catch (err: unknown) {
                console.error("dbusBackendAPI: DbusAPIFunctions.webcamSWAvailable failed =>", err)
            }
        });
    })

    .set(DbusAPIFunctions.getForceYUV420OutputSwitchAvailable, (): Promise<boolean> => {
        return new Promise<boolean>((resolve: (value: boolean | PromiseLike<boolean>) => void, reject: (reason?: unknown) => void): void => {
            try {
                resolve(tccDBus.getForceYUV420OutputSwitchAvailable());
            } catch (err: unknown) {
                console.error("dbusBackendAPI: DbusAPIFunctions.getForceYUV420OutputSwitchAvailable failed =>", err)
            }
        });
    })

    .set(DbusAPIFunctions.consumeModeReapplyPending, (): Promise<boolean> => {
        return new Promise<boolean>((resolve: (value: boolean | PromiseLike<boolean>) => void, reject: (reason?: unknown) => void): void => {
            try {
                resolve(tccDBus.consumeModeReapplyPending());
            } catch (err: unknown) {
                console.error("dbusBackendAPI: DbusAPIFunctions.consumeModeReapplyPending failed =>", err)
            }
        });
    })

    .set(DbusAPIFunctions.getActiveProfileJSON, (): Promise<string> => {
        return new Promise<string>((resolve: (value: string | PromiseLike<string>) => void, reject: (reason?: unknown) => void): void => {
            try {
                resolve(tccDBus.getActiveProfileJSON());
            } catch (err: unknown) {
                console.error("dbusBackendAPI: DbusAPIFunctions.getActiveProfileJSON failed =>", err)
            }
        });
    })

    .set(DbusAPIFunctions.setTempProfileById, (profileId: string): Promise<boolean> => {
        return new Promise<boolean>((resolve: (value: boolean | PromiseLike<boolean>) => void, reject: (reason?: unknown) => void): void => {
            try {
                resolve(tccDBus.setTempProfileById(profileId));
            } catch (err: unknown) {
                console.error("dbusBackendAPI: DbusAPIFunctions.setTempProfileById failed =>", err)
            }
        });
    })

    .set(DbusAPIFunctions.getProfilesJSON, (): Promise<string> => {
        return new Promise<string>((resolve: (value: string | PromiseLike<string>) => void, reject: (reason?: unknown) => void): void => {
            try {
                resolve(tccDBus.getProfilesJSON());
            } catch (err: unknown) {
                console.error("dbusBackendAPI: DbusAPIFunctions.getProfilesJSON failed =>", err)
            }
        });
    })

    .set(DbusAPIFunctions.getCustomProfilesJSON, (): Promise<string> => {
        return new Promise<string>((resolve: (value: string | PromiseLike<string>) => void, reject: (reason?: unknown) => void): void => {
            try {
                resolve(tccDBus.getCustomProfilesJSON());
            } catch (err: unknown) {
                console.error("dbusBackendAPI: DbusAPIFunctions.getCustomProfilesJSON failed =>", err)
            }
        });
    })

    .set(DbusAPIFunctions.getDefaultProfilesJSON, (): Promise<string> => {
        return new Promise<string>((resolve: (value: string | PromiseLike<string>) => void, reject: (reason?: unknown) => void): void => {
            try {
                resolve(tccDBus.getDefaultProfilesJSON());
            } catch (err: unknown) {
                console.error("dbusBackendAPI: DbusAPIFunctions.getDefaultProfilesJSON failed =>", err)
            }
        });
    })

    .set(DbusAPIFunctions.getDefaultValuesProfileJSON, (): Promise<string> => {
        return new Promise<string>((resolve: (value: string | PromiseLike<string>) => void, reject: (reason?: unknown) => void): void => {
            try {
                resolve(tccDBus.getDefaultValuesProfileJSON());
            } catch (err: unknown) {
                console.error("dbusBackendAPI: DbusAPIFunctions.getDefaultValuesProfileJSON failed =>", err)
            }
        });
    })

    .set(DbusAPIFunctions.getSettingsJSON, (): Promise<string> => {
        return new Promise<string>((resolve: (value: string | PromiseLike<string>) => void, reject: (reason?: unknown) => void): void => {
            try {
                resolve(tccDBus.getSettingsJSON());
            } catch (err: unknown) {
                console.error("dbusBackendAPI: DbusAPIFunctions.getSettingsJSON failed =>", err)
            }
        });
    })

    .set(DbusAPIFunctions.odmProfilesAvailable, (): Promise<string[]> => {
        return new Promise<string[]>((resolve: (value: string[] | PromiseLike<string[]>) => void, reject: (reason?: unknown) => void): void => {
            try {
                resolve(tccDBus.odmProfilesAvailable());
            } catch (err: unknown) {
                console.error("dbusBackendAPI: DbusAPIFunctions.odmProfilesAvailable failed =>", err)
            }
        });
    })

    .set(DbusAPIFunctions.odmPowerLimitsJSON, (): Promise<string> => {
        return new Promise<string>((resolve: (value: string | PromiseLike<string>) => void, reject: (reason?: unknown) => void): void => {
            try {
                resolve(tccDBus.odmPowerLimitsJSON());
            } catch (err: unknown) {
                console.error("dbusBackendAPI: DbusAPIFunctions.odmPowerLimitsJSON failed =>", err)
            }
        });
    })

    .set(DbusAPIFunctions.getKeyboardBacklightCapabilitiesJSON, (): Promise<string> => {
        return new Promise<string>((resolve: (value: string | PromiseLike<string>) => void, reject: (reason?: unknown) => void): void => {
            try {
                resolve(tccDBus.getKeyboardBacklightCapabilitiesJSON());
            } catch (err: unknown) {
                console.error("dbusBackendAPI: DbusAPIFunctions.getKeyboardBacklightCapabilitiesJSON failed =>", err)
            }
        });
    })

    .set(DbusAPIFunctions.getKeyboardBacklightStatesJSON, (): Promise<string> => {
        return new Promise<string>((resolve: (value: string | PromiseLike<string>) => void, reject: (reason?: unknown) => void): void => {
            try {
                resolve(tccDBus.getKeyboardBacklightStatesJSON());
            } catch (err: unknown) {
                console.error("dbusBackendAPI: DbusAPIFunctions.getKeyboardBacklightStatesJSON failed =>", err)
            }
        });
    })

    .set(DbusAPIFunctions.setKeyboardBacklightStatesJSON, (keyboardBacklightStatesJSON: string): Promise<boolean> => {
        return new Promise<boolean>((resolve: (value: boolean | PromiseLike<boolean>) => void, reject: (reason?: unknown) => void): void => {
            try {
                resolve(tccDBus.setKeyboardBacklightStatesJSON(keyboardBacklightStatesJSON));
            } catch (err: unknown) {
                    console.error("dbusBackendAPI: DbusAPIFunctions.setKeyboardBacklightStatesJSON failed =>", err)
            }
        });
    })

    .set(DbusAPIFunctions.getFansMinSpeed, (): Promise<number> => {
        return new Promise<number>((resolve: (value: number | PromiseLike<number>) => void, reject: (reason?: unknown) => void): void => {
        try {
            resolve(tccDBus.getFansMinSpeed());
        } catch (err: unknown) {
                console.error("dbusBackendAPI: DbusAPIFunctions.getFansMinSpeed failed =>", err)
            }
        });
    })

    .set(DbusAPIFunctions.getFansOffAvailable, (): Promise<boolean> => {
        return new Promise<boolean>((resolve: (value: boolean | PromiseLike<boolean>) => void, reject: (reason?: unknown) => void): void => {
            try {
                resolve(tccDBus.getFansOffAvailable());
            } catch (err: unknown) {
                console.error("dbusBackendAPI: DbusAPIFunctions.getFansOffAvailable failed =>", err)
            }
        });
    })

    .set(DbusAPIFunctions.getChargingProfilesAvailable, (): Promise<string[]> => {
        return new Promise<string[]>((resolve: (value: string[] | PromiseLike<string[]>) => void, reject: (reason?: unknown) => void): void => {
            try {
                resolve(tccDBus.getChargingProfilesAvailable());
            } catch (err: unknown) {
                console.error("dbusBackendAPI: DbusAPIFunctions.getChargingProfilesAvailable failed =>", err)
            }
        });
    })

    .set(DbusAPIFunctions.getCurrentChargingProfile, (): Promise<string> => {
        return new Promise<string>((resolve: (value: string | PromiseLike<string>) => void, reject: (reason?: unknown) => void): void => {
            try {
                resolve(tccDBus.getCurrentChargingProfile());
            } catch (err: unknown) {
                console.error("dbusBackendAPI: DbusAPIFunctions.getCurrentChargingProfile failed =>", err)
            }
        });
    })

    .set(DbusAPIFunctions.setChargingProfile, (profileDescriptor): Promise<boolean> => {
        return new Promise<boolean>((resolve: (value: boolean | PromiseLike<boolean>) => void, reject: (reason?: unknown) => void): void => {
            try {
                resolve(tccDBus.setChargingProfile(profileDescriptor));
            } catch (err: unknown) {
                console.error("dbusBackendAPI: DbusAPIFunctions.setChargingProfile failed =>", err)
            }
        });
    })

    .set(DbusAPIFunctions.getChargingPrioritiesAvailable, (): Promise<string[]> => {
        return new Promise<string[]>((resolve: (value: string[] | PromiseLike<string[]>) => void, reject: (reason?: unknown) => void): void => {
            try {
                resolve(tccDBus.getChargingPrioritiesAvailable());
            } catch (err: unknown) {
                console.error("dbusBackendAPI: DbusAPIFunctions.getChargingPrioritiesAvailable failed =>", err)
            }
        });
    })

    .set(DbusAPIFunctions.getCurrentChargingPriority, (): Promise<string> => {
        return new Promise<string>((resolve: (value: string | PromiseLike<string>) => void, reject: (reason?: unknown) => void): void => {
            try {
                resolve(tccDBus.getCurrentChargingPriority());
            } catch (err: unknown) {
                console.error("dbusBackendAPI: DbusAPIFunctions.getCurrentChargingPriority failed =>", err)
            }
        });
    })

    .set(DbusAPIFunctions.setChargingPriority, (priorityDescriptor): Promise<boolean> => {

        return new Promise<boolean>((resolve: (value: boolean | PromiseLike<boolean>) => void, reject: (reason?: unknown) => void): void => {
            try {
                resolve(tccDBus.setChargingPriority(priorityDescriptor));
            } catch (err: unknown) {
                console.error("dbusBackendAPI: DbusAPIFunctions.setChargingPriority failed =>", err)
            }
        });
    })

    .set(DbusAPIFunctions.getDGpuInfoValuesJSON, (): Promise<string> => {
        return new Promise<string>((resolve: (value: string | PromiseLike<string>) => void, reject: (reason?: unknown) => void): void => {
            try {
                resolve(tccDBus.getDGpuInfoValuesJSON());
            } catch (err: unknown) {
                console.error("dbusBackendAPI: DbusAPIFunctions.getDGpuInfoValuesJSON failed =>", err)
            }
        });
    })

    .set(DbusAPIFunctions.getIGpuInfoValuesJSON, (): Promise<string> => {
        return new Promise<string>((resolve: (value: string | PromiseLike<string>) => void, reject: (reason?: unknown) => void): void => {
            try {
                resolve(tccDBus.getIGpuInfoValuesJSON());
            } catch (err: unknown) {
                console.error("dbusBackendAPI: DbusAPIFunctions.getIGpuInfoValuesJSON failed =>", err)
            }
        });
    })

    .set(DbusAPIFunctions.getSensorDataCollectionStatus, (): Promise<boolean> => {
        return new Promise<boolean>((resolve: (value: boolean | PromiseLike<boolean>) => void, reject: (reason?: unknown) => void): void => {
            try {
                resolve(tccDBus.getSensorDataCollectionStatus());
            } catch (err: unknown) {
                console.error("dbusBackendAPI: DbusAPIFunctions.getSensorDataCollectionStatus failed =>", err)
            }
        });
    })

    .set(DbusAPIFunctions.getPrimeState, (): Promise<string> => {
        return new Promise<string>((resolve: (value: string | PromiseLike<string>) => void, reject: (reason?: unknown) => void): void => {
            try {
                resolve(tccDBus.getPrimeState());
            } catch (err: unknown) {
                console.error("dbusBackendAPI: DbusAPIFunctions.getPrimeState failed =>", err)
            }
        });
    })

    .set(DbusAPIFunctions.getCpuPowerValuesJSON, (): Promise<string> => {
        return new Promise<string>((resolve: (value: string | PromiseLike<string>) => void, reject: (reason?: unknown) => void): void => {
            try {
                resolve(tccDBus.getCpuPowerValuesJSON());
            } catch (err: unknown) {
                console.error("dbusBackendAPI: DbusAPIFunctions.getCpuPowerValuesJSON failed =>", err)
            }
        });
    })

    .set(DbusAPIFunctions.getDisplayModesJSON, (): Promise<string> => {
        return new Promise<string>((resolve: (value: string | PromiseLike<string>) => void, reject: (reason?: unknown) => void): void => {
            try {
                resolve(tccDBus.getDisplayModesJSON());
            } catch (err: unknown) {
                console.error("dbusBackendAPI: DbusAPIFunctions.getDisplayModesJSON failed =>", err)
            }
        });
    })

    .set(DbusAPIFunctions.getIsX11, (): Promise<boolean> => {
        return new Promise<boolean>((resolve: (value: boolean | PromiseLike<boolean>) => void, reject: (reason?: unknown) => void): void => {
            try {
                resolve(tccDBus.getIsX11());
            } catch (err: unknown) {
                console.error("dbusBackendAPI: DbusAPIFunctions.getIsX11 failed =>", err)
            }
        });
    })

    .set(DbusAPIFunctions.setSensorDataCollectionStatus, (status: boolean): Promise<boolean> => {
        return new Promise<boolean>((resolve: (value: boolean | PromiseLike<boolean>) => void, reject: (reason?: unknown) => void): void => {
            try {
                resolve(tccDBus.setSensorDataCollectionStatus(status));
            } catch (err: unknown) {
                console.error("dbusBackendAPI: DbusAPIFunctions.setSensorDataCollectionStatus failed =>", err)
            }
        });
    })

    .set(DbusAPIFunctions.setDGpuD0Metrics, (status: boolean): Promise<boolean> => {
        return new Promise<boolean>((resolve: (value: boolean | PromiseLike<boolean>) => void, reject: (reason?: unknown) => void): void => {
            try {
                resolve(tccDBus.setDGpuD0Metrics(status));
            } catch (err: unknown) {
                console.error("dbusBackendAPI: DbusAPIFunctions.setDGpuD0Metrics failed =>", err)
            }
        });
    })

    .set(DbusAPIFunctions.getChargeStartAvailableThresholds, (): Promise<number[]> => {
        return new Promise<number[]>((resolve: (value: number[] | PromiseLike<number[]>) => void, reject: (reason?: unknown) => void): void => {
            try {
                resolve(tccDBus.getChargeStartAvailableThresholds());
            } catch (err: unknown) {
                console.error("dbusBackendAPI: DbusAPIFunctions.getChargeStartAvailableThresholds failed =>", err)
            }
        });
    })

    .set(DbusAPIFunctions.getChargeEndAvailableThresholds, (): Promise<number[]> => {
        return new Promise<number[]>((resolve: (value: number[] | PromiseLike<number[]>) => void, reject: (reason?: unknown) => void): void => {
            try {
                resolve(tccDBus.getChargeEndAvailableThresholds());
            } catch (err: unknown) {
                console.error("dbusBackendAPI: DbusAPIFunctions.getChargeEndAvailableThresholds failed =>", err)
            }
        });
    })

    .set(DbusAPIFunctions.getChargeStartThreshold, (): Promise<number> => {
        return new Promise<number>((resolve: (value: number | PromiseLike<number>) => void, reject: (reason?: unknown) => void): void => {
            try {
                resolve(tccDBus.getChargeStartThreshold());
            } catch (err: unknown) {
                console.error("dbusBackendAPI: DbusAPIFunctions.getChargeStartThreshold failed =>", err)
            }
        });
    })

    .set(DbusAPIFunctions.getChargeEndThreshold, (): Promise<number> => {
        return new Promise<number>((resolve: (value: number | PromiseLike<number>) => void, reject: (reason?: unknown) => void): void => {
            try {
                resolve(tccDBus.getChargeEndThreshold());
            } catch (err: unknown) {
                console.error("dbusBackendAPI: DbusAPIFunctions.getChargeEndThreshold failed =>", err)
            }
        });
    })

    .set(DbusAPIFunctions.getChargeType, (): Promise<string> => {
        return new Promise<string>((resolve: (value: string | PromiseLike<string>) => void, reject: (reason?: unknown) => void): void => {
            try {
                resolve(tccDBus.getChargeType());
            } catch (err: unknown) {
                console.error("dbusBackendAPI: DbusAPIFunctions.getChargeType failed =>", err)
            }
        });
    })

    .set(DbusAPIFunctions.setChargeStartThreshold, (newValue: number): Promise<boolean> => {
        return new Promise<boolean>((resolve: (value: boolean | PromiseLike<boolean>) => void, reject: (reason?: unknown) => void): void => {
            try {
                resolve(tccDBus.setChargeStartThreshold(newValue));
            } catch (err: unknown) {
                console.error("dbusBackendAPI: DbusAPIFunctions.setChargeStartThreshold failed =>", err)
            }
        });
    })

    .set(DbusAPIFunctions.setChargeEndThreshold, (newValue: number): Promise<boolean> => {
        return new Promise<boolean>((resolve: (value: boolean | PromiseLike<boolean>) => void, reject: (reason?: unknown) => void): void => {
            try {
                resolve(tccDBus.setChargeEndThreshold(newValue));
            } catch (err: unknown) {
                console.error("dbusBackendAPI: DbusAPIFunctions.setChargeEndThreshold failed =>", err)
            }
               resolve(true)
        });
    })


    .set(DbusAPIFunctions.setChargeType, (chargeType: ChargeType): Promise<boolean> => {
        return new Promise<boolean>((resolve: (value: boolean | PromiseLike<boolean>) => void, reject: (reason?: unknown) => void): void => {
            try {
                resolve(tccDBus.setChargeType(chargeType));
            } catch (err: unknown) {
                console.error("dbusBackendAPI: DbusAPIFunctions.setChargeType failed =>", err)
            }
        });
    })


    .set(DbusAPIFunctions.dbusAvailable, (): Promise<boolean> => {
        return new Promise<boolean>((resolve: (value: boolean | PromiseLike<boolean>) => void, reject: (reason?: unknown) => void): void => {
            try {
                resolve(tccDBus.dbusAvailable());
            } catch (err: unknown) {
                console.error("dbusBackendAPI: DbusAPIFunctions.dbusAvailable failed =>", err)
            }
        });
    })

    .set(DbusAPIFunctions.fanHwmonAvailable, (): Promise<boolean> => {

        return new Promise<boolean>((resolve: (value: boolean | PromiseLike<boolean>) => void, reject: (reason?: unknown) => void): void => {
            try {
                resolve(tccDBus.fanHwmonAvailable());
            } catch (err: unknown) {
                console.error("dbusBackendAPI: DbusAPIFunctions.fanHwmonAvailable failed =>", err)
            }

        });
    })

    .set(DbusAPIFunctions.getWebcamSWStatus, (): Promise<boolean> => {
        return new Promise<boolean>((resolve: (value: boolean | PromiseLike<boolean>) => void, reject: (reason?: unknown) => void): void => {
            try {
                resolve(tccDBus.getWebcamSWStatus());
            } catch (err: unknown) {
                console.error("dbusBackendAPI: DbusAPIFunctions.getWebcamSWStatus failed =>", err)
            }
        });
    })

    .set(DbusAPIFunctions.getDeviceJSON, async (): Promise<string> => {
        return new Promise<string>((resolve: (value: string | PromiseLike<string>) => void, reject: (reason?: unknown) => void): void => {
            try {
                resolve(tccDBus.getDeviceJSON());
            } catch (err: unknown) {
                console.error("dbusBackendAPI: DbusAPIFunctions.getDeviceJSON failed =>", err)
            }
        });
    })

    .set(DbusAPIFunctions.getNVIDIAPowerCTRLDefaultPowerLimit, async (): Promise<number> => {
        return new Promise<number>((resolve: (value: number | PromiseLike<number>) => void, reject: (reason?: unknown) => void): void => {
            resolve(tccDBus.getNVIDIAPowerCTRLDefaultPowerLimit());
        });
    })


    .set(DbusAPIFunctions.getNVIDIAPowerCTRLMaxPowerLimit, async (): Promise<number> => {
        return new Promise<number>((resolve: (value: number | PromiseLike<number>) => void, reject: (reason?: unknown) => void): void => {
            resolve(tccDBus.getNVIDIAPowerCTRLMaxPowerLimit());
        });
    })

    .set(DbusAPIFunctions.getHideCTGP, async (): Promise<boolean> => {
        return new Promise<boolean>((resolve: (value: boolean | PromiseLike<boolean>) => void, reject: (reason?: unknown) => void): void => {
            resolve(tccDBus.getHideCTGP());
        });
    })

    .set(DbusAPIFunctions.getNVIDIAPowerCTRLAvailable, async (): Promise<boolean> => {
        return new Promise<boolean>((resolve: (value: boolean | PromiseLike<boolean>) => void, reject: (reason?: unknown) => void): void => {
            resolve(tccDBus.getNVIDIAPowerCTRLAvailable());
        });
    });
