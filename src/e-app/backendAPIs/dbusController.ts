/*!
 * Copyright (c) 2019-2025 TUXEDO Computers GmbH <tux@tuxedocomputers.com>
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
import type { TDPInfo } from '../../native-lib/TuxedoIOAPI';
// todo: ChargeType is not used as a type here and thus can not have the type keyword, needs to be fixed
import { ChargeType } from '../../common/classes/PowerSupplyController';
import { app } from 'electron';
import { Mutex } from 'async-mutex';

export class TccDBusController {
    private busName: string = 'com.tuxedocomputers.tccd';
    private path: string = '/com/tuxedocomputers/tccd';
    private interfaceName: string = 'com.tuxedocomputers.tccd';
    private bus: dbus.MessageBus;
    private interface: dbus.ClientInterface;
    private dbusStatus: boolean = true;
    private mutex: Mutex = new Mutex();
    private dbusTimeout: boolean = false;

    constructor() {
        try {
            this.bus = dbus.systemBus();
        } catch (err: unknown) {
            console.error(`dbusController: constructor failed => ${err}`);
        }
    }

    async init(): Promise<boolean> {
        try {
            const proxyObject = await this.bus.getProxyObject(this.busName, this.path);
            this.interface = proxyObject.getInterface(this.interfaceName);
            return true;
        } catch (err: unknown) {
            console.error(`dbusController: init failed => ${err}`);
            app.exit(0);
            return false;
        }
    }

    async dbusAvailable(): Promise<boolean> {
        try {
            return await this.mutex.runExclusive(async (): Promise<boolean> => {
                if (!this.dbusTimeout) {
                    const status: boolean = await this.interface.dbusAvailable();

                    if (!this.dbusStatus && status) {
                        console.log('dbusController: dbusAvailable: dbus available');
                    }
                    this.dbusStatus = status;
                    return status;
                }
                return false;
            });
        } catch (err: unknown) {
            console.error('dbusController: dbusAvailable: dbus not available');
            this.dbusStatus = false;
            this.dbusTimeout = true;

            setTimeout((): void => {
                this.dbusTimeout = false;
                this.mutex.release();
            }, 2000);
            return false;
        }
    }

    async getNVIDIAPowerCTRLDefaultPowerLimit(): Promise<number> {
        try {
            if (this.dbusStatus && this.interface) {
                return await this.interface.GetNVIDIAPowerCTRLDefaultPowerLimit();
            }
        } catch (err: unknown) {
            this.dbusStatus = false;

            if (err instanceof dbus.DBusError) {
                console.error(`dbusController: getNVIDIAPowerCTRLDefaultPowerLimit failed => ${err?.text}`);
                return -1;
            }

            console.error(`dbusController: getNVIDIAPowerCTRLDefaultPowerLimit failed => ${err}`);
            return -1;
        }
    }

    async getNVIDIAPowerCTRLMaxPowerLimit(): Promise<number> {
        try {
            if (this.dbusStatus && this.interface) {
                return await this.interface.GetNVIDIAPowerCTRLMaxPowerLimit();
            }
        } catch (err: unknown) {
            this.dbusStatus = false;

            if (err instanceof dbus.DBusError) {
                console.error(`dbusController: getNVIDIAPowerCTRLMaxPowerLimit failed => ${err?.text}`);
                return -1;
            }

            console.error(`dbusController: getNVIDIAPowerCTRLMaxPowerLimit failed => ${err}`);
            return -1;
        }
    }

    async getNVIDIAPowerCTRLAvailable(): Promise<boolean> {
        try {
            if (this.dbusStatus && this.interface) {
                return await this.interface.GetNVIDIAPowerCTRLAvailable();
            }
        } catch (err: unknown) {
            this.dbusStatus = false;

            if (err instanceof dbus.DBusError) {
                console.error(`dbusController: getNVIDIAPowerCTRLAvailable failed => ${err?.text}`);
                return false;
            }

            console.error(`dbusController: getNVIDIAPowerCTRLAvailable failed => ${err}`);
            return false;
        }
    }
    async getIsUnsupportedConfigurableTGPDevice(): Promise<boolean> {
        try {
            if (this.dbusStatus && this.interface) {
                return await this.interface.GetIsUnsupportedConfigurableTGPDevice();
            }
        } catch (err: unknown) {
            this.dbusStatus = false;

            if (err instanceof dbus.DBusError) {
                console.error(`dbusController: getIsUnsupportedConfigurableTGPDevice failed => ${err?.text}`);
                return false;
            }

            console.error(`dbusController: getIsUnsupportedConfigurableTGPDevice failed => ${err}`);
            return false;
        }
    }
    async tuxedoWmiAvailable(): Promise<boolean> {
        try {
            if (this.dbusStatus && this.interface) {
                return await this.interface.TuxedoWmiAvailable();
            }
        } catch (err: unknown) {
            this.dbusStatus = false;

            if (err instanceof dbus.DBusError) {
                console.error(`dbusController: tuxedoWmiAvailable failed => ${err?.text}`);
                return false;
            }

            console.error(`dbusController: tuxedoWmiAvailable failed => ${err}`);
            return false;
        }
    }

    async fanHwmonAvailable(): Promise<boolean> {
        try {
            if (this.dbusStatus && this.interface) {
                return await this.interface.FanHwmonAvailable();
            }
        } catch (err: unknown) {
            this.dbusStatus = false;

            if (err instanceof dbus.DBusError) {
                console.error(`dbusController: fanHwmonAvailable failed => ${err?.text}`);
                return false;
            }

            console.error(`dbusController: fanHwmonAvailable failed => ${err}`);
            return false;
        }
    }

    async deviceHasAquaris(): Promise<boolean> {
        try {
            if (this.dbusStatus && this.interface) {
                return await this.interface.DeviceHasAquaris();
            }
        } catch (err: unknown) {
            this.dbusStatus = false;

            if (err instanceof dbus.DBusError) {
                console.error(`dbusController: deviceHasAquaris failed => ${err?.text}`);
                return false;
            }

            console.error(`dbusController: deviceHasAquaris failed => ${err}`);
            return false;
        }
    }

    async tccdVersion(): Promise<string> {
        try {
            if (this.dbusStatus && this.interface) {
                return await this.interface.TccdVersion();
            }
        } catch (err: unknown) {
            this.dbusStatus = false;

            if (err instanceof dbus.DBusError) {
                console.error(`dbusController: tccdVersion failed => ${err?.text}`);
                return '';
            }

            console.error(`dbusController: tccdVersion failed => ${err}`);
            return '';
        }
    }

    async getDeviceJSON(): Promise<string> {
        try {
            if (this.dbusStatus && this.interface) {
                return await this.interface.GetDeviceName();
            }
        } catch (err: unknown) {
            this.dbusStatus = false;

            if (err instanceof dbus.DBusError) {
                console.error(`dbusController: getDeviceJSON failed => ${err?.text}`);
                return '{}';
            }

            console.error(`dbusController: getDeviceJSON failed => ${err}`);
            return '{}';
        }
    }

    async getFanDataJSON(): Promise<string> {
        try {
            if (this.dbusStatus && this.interface) {
                return this.interface.GetFanDataJSON();
            }
        } catch (err: unknown) {
            this.dbusStatus = false;

            if (err instanceof dbus.DBusError) {
                console.error(`dbusController: getFanDataJSON failed => ${err?.text}`);
                return '{}';
            }

            console.error(`dbusController: getFanDataJSON failed => ${err}`);
            return '{}';
        }
    }

    async getDisplayModesJSON(): Promise<string> {
        try {
            if (this.dbusStatus && this.interface) {
                return await this.interface.GetDisplayModesJSON();
            }
        } catch (err: unknown) {
            this.dbusStatus = false;

            if (err instanceof dbus.DBusError) {
                console.error(`dbusController: getDisplayModesJSON failed => ${err?.text}`);
                return undefined;
            }

            console.error(`dbusController: getDisplayModesJSON failed => ${err}`);

            return undefined;
        }
    }

    async getIsX11(): Promise<number> {
        try {
            if (this.dbusStatus && this.interface) {
                return await this.interface.GetIsX11();
            }
        } catch (err: unknown) {
            this.dbusStatus = false;

            if (err instanceof dbus.DBusError) {
                console.error(`dbusController: getIsX11 failed => ${err?.text}`);
                return -1;
            }

            console.error(`dbusController: getIsX11 failed => ${err}`);
            return -1;
        }
    }

    async webcamSWAvailable(): Promise<boolean> {
        try {
            if (this.dbusStatus && this.interface) {
                return await this.interface.WebcamSWAvailable();
            }
        } catch (err: unknown) {
            this.dbusStatus = false;

            if (err instanceof dbus.DBusError) {
                console.error(`dbusController: webcamSWAvailable failed => ${err?.text}`);
                return false;
            }

            console.error(`dbusController: webcamSWAvailable failed => ${err}`);
            return false;
        }
    }

    async getWebcamSWStatus(): Promise<boolean> {
        try {
            if (this.dbusStatus && this.interface) {
                return await this.interface.GetWebcamSWStatus();
            }
        } catch (err: unknown) {
            this.dbusStatus = false;

            if (err instanceof dbus.DBusError) {
                console.error(`dbusController: getWebcamSWStatus failed => ${err?.text}`);
                return false;
            }

            console.error(`dbusController: getWebcamSWStatus failed => ${err}`);
            return false;
        }
    }

    async getForceYUV420OutputSwitchAvailable(): Promise<boolean> {
        try {
            if (this.dbusStatus && this.interface) {
                return await this.interface.GetForceYUV420OutputSwitchAvailable();
            }
        } catch (err: unknown) {
            this.dbusStatus = false;

            if (err instanceof dbus.DBusError) {
                console.error(`dbusController: getForceYUV420OutputSwitchAvailable failed => ${err?.text}`);
                return false;
            }

            console.error(`dbusController: getForceYUV420OutputSwitchAvailable failed => ${err}`);
            return false;
        }
    }

    async getIGpuInfoValuesJSON(): Promise<string> {
        try {
            if (this.dbusStatus && this.interface) {
                return await this.interface.GetIGpuInfoValuesJSON();
            }
        } catch (err: unknown) {
            this.dbusStatus = false;

            if (err instanceof dbus.DBusError) {
                console.error(`dbusController: getIGpuInfoValuesJSON failed => ${err?.text}`);
                return undefined;
            }

            console.error(`dbusController: getIGpuInfoValuesJSON failed => ${err}`);
            return undefined;
        }
    }

    async getDGpuInfoValuesJSON(): Promise<string> {
        try {
            if (this.dbusStatus && this.interface) {
                return await this.interface.GetDGpuInfoValuesJSON();
            }
        } catch (err: unknown) {
            this.dbusStatus = false;

            if (err instanceof dbus.DBusError) {
                console.error(`dbusController: getDGpuInfoValuesJSON failed => ${err?.text}`);
                return undefined;
            }

            console.error(`dbusController: getDGpuInfoValuesJSON failed => ${err}`);
            return undefined;
        }
    }

    async getIGpuAvailable(): Promise<number> {
        try {
            if (this.dbusStatus && this.interface) {
                return await this.interface.GetIGpuAvailable();
            }
        } catch (err: unknown) {
            this.dbusStatus = false;

            if (err instanceof dbus.DBusError) {
                console.error(`dbusController: getIGpuAvailable failed => ${err?.text}`);
                return undefined;
            }

            console.error(`dbusController: getIGpuAvailable failed => ${err}`);
            return undefined;
        }
    }

    async getDGpuAvailable(): Promise<number> {
        try {
            if (this.dbusStatus && this.interface) {
                return await this.interface.GetDGpuAvailable();
            }
        } catch (err: unknown) {
            this.dbusStatus = false;

            if (err instanceof dbus.DBusError) {
                console.error(`dbusController: getDGpuAvailable failed => ${err?.text}`);
                return undefined;
            }

            console.error(`dbusController: getDGpuAvailable failed => ${err}`);
            return undefined;
        }
    }

    async getPrimeState(): Promise<string> {
        try {
            if (this.dbusStatus && this.interface) {
                return await this.interface.GetPrimeState();
            }
        } catch (err: unknown) {
            this.dbusStatus = false;

            if (err instanceof dbus.DBusError) {
                console.error(`dbusController: getPrimeState failed => ${err?.text}`);
                return undefined;
            }

            console.error(`dbusController: getPrimeState failed => ${err}`);
            return undefined;
        }
    }

    async getCpuPowerValuesJSON(): Promise<string> {
        try {
            if (this.dbusStatus && this.interface) {
                return await this.interface.GetCpuPowerValuesJSON();
            }
        } catch (err: unknown) {
            this.dbusStatus = false;

            if (err instanceof dbus.DBusError) {
                console.error(`dbusController: getCpuPowerValuesJSON failed => ${err?.text}`);
                return undefined;
            }

            console.error(`dbusController: getCpuPowerValuesJSON failed => ${err}`);
            return undefined;
        }
    }

    async consumeModeReapplyPending(): Promise<boolean> {
        try {
            if (this.dbusStatus && this.interface) {
                return await this.interface.ConsumeModeReapplyPending();
            }
        } catch (err: unknown) {
            this.dbusStatus = false;

            if (err instanceof dbus.DBusError) {
                console.error(`dbusController: consumeModeReapplyPending failed => ${err?.text}`);
                return false;
            }

            console.error(`dbusController: consumeModeReapplyPending failed => ${err}`);

            return false;
        }
    }

    async getActiveProfileJSON(): Promise<string> {
        try {
            if (this.dbusStatus && this.interface) {
                return await this.interface.GetActiveProfileJSON();
            }
        } catch (err: unknown) {
            this.dbusStatus = false;

            if (err instanceof dbus.DBusError) {
                console.error(`dbusController: getActiveProfileJSON failed => ${err?.text}`);
                return undefined;
            }

            console.error(`dbusController: getActiveProfileJSON failed => ${err}`);
            return undefined;
        }
    }

    async setTempProfileById(profileId: string): Promise<boolean> {
        try {
            if (this.dbusStatus && this.interface) {
                return await this.interface.SetTempProfileById(profileId);
            }
        } catch (err: unknown) {
            this.dbusStatus = false;

            if (err instanceof dbus.DBusError) {
                console.error(`dbusController: setTempProfileById failed => ${err?.text}`);
                return false;
            }

            console.error(`dbusController: setTempProfileById failed => ${err}`);
            return false;
        }
    }

    async getProfilesJSON(): Promise<string> {
        try {
            if (this.dbusStatus && this.interface) {
                return await this.interface.GetProfilesJSON();
            }
        } catch (err: unknown) {
            this.dbusStatus = false;

            if (err instanceof dbus.DBusError) {
                console.error(`dbusController: getProfilesJSON failed => ${err?.text}`);
                return undefined;
            }

            console.error(`dbusController: getProfilesJSON failed => ${err}`);
            return undefined;
        }
    }

    async getCustomProfilesJSON(): Promise<string> {
        try {
            if (this.dbusStatus && this.interface) {
                return await this.interface.GetCustomProfilesJSON();
            }
        } catch (err: unknown) {
            this.dbusStatus = false;

            if (err instanceof dbus.DBusError) {
                console.error(`dbusController: getCustomProfilesJSON failed => ${err?.text}`);
                return undefined;
            }

            console.error(`dbusController: getCustomProfilesJSON failed => ${err}`);
            return undefined;
        }
    }

    async getDefaultProfilesJSON(): Promise<string> {
        try {
            if (this.dbusStatus && this.interface) {
                return await this.interface.GetDefaultProfilesJSON();
            }
        } catch (err: unknown) {
            this.dbusStatus = false;

            if (err instanceof dbus.DBusError) {
                console.error(`dbusController: getDefaultProfilesJSON failed => ${err?.text}`);
                return undefined;
            }

            console.error(`dbusController: getDefaultProfilesJSON failed => ${err}`);
            return undefined;
        }
    }

    async getDefaultValuesProfileJSON(): Promise<string> {
        try {
            if (this.dbusStatus && this.interface) {
                return await this.interface.GetDefaultValuesProfileJSON();
            }
        } catch (err: unknown) {
            this.dbusStatus = false;

            if (err instanceof dbus.DBusError) {
                console.error(`dbusController: getDefaultValuesProfileJSON failed => ${err?.text}`);
                return undefined;
            }

            console.error(`dbusController: getDefaultValuesProfileJSON failed => ${err}`);
            return undefined;
        }
    }

    async getSettingsJSON(): Promise<string> {
        try {
            if (this.dbusStatus && this.interface) {
                return await this.interface.GetSettingsJSON();
            }
        } catch (err: unknown) {
            this.dbusStatus = false;

            if (err instanceof dbus.DBusError) {
                console.error(`dbusController: getSettingsJSON failed => ${err?.text}`);
                return undefined;
            }

            console.error(`dbusController: getSettingsJSON failed => ${err}`);
            return undefined;
        }
    }

    async odmProfilesAvailable(): Promise<string[]> {
        try {
            if (this.dbusStatus && this.interface) {
                return await this.interface.ODMProfilesAvailable();
            }
        } catch (err: unknown) {
            this.dbusStatus = false;

            if (err instanceof dbus.DBusError) {
                console.error(`dbusController: odmProfilesAvailable failed => ${err?.text}`);
                return undefined;
            }

            console.error(`dbusController: odmProfilesAvailable failed => ${err}`);
            return undefined;
        }
    }

    async odmPowerLimits(): Promise<TDPInfo[]> {
        try {
            if (this.dbusStatus && this.interface) {
                return JSON.parse(await this.interface.ODMPowerLimitsJSON());
            }
        } catch (err: unknown) {
            this.dbusStatus = false;

            if (err instanceof dbus.DBusError) {
                console.error(`dbusController: odmPowerLimits failed => ${err?.text}`);
                return undefined;
            }

            console.error(`dbusController: odmPowerLimits failed => ${err}`);
            return undefined;
        }
    }

    async odmPowerLimitsJSON(): Promise<string> {
        try {
            if (this.dbusStatus && this.interface) {
                return await this.interface.ODMPowerLimitsJSON();
            }
        } catch (err: unknown) {
            this.dbusStatus = false;

            if (err instanceof dbus.DBusError) {
                console.error(`dbusController: odmPowerLimitsJSON failed => ${err?.text}`);
                return undefined;
            }

            console.error(`dbusController: odmPowerLimitsJSON failed => ${err}`);
            return undefined;
        }
    }

    async getKeyboardBacklightCapabilitiesJSON(): Promise<string> {
        try {
            if (this.dbusStatus && this.interface) {
                return await this.interface.GetKeyboardBacklightCapabilitiesJSON();
            }
        } catch (err: unknown) {
            this.dbusStatus = false;

            if (err instanceof dbus.DBusError) {
                console.error(`dbusController: getKeyboardBacklightCapabilitiesJSON failed => ${err?.text}`);
                return undefined;
            }

            console.error(`dbusController: getKeyboardBacklightCapabilitiesJSON failed => ${err}`);
            return undefined;
        }
    }

    async getKeyboardBacklightStatesJSON(): Promise<string> {
        try {
            if (this.dbusStatus && this.interface) {
                return await this.interface.GetKeyboardBacklightStatesJSON();
            }
        } catch (err: unknown) {
            this.dbusStatus = false;

            if (err instanceof dbus.DBusError) {
                console.error(`dbusController: getKeyboardBacklightStatesJSON failed => ${err?.text}`);
                return undefined;
            }

            console.error(`dbusController: getKeyboardBacklightStatesJSON failed => ${err}`);
            return undefined;
        }
    }

    async setKeyboardBacklightStatesJSON(keyboardBacklightStatesJSON: string): Promise<boolean> {
        try {
            if (this.dbusStatus && this.interface) {
                return await this.interface.SetKeyboardBacklightStatesJSON(keyboardBacklightStatesJSON);
            }
        } catch (err: unknown) {
            this.dbusStatus = false;

            if (err instanceof dbus.DBusError) {
                console.error(`dbusController: setKeyboardBacklightStatesJSON failed => ${err?.text}`);
                return undefined;
            }

            console.error(`dbusController: setKeyboardBacklightStatesJSON failed => ${err}`);
            return undefined;
        }
    }

    async getFansMinSpeed(): Promise<number> {
        try {
            if (this.dbusStatus && this.interface) {
                return await this.interface.GetFansMinSpeed();
            }
        } catch (err: unknown) {
            this.dbusStatus = false;

            if (err instanceof dbus.DBusError) {
                console.error(`dbusController: getFansMinSpeed failed => ${err?.text}`);
                return undefined;
            }

            console.error(`dbusController: getFansMinSpeed failed => ${err}`);
            return undefined;
        }
    }

    async getFansOffAvailable(): Promise<boolean> {
        try {
            if (this.dbusStatus && this.interface) {
                return await this.interface.GetFansOffAvailable();
            }
        } catch (err: unknown) {
            this.dbusStatus = false;

            if (err instanceof dbus.DBusError) {
                console.error(`dbusController: getFansOffAvailable failed => ${err?.text}`);
                return undefined;
            }

            console.error(`dbusController: getFansOffAvailable failed => ${err}`);
            return undefined;
        }
    }

    async getChargingProfilesAvailable(): Promise<string[]> {
        try {
            if (this.dbusStatus && this.interface) {
                return JSON.parse(await this.interface.GetChargingProfilesAvailable());
            }
        } catch (err: unknown) {
            this.dbusStatus = false;

            if (err instanceof dbus.DBusError) {
                console.error(`dbusController: getChargingProfilesAvailable failed => ${err?.text}`);
                return [];
            }

            console.error(`dbusController: getChargingProfilesAvailable failed => ${err}`);
            return [];
        }
    }

    async getCurrentChargingProfile(): Promise<string> {
        try {
            if (this.dbusStatus && this.interface) {
                return await this.interface.GetCurrentChargingProfile();
            }
        } catch (err: unknown) {
            this.dbusStatus = false;

            if (err instanceof dbus.DBusError) {
                console.error(`dbusController: getCurrentChargingProfile failed => ${err?.text}`);
                return '';
            }

            console.error(`dbusController: getCurrentChargingProfile failed => ${err}`);
            return '';
        }
    }

    async setChargingProfile(profileDescriptor: string): Promise<boolean> {
        try {
            if (this.dbusStatus && this.interface) {
                return await this.interface.SetChargingProfile(profileDescriptor);
            }
        } catch (err: unknown) {
            this.dbusStatus = false;

            if (err instanceof dbus.DBusError) {
                console.error(`dbusController: setChargingProfile failed => ${err?.text}`);
                return false;
            }

            console.error(`dbusController: setChargingProfile failed => ${err}`);
            return false;
        }
    }

    async getChargingPrioritiesAvailable(): Promise<string[]> {
        try {
            if (this.dbusStatus && this.interface) {
                return JSON.parse(await this.interface.GetChargingPrioritiesAvailable());
            }
        } catch (err: unknown) {
            this.dbusStatus = false;

            if (err instanceof dbus.DBusError) {
                console.error(`dbusController: getChargingPrioritiesAvailable failed => ${err?.text}`);
                return [];
            }

            console.error(`dbusController: getChargingPrioritiesAvailable failed => ${err}`);
            return [];
        }
    }

    async getCurrentChargingPriority(): Promise<string> {
        try {
            if (this.dbusStatus && this.interface) {
                return await this.interface.GetCurrentChargingPriority();
            }
        } catch (err: unknown) {
            this.dbusStatus = false;

            if (err instanceof dbus.DBusError) {
                console.error(`dbusController: getCurrentChargingPriority failed => ${err?.text}`);
                return '';
            }

            console.error(`dbusController: getCurrentChargingPriority failed => ${err}`);
            return '';
        }
    }

    async setChargingPriority(priorityDescriptor: string): Promise<boolean> {
        try {
            if (this.dbusStatus && this.interface) {
                return await this.interface.SetChargingPriority(priorityDescriptor);
            }
        } catch (err: unknown) {
            this.dbusStatus = false;

            if (err instanceof dbus.DBusError) {
                console.error(`dbusController: setChargingPriority failed => ${err?.text}`);
                return false;
            }

            console.error(`dbusController: setChargingPriority failed => ${err}`);
            return false;
        }
    }

    async getChargeStartAvailableThresholds(): Promise<number[]> {
        try {
            if (this.dbusStatus && this.interface) {
                return JSON.parse(await this.interface.GetChargeStartAvailableThresholds());
            }
        } catch (err: unknown) {
            this.dbusStatus = false;

            if (err instanceof dbus.DBusError) {
                console.error(`dbusController: getChargeStartAvailableThresholds failed => ${err?.text}`);
                return [];
            }

            console.error(`dbusController: getChargeStartAvailableThresholds failed => ${err}`);
            return [];
        }
    }

    async getChargeEndAvailableThresholds(): Promise<number[]> {
        try {
            if (this.dbusStatus && this.interface) {
                return JSON.parse(await this.interface.GetChargeEndAvailableThresholds());
            }
        } catch (err: unknown) {
            this.dbusStatus = false;

            if (err instanceof dbus.DBusError) {
                console.error(`dbusController: getChargeEndAvailableThresholds failed => ${err?.text}`);
                return [];
            }

            console.error(`dbusController: getChargeEndAvailableThresholds failed => ${err}`);
            return [];
        }
    }

    async getChargeStartThreshold(): Promise<number> {
        try {
            if (this.dbusStatus && this.interface) {
                return await this.interface.GetChargeStartThreshold();
            }
        } catch (err: unknown) {
            this.dbusStatus = false;

            if (err instanceof dbus.DBusError) {
                console.error(`dbusController: getChargeStartThreshold failed => ${err?.text}`);
                return undefined;
            }

            console.error(`dbusController: getChargeStartThreshold failed => ${err}`);
            return undefined;
        }
    }

    async setChargeStartThreshold(value: number): Promise<boolean> {
        try {
            if (this.dbusStatus && this.interface) {
                return await this.interface.SetChargeStartThreshold(value);
            }
        } catch (err: unknown) {
            this.dbusStatus = false;

            if (err instanceof dbus.DBusError) {
                console.error(`dbusController: setChargeStartThreshold failed => ${err?.text}`);
                return false;
            }

            console.error(`dbusController: setChargeStartThreshold failed => ${err}`);
            return false;
        }
    }

    async getChargeEndThreshold(): Promise<number> {
        try {
            if (this.dbusStatus && this.interface) {
                return await this.interface.GetChargeEndThreshold();
            }
        } catch (err: unknown) {
            this.dbusStatus = false;

            if (err instanceof dbus.DBusError) {
                console.error(`dbusController: getChargeEndThreshold failed => ${err?.text}`);
                return undefined;
            }

            console.error(`dbusController: getChargeEndThreshold failed => ${err}`);
            return undefined;
        }
    }

    async setChargeEndThreshold(value: number): Promise<boolean> {
        try {
            if (this.dbusStatus && this.interface) {
                return await this.interface.SetChargeEndThreshold(value);
            }
        } catch (err: unknown) {
            this.dbusStatus = false;

            if (err instanceof dbus.DBusError) {
                console.error(`dbusController: setChargeEndThreshold failed => ${err?.text}`);
                return false;
            }

            console.error(`dbusController: setChargeEndThreshold failed => ${err}`);
            return false;
        }
    }

    async getChargeType(): Promise<string> {
        try {
            if (this.dbusStatus && this.interface) {
                return await this.interface.GetChargeType();
            }
        } catch (err: unknown) {
            this.dbusStatus = false;

            if (err instanceof dbus.DBusError) {
                console.error(`dbusController: getChargeType failed => ${err?.text}`);
                return ChargeType.Unknown.toString();
            }

            console.error(`dbusController: getChargeType failed => ${err}`);
            return ChargeType.Unknown.toString();
        }
    }

    async setChargeType(chargeType: ChargeType): Promise<boolean> {
        try {
            if (this.dbusStatus && this.interface) {
                return await this.interface.SetChargeType(chargeType);
            }
        } catch (err: unknown) {
            this.dbusStatus = false;

            if (err instanceof dbus.DBusError) {
                console.error(`dbusController: setChargeType failed => ${err?.text}`);
                return false;
            }

            console.error(`dbusController: setChargeType failed => ${err}`);
            return false;
        }
    }

    async getFnLockSupported(): Promise<boolean> {
        try {
            if (this.dbusStatus && this.interface) {
                return await this.interface.GetFnLockSupported();
            }
        } catch (err: unknown) {
            this.dbusStatus = false;

            if (err instanceof dbus.DBusError) {
                console.error(`dbusController: getFnLockSupported failed => ${err?.text}`);
                return false;
            }

            console.error(`dbusController: getFnLockSupported failed => ${err}`);
            return false;
        }
    }

    async getFnLockStatus(): Promise<boolean> {
        try {
            if (this.dbusStatus && this.interface) {
                return await this.interface.GetFnLockStatus();
            }
        } catch (err: unknown) {
            this.dbusStatus = false;

            if (err instanceof dbus.DBusError) {
                console.error(`dbusController: getFnLockStatus failed => ${err?.text}`);
                return false;
            }

            console.error(`dbusController: getFnLockStatus failed => ${err}`);
            return false;
        }
    }

    async setFnLockStatus(status: boolean): Promise<boolean> {
        try {
            if (this.dbusStatus && this.interface) {
                return await this.interface.SetFnLockStatus(status);
            }
        } catch (err: unknown) {
            this.dbusStatus = false;

            if (err instanceof dbus.DBusError) {
                console.error(`dbusController: setFnLockStatus failed => ${err?.text}`);
                return false;
            }

            console.error(`dbusController: setFnLockStatus failed => ${err}`);
            return false;
        }
    }

    async setSensorDataCollectionStatus(status: boolean): Promise<boolean> {
        try {
            if (this.dbusStatus && this.interface) {
                return await this.interface.SetSensorDataCollectionStatus(status);
            }
        } catch (err: unknown) {
            this.dbusStatus = false;

            if (err instanceof dbus.DBusError) {
                console.error(`dbusController: setSensorDataCollectionStatus failed => ${err?.text}`);
                return false;
            }

            console.error(`dbusController: setSensorDataCollectionStatus failed => ${err}`);
            return false;
        }
    }

    async getSensorDataCollectionStatus(): Promise<boolean> {
        try {
            if (this.dbusStatus && this.interface) {
                return await this.interface.GetSensorDataCollectionStatus();
            }
        } catch (err: unknown) {
            this.dbusStatus = false;

            if (err instanceof dbus.DBusError) {
                console.error(`dbusController: getSensorDataCollectionStatus failed => ${err?.text}`);
                return false;
            }

            console.error(`dbusController: getSensorDataCollectionStatus failed => ${err}`);
            return false;
        }
    }

    async setDGpuD0Metrics(status: boolean): Promise<boolean> {
        try {
            if (this.dbusStatus && this.interface) {
                return await this.interface.SetDGpuD0Metrics(status);
            }
        } catch (err: unknown) {
            this.dbusStatus = false;

            if (err instanceof dbus.DBusError) {
                console.error(`dbusController: setDGpuD0Metrics failed => ${err?.text}`);
                return false;
            }

            console.error(`dbusController: setDGpuD0Metrics failed => ${err}`);
            return false;
        }
    }

    onModeReapplyPendingChanged(callback_function: () => void): boolean {
        try {
            if (this.dbusStatus && this.interface) {
                this.interface.on('ModeReapplyPendingChanged', callback_function);
            }
        } catch (err: unknown) {
            this.dbusStatus = false;

            if (err instanceof dbus.DBusError) {
                console.error(`dbusController: onModeReapplyPendingChanged failed => ${err?.text}`);
                return false;
            }

            console.error(`dbusController: onModeReapplyPendingChanged failed => ${err}`);
            return false;
        }
    }

    disconnect(): void {
        try {
            this.bus.disconnect();
        } catch (err: unknown) {
            console.error(`dbusController: disconnect failed => ${err}`);
        }
    }
}
