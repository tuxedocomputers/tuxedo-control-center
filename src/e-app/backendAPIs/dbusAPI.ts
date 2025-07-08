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
                console.error("dbusAPI: DbusAPIFunctions.getVersion failed =>", err)
            }
        });
    })

    .set(DbusAPIFunctions.tuxedoWmiAvailable, (): Promise<boolean> => {
        return new Promise<boolean>((resolve: (value: boolean | PromiseLike<boolean>) => void, reject: (reason?: unknown) => void): void => {
            try {
                resolve(tccDBus.tuxedoWmiAvailable());
            } catch (err: unknown) {
                console.error("dbusAPI: DbusAPIFunctions.tuxedoWmiAvailable failed =>", err)
            }
        });
    })

    .set(DbusAPIFunctions.getFanData, (): Promise<string> => {
        return new Promise<string>((resolve: (value: string | PromiseLike<string>) => void, reject: (reason?: unknown) => void): void => {
            try {
                resolve(tccDBus.getFanDataJSON());
            } catch (err: unknown) {
                console.error("dbusAPI: DbusAPIFunctions.getFanData failed =>", err)
            }
        });
    })

    .set(DbusAPIFunctions.webcamSWAvailable, (): Promise<boolean> => {
        return new Promise<boolean>((resolve: (value: boolean | PromiseLike<boolean>) => void, reject: (reason?: unknown) => void): void => {
            try {
                resolve(tccDBus.webcamSWAvailable());
            } catch (err: unknown) {
                console.error("dbusAPI: DbusAPIFunctions.webcamSWAvailable failed =>", err)
            }
        });
    })

    .set(DbusAPIFunctions.getForceYUV420OutputSwitchAvailable, (): Promise<boolean> => {
        return new Promise<boolean>((resolve: (value: boolean | PromiseLike<boolean>) => void, reject: (reason?: unknown) => void): void => {
            try {
                resolve(tccDBus.getForceYUV420OutputSwitchAvailable());
            } catch (err: unknown) {
                console.error("dbusAPI: DbusAPIFunctions.getForceYUV420OutputSwitchAvailable failed =>", err)
            }
        });
    })

    .set(DbusAPIFunctions.consumeModeReapplyPending, (): Promise<boolean> => {
        return new Promise<boolean>((resolve: (value: boolean | PromiseLike<boolean>) => void, reject: (reason?: unknown) => void): void => {
            try {
                resolve(tccDBus.consumeModeReapplyPending());
            } catch (err: unknown) {
                console.error("dbusAPI: DbusAPIFunctions.consumeModeReapplyPending failed =>", err)
            }
        });
    })

    .set(DbusAPIFunctions.getActiveProfileJSON, (): Promise<string> => {
        return new Promise<string>((resolve: (value: string | PromiseLike<string>) => void, reject: (reason?: unknown) => void): void => {
            try {
                resolve(tccDBus.getActiveProfileJSON());
            } catch (err: unknown) {
                console.error("dbusAPI: DbusAPIFunctions.getActiveProfileJSON failed =>", err)
            }
        });
    })

    .set(DbusAPIFunctions.setTempProfileById, (profileId: string): Promise<boolean> => {
        return new Promise<boolean>((resolve: (value: boolean | PromiseLike<boolean>) => void, reject: (reason?: unknown) => void): void => {
            try {
                resolve(tccDBus.setTempProfileById(profileId));
            } catch (err: unknown) {
                console.error("dbusAPI: DbusAPIFunctions.setTempProfileById failed =>", err)
            }
        });
    })

    .set(DbusAPIFunctions.getProfilesJSON, (): Promise<string> => {
        return new Promise<string>((resolve: (value: string | PromiseLike<string>) => void, reject: (reason?: unknown) => void): void => {
            try {
                resolve(tccDBus.getProfilesJSON());
            } catch (err: unknown) {
                console.error("dbusAPI: DbusAPIFunctions.getProfilesJSON failed =>", err)
            }
        });
    })

    .set(DbusAPIFunctions.getCustomProfilesJSON, (): Promise<string> => {
        return new Promise<string>((resolve: (value: string | PromiseLike<string>) => void, reject: (reason?: unknown) => void): void => {
            try {
                resolve(tccDBus.getCustomProfilesJSON());
            } catch (err: unknown) {
                console.error("dbusAPI: DbusAPIFunctions.getCustomProfilesJSON failed =>", err)
            }
        });
    })

    .set(DbusAPIFunctions.getDefaultProfilesJSON, (): Promise<string> => {
        return new Promise<string>((resolve: (value: string | PromiseLike<string>) => void, reject: (reason?: unknown) => void): void => {
            try {
                resolve(tccDBus.getDefaultProfilesJSON());
            } catch (err: unknown) {
                console.error("dbusAPI: DbusAPIFunctions.getDefaultProfilesJSON failed =>", err)
            }
        });
    })

    .set(DbusAPIFunctions.getDefaultValuesProfileJSON, (): Promise<string> => {
        return new Promise<string>((resolve: (value: string | PromiseLike<string>) => void, reject: (reason?: unknown) => void): void => {
            try {
                resolve(tccDBus.getDefaultValuesProfileJSON());
            } catch (err: unknown) {
                console.error("dbusAPI: DbusAPIFunctions.getDefaultValuesProfileJSON failed =>", err)
            }
        });
    })

    .set(DbusAPIFunctions.getSettingsJSON, (): Promise<string> => {
        return new Promise<string>((resolve: (value: string | PromiseLike<string>) => void, reject: (reason?: unknown) => void): void => {
            try {
                resolve(tccDBus.getSettingsJSON());
            } catch (err: unknown) {
                console.error("dbusAPI: DbusAPIFunctions.getSettingsJSON failed =>", err)
            }
        });
    })

    .set(DbusAPIFunctions.odmProfilesAvailable, (): Promise<string[]> => {
        return new Promise<string[]>((resolve: (value: string[] | PromiseLike<string[]>) => void, reject: (reason?: unknown) => void): void => {
            try {
                resolve(tccDBus.odmProfilesAvailable());
            } catch (err: unknown) {
                console.error("dbusAPI: DbusAPIFunctions.odmProfilesAvailable failed =>", err)
            }
        });
    })

    .set(DbusAPIFunctions.odmPowerLimitsJSON, (): Promise<string> => {
        return new Promise<string>((resolve: (value: string | PromiseLike<string>) => void, reject: (reason?: unknown) => void): void => {
            try {
                resolve(tccDBus.odmPowerLimitsJSON());
            } catch (err: unknown) {
                console.error("dbusAPI: DbusAPIFunctions.odmPowerLimitsJSON failed =>", err)
            }
        });
    })

    .set(DbusAPIFunctions.getKeyboardBacklightCapabilitiesJSON, (): Promise<string> => {
        return new Promise<string>((resolve: (value: string | PromiseLike<string>) => void, reject: (reason?: unknown) => void): void => {
            try {
                resolve(tccDBus.getKeyboardBacklightCapabilitiesJSON());
            } catch (err: unknown) {
                console.error("dbusAPI: DbusAPIFunctions.getKeyboardBacklightCapabilitiesJSON failed =>", err)
            }
        });
    })

    .set(DbusAPIFunctions.getKeyboardBacklightStatesJSON, (): Promise<string> => {
        return new Promise<string>((resolve: (value: string | PromiseLike<string>) => void, reject: (reason?: unknown) => void): void => {
            try {
                resolve(tccDBus.getKeyboardBacklightStatesJSON());
            } catch (err: unknown) {
                console.error("dbusAPI: DbusAPIFunctions.getKeyboardBacklightStatesJSON failed =>", err)
            }
        });
    })

    .set(DbusAPIFunctions.setKeyboardBacklightStatesJSON, (keyboardBacklightStatesJSON: string): Promise<boolean> => {
        return new Promise<boolean>((resolve: (value: boolean | PromiseLike<boolean>) => void, reject: (reason?: unknown) => void): void => {
            try {
                resolve(tccDBus.setKeyboardBacklightStatesJSON(keyboardBacklightStatesJSON));
            } catch (err: unknown) {
                    console.error("dbusAPI: DbusAPIFunctions.setKeyboardBacklightStatesJSON failed =>", err)
            }
        });
    })

    .set(DbusAPIFunctions.getFansMinSpeed, (): Promise<number> => {
        return new Promise<number>((resolve: (value: number | PromiseLike<number>) => void, reject: (reason?: unknown) => void): void => {
        try {
            resolve(tccDBus.getFansMinSpeed());
        } catch (err: unknown) {
                console.error("dbusAPI: DbusAPIFunctions.getFansMinSpeed failed =>", err)
            }
        });
    })

    .set(DbusAPIFunctions.getFansOffAvailable, (): Promise<boolean> => {
        return new Promise<boolean>((resolve: (value: boolean | PromiseLike<boolean>) => void, reject: (reason?: unknown) => void): void => {
            try {
                resolve(tccDBus.getFansOffAvailable());
            } catch (err: unknown) {
                console.error("dbusAPI: DbusAPIFunctions.getFansOffAvailable failed =>", err)
            }
        });
    })

    .set(DbusAPIFunctions.getChargingProfilesAvailable, (): Promise<string[]> => {
        return new Promise<string[]>((resolve: (value: string[] | PromiseLike<string[]>) => void, reject: (reason?: unknown) => void): void => {
            try {
                resolve(tccDBus.getChargingProfilesAvailable());
            } catch (err: unknown) {
                console.error("dbusAPI: DbusAPIFunctions.getChargingProfilesAvailable failed =>", err)
            }
        });
    })

    .set(DbusAPIFunctions.getCurrentChargingProfile, (): Promise<string> => {
        return new Promise<string>((resolve: (value: string | PromiseLike<string>) => void, reject: (reason?: unknown) => void): void => {
            try {
                resolve(tccDBus.getCurrentChargingProfile());
            } catch (err: unknown) {
                console.error("dbusAPI: DbusAPIFunctions.getCurrentChargingProfile failed =>", err)
            }
        });
    })

    .set(DbusAPIFunctions.setChargingProfile, (profileDescriptor): Promise<boolean> => {
        return new Promise<boolean>((resolve: (value: boolean | PromiseLike<boolean>) => void, reject: (reason?: unknown) => void): void => {
            try {
                resolve(tccDBus.setChargingProfile(profileDescriptor));
            } catch (err: unknown) {
                console.error("dbusAPI: DbusAPIFunctions.setChargingProfile failed =>", err)
            }
        });
    })

    .set(DbusAPIFunctions.getChargingPrioritiesAvailable, (): Promise<string[]> => {
        return new Promise<string[]>((resolve: (value: string[] | PromiseLike<string[]>) => void, reject: (reason?: unknown) => void): void => {
            try {
                resolve(tccDBus.getChargingPrioritiesAvailable());
            } catch (err: unknown) {
                console.error("dbusAPI: DbusAPIFunctions.getChargingPrioritiesAvailable failed =>", err)
            }
        });
    })

    .set(DbusAPIFunctions.getCurrentChargingPriority, (): Promise<string> => {
        return new Promise<string>((resolve: (value: string | PromiseLike<string>) => void, reject: (reason?: unknown) => void): void => {
            try {
                resolve(tccDBus.getCurrentChargingPriority());
            } catch (err: unknown) {
                console.error("dbusAPI: DbusAPIFunctions.getCurrentChargingPriority failed =>", err)
            }
        });
    })

    .set(DbusAPIFunctions.setChargingPriority, (priorityDescriptor): Promise<boolean> => {

        return new Promise<boolean>((resolve: (value: boolean | PromiseLike<boolean>) => void, reject: (reason?: unknown) => void): void => {
            try {
                resolve(tccDBus.setChargingPriority(priorityDescriptor));
            } catch (err: unknown) {
                console.error("dbusAPI: DbusAPIFunctions.setChargingPriority failed =>", err)
            }
        });
    })

    .set(DbusAPIFunctions.getDGpuInfoValuesJSON, (): Promise<string> => {
        return new Promise<string>((resolve: (value: string | PromiseLike<string>) => void, reject: (reason?: unknown) => void): void => {
            try {
                resolve(tccDBus.getDGpuInfoValuesJSON());
            } catch (err: unknown) {
                console.error("dbusAPI: DbusAPIFunctions.getDGpuInfoValuesJSON failed =>", err)
            }
        });
    })

    .set(DbusAPIFunctions.getIGpuInfoValuesJSON, (): Promise<string> => {
        return new Promise<string>((resolve: (value: string | PromiseLike<string>) => void, reject: (reason?: unknown) => void): void => {
            try {
                resolve(tccDBus.getIGpuInfoValuesJSON());
            } catch (err: unknown) {
                console.error("dbusAPI: DbusAPIFunctions.getIGpuInfoValuesJSON failed =>", err)
            }
        });
    })

    .set(DbusAPIFunctions.getSensorDataCollectionStatus, (): Promise<boolean> => {
        return new Promise<boolean>((resolve: (value: boolean | PromiseLike<boolean>) => void, reject: (reason?: unknown) => void): void => {
            try {
                resolve(tccDBus.getSensorDataCollectionStatus());
            } catch (err: unknown) {
                console.error("dbusAPI: DbusAPIFunctions.getSensorDataCollectionStatus failed =>", err)
            }
        });
    })

    .set(DbusAPIFunctions.getPrimeState, (): Promise<string> => {
        return new Promise<string>((resolve: (value: string | PromiseLike<string>) => void, reject: (reason?: unknown) => void): void => {
            try {
                resolve(tccDBus.getPrimeState());
            } catch (err: unknown) {
                console.error("dbusAPI: DbusAPIFunctions.getPrimeState failed =>", err)
            }
        });
    })

    .set(DbusAPIFunctions.getCpuPowerValuesJSON, (): Promise<string> => {
        return new Promise<string>((resolve: (value: string | PromiseLike<string>) => void, reject: (reason?: unknown) => void): void => {
            try {
                resolve(tccDBus.getCpuPowerValuesJSON());
            } catch (err: unknown) {
                console.error("dbusAPI: DbusAPIFunctions.getCpuPowerValuesJSON failed =>", err)
            }
        });
    })

    .set(DbusAPIFunctions.getDisplayModesJSON, (): Promise<string> => {
        return new Promise<string>((resolve: (value: string | PromiseLike<string>) => void, reject: (reason?: unknown) => void): void => {
            try {
                resolve(tccDBus.getDisplayModesJSON());
            } catch (err: unknown) {
                console.error("dbusAPI: DbusAPIFunctions.getDisplayModesJSON failed =>", err)
            }
        });
    })

    .set(DbusAPIFunctions.getIsX11, (): Promise<number> => {
        return new Promise<number>((resolve: (value: number | PromiseLike<number>) => void, reject: (reason?: unknown) => void): void => {
            try {
                resolve(tccDBus.getIsX11());
            } catch (err: unknown) {
                console.error("dbusAPI: DbusAPIFunctions.getIsX11 failed =>", err)
            }
        });
    })

    .set(DbusAPIFunctions.setSensorDataCollectionStatus, (status: boolean): Promise<boolean> => {
        return new Promise<boolean>((resolve: (value: boolean | PromiseLike<boolean>) => void, reject: (reason?: unknown) => void): void => {
            try {
                resolve(tccDBus.setSensorDataCollectionStatus(status));
            } catch (err: unknown) {
                console.error("dbusAPI: DbusAPIFunctions.setSensorDataCollectionStatus failed =>", err)
            }
        });
    })

    .set(DbusAPIFunctions.setDGpuD0Metrics, (status: boolean): Promise<boolean> => {
        return new Promise<boolean>((resolve: (value: boolean | PromiseLike<boolean>) => void, reject: (reason?: unknown) => void): void => {
            try {
                resolve(tccDBus.setDGpuD0Metrics(status));
            } catch (err: unknown) {
                console.error("dbusAPI: DbusAPIFunctions.setDGpuD0Metrics failed =>", err)
            }
        });
    })

    .set(DbusAPIFunctions.getChargeStartAvailableThresholds, (): Promise<number[]> => {
        return new Promise<number[]>((resolve: (value: number[] | PromiseLike<number[]>) => void, reject: (reason?: unknown) => void): void => {
            try {
                resolve(tccDBus.getChargeStartAvailableThresholds());
            } catch (err: unknown) {
                console.error("dbusAPI: DbusAPIFunctions.getChargeStartAvailableThresholds failed =>", err)
            }
        });
    })

    .set(DbusAPIFunctions.getChargeEndAvailableThresholds, (): Promise<number[]> => {
        return new Promise<number[]>((resolve: (value: number[] | PromiseLike<number[]>) => void, reject: (reason?: unknown) => void): void => {
            try {
                resolve(tccDBus.getChargeEndAvailableThresholds());
            } catch (err: unknown) {
                console.error("dbusAPI: DbusAPIFunctions.getChargeEndAvailableThresholds failed =>", err)
            }
        });
    })

    .set(DbusAPIFunctions.getChargeStartThreshold, (): Promise<number> => {
        return new Promise<number>((resolve: (value: number | PromiseLike<number>) => void, reject: (reason?: unknown) => void): void => {
            try {
                resolve(tccDBus.getChargeStartThreshold());
            } catch (err: unknown) {
                console.error("dbusAPI: DbusAPIFunctions.getChargeStartThreshold failed =>", err)
            }
        });
    })

    .set(DbusAPIFunctions.getChargeEndThreshold, (): Promise<number> => {
        return new Promise<number>((resolve: (value: number | PromiseLike<number>) => void, reject: (reason?: unknown) => void): void => {
            try {
                resolve(tccDBus.getChargeEndThreshold());
            } catch (err: unknown) {
                console.error("dbusAPI: DbusAPIFunctions.getChargeEndThreshold failed =>", err)
            }
        });
    })

    .set(DbusAPIFunctions.getChargeType, (): Promise<string> => {
        return new Promise<string>((resolve: (value: string | PromiseLike<string>) => void, reject: (reason?: unknown) => void): void => {
            try {
                resolve(tccDBus.getChargeType());
            } catch (err: unknown) {
                console.error("dbusAPI: DbusAPIFunctions.getChargeType failed =>", err)
            }
        });
    })

    .set(DbusAPIFunctions.setChargeStartThreshold, (newValue: number): Promise<boolean> => {
        return new Promise<boolean>((resolve: (value: boolean | PromiseLike<boolean>) => void, reject: (reason?: unknown) => void): void => {
            try {
                resolve(tccDBus.setChargeStartThreshold(newValue));
            } catch (err: unknown) {
                console.error("dbusAPI: DbusAPIFunctions.setChargeStartThreshold failed =>", err)
            }
        });
    })

    .set(DbusAPIFunctions.setChargeEndThreshold, (newValue: number): Promise<boolean> => {
        return new Promise<boolean>((resolve: (value: boolean | PromiseLike<boolean>) => void, reject: (reason?: unknown) => void): void => {
            try {
                resolve(tccDBus.setChargeEndThreshold(newValue));
            } catch (err: unknown) {
                console.error("dbusAPI: DbusAPIFunctions.setChargeEndThreshold failed =>", err)
            }
               resolve(true)
        });
    })


    .set(DbusAPIFunctions.setChargeType, (chargeType: ChargeType): Promise<boolean> => {
        return new Promise<boolean>((resolve: (value: boolean | PromiseLike<boolean>) => void, reject: (reason?: unknown) => void): void => {
            try {
                resolve(tccDBus.setChargeType(chargeType));
            } catch (err: unknown) {
                console.error("dbusAPI: DbusAPIFunctions.setChargeType failed =>", err)
            }
        });
    })


    .set(DbusAPIFunctions.dbusAvailable, (): Promise<boolean> => {
        return new Promise<boolean>((resolve: (value: boolean | PromiseLike<boolean>) => void, reject: (reason?: unknown) => void): void => {
            try {
                resolve(tccDBus.dbusAvailable());
            } catch (err: unknown) {
                console.error("dbusAPI: DbusAPIFunctions.dbusAvailable failed =>", err)
            }
        });
    })

    .set(DbusAPIFunctions.fanHwmonAvailable, (): Promise<boolean> => {

        return new Promise<boolean>((resolve: (value: boolean | PromiseLike<boolean>) => void, reject: (reason?: unknown) => void): void => {
            try {
                resolve(tccDBus.fanHwmonAvailable());
            } catch (err: unknown) {
                console.error("dbusAPI: DbusAPIFunctions.fanHwmonAvailable failed =>", err)
            }

        });
    })

    .set(DbusAPIFunctions.getWebcamSWStatus, (): Promise<boolean> => {
        return new Promise<boolean>((resolve: (value: boolean | PromiseLike<boolean>) => void, reject: (reason?: unknown) => void): void => {
            try {
                resolve(tccDBus.getWebcamSWStatus());
            } catch (err: unknown) {
                console.error("dbusAPI: DbusAPIFunctions.getWebcamSWStatus failed =>", err)
            }
        });
    })

    .set(DbusAPIFunctions.getDeviceJSON, async (): Promise<string> => {
        return new Promise<string>((resolve: (value: string | PromiseLike<string>) => void, reject: (reason?: unknown) => void): void => {
            try {
                resolve(tccDBus.getDeviceJSON());
            } catch (err: unknown) {
                console.error("dbusAPI: DbusAPIFunctions.getDeviceJSON failed =>", err)
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
