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

import type { ChargeType } from "../../common/classes/PowerSupplyController";
import { DbusAPIFunctions } from "../../common/models/IDbusAPI";
import { TccDBusController } from "./dbusController";

export const tccDBus = new TccDBusController();

export const dbusHandlers: Map<string, (...args: any[]) => any> = new Map<string, (...args: any[]) => any>()
    .set(DbusAPIFunctions.getVersion, (): Promise<string> => {
        return new Promise<string>((resolve: (value: string | PromiseLike<string>) => void, reject: (reason?: unknown) => void): void => {
            try {
                resolve(tccDBus.tccdVersion());
            } catch (err: unknown) {
                console.error(`dbusAPI: getVersion failed => ${err}`)
            }
        });
    })

    .set(DbusAPIFunctions.tuxedoWmiAvailable, (): Promise<boolean> => {
        return new Promise<boolean>((resolve: (value: boolean | PromiseLike<boolean>) => void, reject: (reason?: unknown) => void): void => {
            try {
                resolve(tccDBus.tuxedoWmiAvailable());
            } catch (err: unknown) {
                console.error(`dbusAPI: tuxedoWmiAvailable failed => ${err}`)
            }
        });
    })

    .set(DbusAPIFunctions.getFanData, (): Promise<string> => {
        return new Promise<string>((resolve: (value: string | PromiseLike<string>) => void, reject: (reason?: unknown) => void): void => {
            try {
                resolve(tccDBus.getFanDataJSON());
            } catch (err: unknown) {
                console.error(`dbusAPI: getFanData failed => ${err}`)
            }
        });
    })

    .set(DbusAPIFunctions.webcamSWAvailable, (): Promise<boolean> => {
        return new Promise<boolean>((resolve: (value: boolean | PromiseLike<boolean>) => void, reject: (reason?: unknown) => void): void => {
            try {
                resolve(tccDBus.webcamSWAvailable());
            } catch (err: unknown) {
                console.error(`dbusAPI: webcamSWAvailable failed => ${err}`)
            }
        });
    })

    .set(DbusAPIFunctions.getForceYUV420OutputSwitchAvailable, (): Promise<boolean> => {
        return new Promise<boolean>((resolve: (value: boolean | PromiseLike<boolean>) => void, reject: (reason?: unknown) => void): void => {
            try {
                resolve(tccDBus.getForceYUV420OutputSwitchAvailable());
            } catch (err: unknown) {
                console.error(`dbusAPI: getForceYUV420OutputSwitchAvailable failed => ${err}`)
            }
        });
    })

    .set(DbusAPIFunctions.consumeModeReapplyPending, (): Promise<boolean> => {
        return new Promise<boolean>((resolve: (value: boolean | PromiseLike<boolean>) => void, reject: (reason?: unknown) => void): void => {
            try {
                resolve(tccDBus.consumeModeReapplyPending());
            } catch (err: unknown) {
                console.error(`dbusAPI: consumeModeReapplyPending failed => ${err}`)
            }
        });
    })

    .set(DbusAPIFunctions.getActiveProfileJSON, (): Promise<string> => {
        return new Promise<string>((resolve: (value: string | PromiseLike<string>) => void, reject: (reason?: unknown) => void): void => {
            try {
                resolve(tccDBus.getActiveProfileJSON());
            } catch (err: unknown) {
                console.error(`dbusAPI: getActiveProfileJSON failed => ${err}`)
            }
        });
    })

    .set(DbusAPIFunctions.setTempProfileById, (profileId: string): Promise<boolean> => {
        return new Promise<boolean>((resolve: (value: boolean | PromiseLike<boolean>) => void, reject: (reason?: unknown) => void): void => {
            try {
                resolve(tccDBus.setTempProfileById(profileId));
            } catch (err: unknown) {
                console.error(`dbusAPI: setTempProfileById failed => ${err}`)
            }
        });
    })

    .set(DbusAPIFunctions.getProfilesJSON, (): Promise<string> => {
        return new Promise<string>((resolve: (value: string | PromiseLike<string>) => void, reject: (reason?: unknown) => void): void => {
            try {
                resolve(tccDBus.getProfilesJSON());
            } catch (err: unknown) {
                console.error(`dbusAPI: getProfilesJSON failed => ${err}`)
            }
        });
    })

    .set(DbusAPIFunctions.getCustomProfilesJSON, (): Promise<string> => {
        return new Promise<string>((resolve: (value: string | PromiseLike<string>) => void, reject: (reason?: unknown) => void): void => {
            try {
                resolve(tccDBus.getCustomProfilesJSON());
            } catch (err: unknown) {
                console.error(`dbusAPI: getCustomProfilesJSON failed => ${err}`)
            }
        });
    })

    .set(DbusAPIFunctions.getDefaultProfilesJSON, (): Promise<string> => {
        return new Promise<string>((resolve: (value: string | PromiseLike<string>) => void, reject: (reason?: unknown) => void): void => {
            try {
                resolve(tccDBus.getDefaultProfilesJSON());
            } catch (err: unknown) {
                console.error(`dbusAPI: getDefaultProfilesJSON failed => ${err}`)
            }
        });
    })

    .set(DbusAPIFunctions.getDefaultValuesProfileJSON, (): Promise<string> => {
        return new Promise<string>((resolve: (value: string | PromiseLike<string>) => void, reject: (reason?: unknown) => void): void => {
            try {
                resolve(tccDBus.getDefaultValuesProfileJSON());
            } catch (err: unknown) {
                console.error(`dbusAPI: getDefaultValuesProfileJSON failed => ${err}`)
            }
        });
    })

    .set(DbusAPIFunctions.getSettingsJSON, (): Promise<string> => {
        return new Promise<string>((resolve: (value: string | PromiseLike<string>) => void, reject: (reason?: unknown) => void): void => {
            try {
                resolve(tccDBus.getSettingsJSON());
            } catch (err: unknown) {
                console.error(`dbusAPI: getSettingsJSON failed => ${err}`)
            }
        });
    })

    .set(DbusAPIFunctions.odmProfilesAvailable, (): Promise<string[]> => {
        return new Promise<string[]>((resolve: (value: string[] | PromiseLike<string[]>) => void, reject: (reason?: unknown) => void): void => {
            try {
                resolve(tccDBus.odmProfilesAvailable());
            } catch (err: unknown) {
                console.error(`dbusAPI: odmProfilesAvailable failed => ${err}`)
            }
        });
    })

    .set(DbusAPIFunctions.odmPowerLimitsJSON, (): Promise<string> => {
        return new Promise<string>((resolve: (value: string | PromiseLike<string>) => void, reject: (reason?: unknown) => void): void => {
            try {
                resolve(tccDBus.odmPowerLimitsJSON());
            } catch (err: unknown) {
                console.error(`dbusAPI: odmPowerLimitsJSON failed => ${err}`)
            }
        });
    })

    .set(DbusAPIFunctions.getKeyboardBacklightCapabilitiesJSON, (): Promise<string> => {
        return new Promise<string>((resolve: (value: string | PromiseLike<string>) => void, reject: (reason?: unknown) => void): void => {
            try {
                resolve(tccDBus.getKeyboardBacklightCapabilitiesJSON());
            } catch (err: unknown) {
                console.error(`dbusAPI: getKeyboardBacklightCapabilitiesJSON failed => ${err}`)
            }
        });
    })

    .set(DbusAPIFunctions.getKeyboardBacklightStatesJSON, (): Promise<string> => {
        return new Promise<string>((resolve: (value: string | PromiseLike<string>) => void, reject: (reason?: unknown) => void): void => {
            try {
                resolve(tccDBus.getKeyboardBacklightStatesJSON());
            } catch (err: unknown) {
                console.error(`dbusAPI: getKeyboardBacklightStatesJSON failed => ${err}`)
            }
        });
    })

    .set(DbusAPIFunctions.setKeyboardBacklightStatesJSON, (keyboardBacklightStatesJSON: string): Promise<boolean> => {
        return new Promise<boolean>((resolve: (value: boolean | PromiseLike<boolean>) => void, reject: (reason?: unknown) => void): void => {
            try {
                resolve(tccDBus.setKeyboardBacklightStatesJSON(keyboardBacklightStatesJSON));
            } catch (err: unknown) {
                    console.error(`dbusAPI: setKeyboardBacklightStatesJSON failed => ${err}`)
            }
        });
    })

    .set(DbusAPIFunctions.getFansMinSpeed, (): Promise<number> => {
        return new Promise<number>((resolve: (value: number | PromiseLike<number>) => void, reject: (reason?: unknown) => void): void => {
        try {
            resolve(tccDBus.getFansMinSpeed());
        } catch (err: unknown) {
                console.error(`dbusAPI: getFansMinSpeed failed => ${err}`)
            }
        });
    })

    .set(DbusAPIFunctions.getFansOffAvailable, (): Promise<boolean> => {
        return new Promise<boolean>((resolve: (value: boolean | PromiseLike<boolean>) => void, reject: (reason?: unknown) => void): void => {
            try {
                resolve(tccDBus.getFansOffAvailable());
            } catch (err: unknown) {
                console.error(`dbusAPI: getFansOffAvailable failed => ${err}`)
            }
        });
    })

    .set(DbusAPIFunctions.getChargingProfilesAvailable, (): Promise<string[]> => {
        return new Promise<string[]>((resolve: (value: string[] | PromiseLike<string[]>) => void, reject: (reason?: unknown) => void): void => {
            try {
                resolve(tccDBus.getChargingProfilesAvailable());
            } catch (err: unknown) {
                console.error(`dbusAPI: getChargingProfilesAvailable failed => ${err}`)
            }
        });
    })

    .set(DbusAPIFunctions.getCurrentChargingProfile, (): Promise<string> => {
        return new Promise<string>((resolve: (value: string | PromiseLike<string>) => void, reject: (reason?: unknown) => void): void => {
            try {
                resolve(tccDBus.getCurrentChargingProfile());
            } catch (err: unknown) {
                console.error(`dbusAPI: getCurrentChargingProfile failed => ${err}`)
            }
        });
    })

    .set(DbusAPIFunctions.setChargingProfile, (profileDescriptor): Promise<boolean> => {
        return new Promise<boolean>((resolve: (value: boolean | PromiseLike<boolean>) => void, reject: (reason?: unknown) => void): void => {
            try {
                resolve(tccDBus.setChargingProfile(profileDescriptor));
            } catch (err: unknown) {
                console.error(`dbusAPI: setChargingProfile failed => ${err}`)
            }
        });
    })

    .set(DbusAPIFunctions.getChargingPrioritiesAvailable, (): Promise<string[]> => {
        return new Promise<string[]>((resolve: (value: string[] | PromiseLike<string[]>) => void, reject: (reason?: unknown) => void): void => {
            try {
                resolve(tccDBus.getChargingPrioritiesAvailable());
            } catch (err: unknown) {
                console.error(`dbusAPI: getChargingPrioritiesAvailable failed => ${err}`)
            }
        });
    })

    .set(DbusAPIFunctions.getCurrentChargingPriority, (): Promise<string> => {
        return new Promise<string>((resolve: (value: string | PromiseLike<string>) => void, reject: (reason?: unknown) => void): void => {
            try {
                resolve(tccDBus.getCurrentChargingPriority());
            } catch (err: unknown) {
                console.error(`dbusAPI: getCurrentChargingPriority failed => ${err}`)
            }
        });
    })

    .set(DbusAPIFunctions.setChargingPriority, (priorityDescriptor): Promise<boolean> => {

        return new Promise<boolean>((resolve: (value: boolean | PromiseLike<boolean>) => void, reject: (reason?: unknown) => void): void => {
            try {
                resolve(tccDBus.setChargingPriority(priorityDescriptor));
            } catch (err: unknown) {
                console.error(`dbusAPI: setChargingPriority failed => ${err}`)
            }
        });
    })

    .set(DbusAPIFunctions.getIGpuInfoValuesJSON, (): Promise<string> => {
        return new Promise<string>((resolve: (value: string | PromiseLike<string>) => void, reject: (reason?: unknown) => void): void => {
            try {
                resolve(tccDBus.getIGpuInfoValuesJSON());
            } catch (err: unknown) {
                console.error(`dbusAPI: getIGpuInfoValuesJSON failed => ${err}`)
            }
        });
    })
    
    .set(DbusAPIFunctions.getDGpuInfoValuesJSON, (): Promise<string> => {
        return new Promise<string>((resolve: (value: string | PromiseLike<string>) => void, reject: (reason?: unknown) => void): void => {
            try {
                resolve(tccDBus.getDGpuInfoValuesJSON());
            } catch (err: unknown) {
                console.error(`dbusAPI: getDGpuInfoValuesJSON failed => ${err}`)
            }
        });
    })

    .set(DbusAPIFunctions.getIGpuAvailable, (): Promise<number> => {
        return new Promise<number>((resolve: (value: number | PromiseLike<number>) => void, reject: (reason?: unknown) => void): void => {
            try {
                resolve(tccDBus.getIGpuAvailable());
            } catch (err: unknown) {
                console.error(`dbusAPI: getIGpuAvailable failed => ${err}`)
            }
        });
    })
    
    .set(DbusAPIFunctions.getDGpuAvailable, (): Promise<number> => {
        return new Promise<number>((resolve: (value: number | PromiseLike<number>) => void, reject: (reason?: unknown) => void): void => {
            try {
                resolve(tccDBus.getDGpuAvailable());
            } catch (err: unknown) {
                console.error(`dbusAPI: getDGpuAvailable failed => ${err}`)
            }
        });
    })

    .set(DbusAPIFunctions.getSensorDataCollectionStatus, (): Promise<boolean> => {
        return new Promise<boolean>((resolve: (value: boolean | PromiseLike<boolean>) => void, reject: (reason?: unknown) => void): void => {
            try {
                resolve(tccDBus.getSensorDataCollectionStatus());
            } catch (err: unknown) {
                console.error(`dbusAPI: getSensorDataCollectionStatus failed => ${err}`)
            }
        });
    })

    .set(DbusAPIFunctions.getPrimeState, (): Promise<string> => {
        return new Promise<string>((resolve: (value: string | PromiseLike<string>) => void, reject: (reason?: unknown) => void): void => {
            try {
                resolve(tccDBus.getPrimeState());
            } catch (err: unknown) {
                console.error(`dbusAPI: getPrimeState failed => ${err}`)
            }
        });
    })

    .set(DbusAPIFunctions.getCpuPowerValuesJSON, (): Promise<string> => {
        return new Promise<string>((resolve: (value: string | PromiseLike<string>) => void, reject: (reason?: unknown) => void): void => {
            try {
                resolve(tccDBus.getCpuPowerValuesJSON());
            } catch (err: unknown) {
                console.error(`dbusAPI: getCpuPowerValuesJSON failed => ${err}`)
            }
        });
    })

    .set(DbusAPIFunctions.getDisplayModesJSON, (): Promise<string> => {
        return new Promise<string>((resolve: (value: string | PromiseLike<string>) => void, reject: (reason?: unknown) => void): void => {
            try {
                resolve(tccDBus.getDisplayModesJSON());
            } catch (err: unknown) {
                console.error(`dbusAPI: getDisplayModesJSON failed => ${err}`)
            }
        });
    })

    .set(DbusAPIFunctions.getIsX11, (): Promise<number> => {
        return new Promise<number>((resolve: (value: number | PromiseLike<number>) => void, reject: (reason?: unknown) => void): void => {
            try {
                resolve(tccDBus.getIsX11());
            } catch (err: unknown) {
                console.error(`dbusAPI: getIsX11 failed => ${err}`)
            }
        });
    })

    .set(DbusAPIFunctions.setSensorDataCollectionStatus, (status: boolean): Promise<boolean> => {
        return new Promise<boolean>((resolve: (value: boolean | PromiseLike<boolean>) => void, reject: (reason?: unknown) => void): void => {
            try {
                resolve(tccDBus.setSensorDataCollectionStatus(status));
            } catch (err: unknown) {
                console.error(`dbusAPI: setSensorDataCollectionStatus failed => ${err}`)
            }
        });
    })

    .set(DbusAPIFunctions.setDGpuD0Metrics, (status: boolean): Promise<boolean> => {
        return new Promise<boolean>((resolve: (value: boolean | PromiseLike<boolean>) => void, reject: (reason?: unknown) => void): void => {
            try {
                resolve(tccDBus.setDGpuD0Metrics(status));
            } catch (err: unknown) {
                console.error(`dbusAPI: setDGpuD0Metrics failed => ${err}`)
            }
        });
    })

    .set(DbusAPIFunctions.getChargeStartAvailableThresholds, (): Promise<number[]> => {
        return new Promise<number[]>((resolve: (value: number[] | PromiseLike<number[]>) => void, reject: (reason?: unknown) => void): void => {
            try {
                resolve(tccDBus.getChargeStartAvailableThresholds());
            } catch (err: unknown) {
                console.error(`dbusAPI: getChargeStartAvailableThresholds failed => ${err}`)
            }
        });
    })

    .set(DbusAPIFunctions.getChargeEndAvailableThresholds, (): Promise<number[]> => {
        return new Promise<number[]>((resolve: (value: number[] | PromiseLike<number[]>) => void, reject: (reason?: unknown) => void): void => {
            try {
                resolve(tccDBus.getChargeEndAvailableThresholds());
            } catch (err: unknown) {
                console.error(`dbusAPI: getChargeEndAvailableThresholds failed => ${err}`)
            }
        });
    })

    .set(DbusAPIFunctions.getChargeStartThreshold, (): Promise<number> => {
        return new Promise<number>((resolve: (value: number | PromiseLike<number>) => void, reject: (reason?: unknown) => void): void => {
            try {
                resolve(tccDBus.getChargeStartThreshold());
            } catch (err: unknown) {
                console.error(`dbusAPI: getChargeStartThreshold failed => ${err}`)
            }
        });
    })

    .set(DbusAPIFunctions.getChargeEndThreshold, (): Promise<number> => {
        return new Promise<number>((resolve: (value: number | PromiseLike<number>) => void, reject: (reason?: unknown) => void): void => {
            try {
                resolve(tccDBus.getChargeEndThreshold());
            } catch (err: unknown) {
                console.error(`dbusAPI: getChargeEndThreshold failed => ${err}`)
            }
        });
    })

    .set(DbusAPIFunctions.getChargeType, (): Promise<string> => {
        return new Promise<string>((resolve: (value: string | PromiseLike<string>) => void, reject: (reason?: unknown) => void): void => {
            try {
                resolve(tccDBus.getChargeType());
            } catch (err: unknown) {
                console.error(`dbusAPI: getChargeType failed => ${err}`)
            }
        });
    })

    .set(DbusAPIFunctions.setChargeStartThreshold, (newValue: number): Promise<boolean> => {
        return new Promise<boolean>((resolve: (value: boolean | PromiseLike<boolean>) => void, reject: (reason?: unknown) => void): void => {
            try {
                resolve(tccDBus.setChargeStartThreshold(newValue));
            } catch (err: unknown) {
                console.error(`dbusAPI: setChargeStartThreshold failed => ${err}`)
            }
        });
    })

    .set(DbusAPIFunctions.setChargeEndThreshold, (newValue: number): Promise<boolean> => {
        return new Promise<boolean>((resolve: (value: boolean | PromiseLike<boolean>) => void, reject: (reason?: unknown) => void): void => {
            try {
                resolve(tccDBus.setChargeEndThreshold(newValue));
            } catch (err: unknown) {
                console.error(`dbusAPI: setChargeEndThreshold failed => ${err}`)
            }
               resolve(true)
        });
    })


    .set(DbusAPIFunctions.setChargeType, (chargeType: ChargeType): Promise<boolean> => {
        return new Promise<boolean>((resolve: (value: boolean | PromiseLike<boolean>) => void, reject: (reason?: unknown) => void): void => {
            try {
                resolve(tccDBus.setChargeType(chargeType));
            } catch (err: unknown) {
                console.error(`dbusAPI: setChargeType failed => ${err}`)
            }
        });
    })


    .set(DbusAPIFunctions.dbusAvailable, (): Promise<boolean> => {
        return new Promise<boolean>((resolve: (value: boolean | PromiseLike<boolean>) => void, reject: (reason?: unknown) => void): void => {
            try {
                resolve(tccDBus.dbusAvailable());
            } catch (err: unknown) {
                console.error(`dbusAPI: dbusAvailable failed => ${err}`)
            }
        });
    })

    .set(DbusAPIFunctions.fanHwmonAvailable, (): Promise<boolean> => {

        return new Promise<boolean>((resolve: (value: boolean | PromiseLike<boolean>) => void, reject: (reason?: unknown) => void): void => {
            try {
                resolve(tccDBus.fanHwmonAvailable());
            } catch (err: unknown) {
                console.error(`dbusAPI: fanHwmonAvailable failed => ${err}`)
            }

        });
    })

    .set(DbusAPIFunctions.getWebcamSWStatus, (): Promise<boolean> => {
        return new Promise<boolean>((resolve: (value: boolean | PromiseLike<boolean>) => void, reject: (reason?: unknown) => void): void => {
            try {
                resolve(tccDBus.getWebcamSWStatus());
            } catch (err: unknown) {
                console.error(`dbusAPI: getWebcamSWStatus failed => ${err}`)
            }
        });
    })

    .set(DbusAPIFunctions.getDeviceJSON, async (): Promise<string> => {
        return new Promise<string>((resolve: (value: string | PromiseLike<string>) => void, reject: (reason?: unknown) => void): void => {
            try {
                resolve(tccDBus.getDeviceJSON());
            } catch (err: unknown) {
                console.error(`dbusAPI: getDeviceJSON failed => ${err}`)
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

    .set(DbusAPIFunctions.getIsUnsupportedConfigurableTGPDevice, async (): Promise<boolean> => {
        return new Promise<boolean>((resolve: (value: boolean | PromiseLike<boolean>) => void, reject: (reason?: unknown) => void): void => {
            resolve(tccDBus.getIsUnsupportedConfigurableTGPDevice());
        });
    })

    .set(DbusAPIFunctions.getNVIDIAPowerCTRLAvailable, async (): Promise<boolean> => {
        return new Promise<boolean>((resolve: (value: boolean | PromiseLike<boolean>) => void, reject: (reason?: unknown) => void): void => {
            resolve(tccDBus.getNVIDIAPowerCTRLAvailable());
        });
    });
