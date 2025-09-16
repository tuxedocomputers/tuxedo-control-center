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

import type { ChargeType } from "src/common/classes/PowerSupplyController";
import { dbusAPIHandle, DbusAPIFunctions} from "../../common/models/IDbusAPI"
const { ipcRenderer } = require('electron');

// for preload script
export const DbusClientAPI =
    {
        getVersion: (): Promise<string> => ipcRenderer.invoke(dbusAPIHandle, [DbusAPIFunctions.getVersion]),
        tuxedoWmiAvailable: (): Promise<boolean> => ipcRenderer.invoke(dbusAPIHandle, [DbusAPIFunctions.tuxedoWmiAvailable]),
        getFanData: (): Promise<string> => ipcRenderer.invoke(dbusAPIHandle, [DbusAPIFunctions.getFanData]),
        webcamSWAvailable: (): Promise<boolean> => ipcRenderer.invoke(dbusAPIHandle, [DbusAPIFunctions.webcamSWAvailable]),
        getWebcamSWStatus: (): Promise<boolean> => ipcRenderer.invoke(dbusAPIHandle, [DbusAPIFunctions.getWebcamSWStatus]),
        getForceYUV420OutputSwitchAvailable: (): Promise<boolean> => ipcRenderer.invoke(dbusAPIHandle, [DbusAPIFunctions.getForceYUV420OutputSwitchAvailable]),
        consumeModeReapplyPending: (): Promise<boolean> => ipcRenderer.invoke(dbusAPIHandle, [DbusAPIFunctions.consumeModeReapplyPending]),
        getActiveProfileJSON: (): Promise<string> => ipcRenderer.invoke(dbusAPIHandle, [DbusAPIFunctions.getActiveProfileJSON]),
        setTempProfileById: (profileId: string): Promise<boolean> => ipcRenderer.invoke(dbusAPIHandle, [DbusAPIFunctions.setTempProfileById, profileId]),
        getProfilesJSON: (): Promise<string> => ipcRenderer.invoke(dbusAPIHandle, [DbusAPIFunctions.getProfilesJSON]),
        getCustomProfilesJSON: (): Promise<string> => ipcRenderer.invoke(dbusAPIHandle, [DbusAPIFunctions.getCustomProfilesJSON]),
        getDefaultProfilesJSON: (): Promise<string> => ipcRenderer.invoke(dbusAPIHandle, [DbusAPIFunctions.getDefaultProfilesJSON]),
        getDefaultValuesProfileJSON: (): Promise<string> => ipcRenderer.invoke(dbusAPIHandle, [DbusAPIFunctions.getDefaultValuesProfileJSON]),
        getSettingsJSON: (): Promise<string> => ipcRenderer.invoke(dbusAPIHandle, [DbusAPIFunctions.getSettingsJSON]),
        odmProfilesAvailable: (): Promise<string[]> => ipcRenderer.invoke(dbusAPIHandle, [DbusAPIFunctions.odmProfilesAvailable]),
        odmPowerLimitsJSON: (): Promise<string> => ipcRenderer.invoke(dbusAPIHandle, [DbusAPIFunctions.odmPowerLimitsJSON]),
        getKeyboardBacklightCapabilitiesJSON: (): Promise<string> => ipcRenderer.invoke(dbusAPIHandle, [DbusAPIFunctions.getKeyboardBacklightCapabilitiesJSON]),
        getKeyboardBacklightStatesJSON: (): Promise<string> => ipcRenderer.invoke(dbusAPIHandle, [DbusAPIFunctions.getKeyboardBacklightStatesJSON]),
        setKeyboardBacklightStatesJSON: (keyboardBacklightStatesJSON: string): Promise<boolean> => ipcRenderer.invoke(dbusAPIHandle, [DbusAPIFunctions.setKeyboardBacklightStatesJSON, keyboardBacklightStatesJSON]),
        getFansMinSpeed: (): Promise<number> => ipcRenderer.invoke(dbusAPIHandle, [DbusAPIFunctions.getFansMinSpeed]),
        getFansOffAvailable: (): Promise<boolean> => ipcRenderer.invoke(dbusAPIHandle, [DbusAPIFunctions.getFansOffAvailable]),
        getChargingProfilesAvailable: (): Promise<string[]> => ipcRenderer.invoke(dbusAPIHandle, [DbusAPIFunctions.getChargingProfilesAvailable]),
        getCurrentChargingProfile: (): Promise<string> => ipcRenderer.invoke(dbusAPIHandle, [DbusAPIFunctions.getCurrentChargingProfile]),
        setChargingProfile: (profileDescriptor: string): Promise<boolean> => ipcRenderer.invoke(dbusAPIHandle, [DbusAPIFunctions.setChargingProfile, profileDescriptor]),
        getChargingPrioritiesAvailable: (): Promise<string[]> => ipcRenderer.invoke(dbusAPIHandle, [DbusAPIFunctions.getChargingPrioritiesAvailable]),
        getCurrentChargingPriority: (): Promise<string> => ipcRenderer.invoke(dbusAPIHandle, [DbusAPIFunctions.getCurrentChargingPriority]),
        setChargingPriority: (priorityDescriptor: string): Promise<boolean> => ipcRenderer.invoke(dbusAPIHandle, [DbusAPIFunctions.setChargingPriority, priorityDescriptor]),
        getDGpuInfoValuesJSON: (): Promise<string> => ipcRenderer.invoke(dbusAPIHandle, [DbusAPIFunctions.getDGpuInfoValuesJSON]),
        getIGpuInfoValuesJSON: (): Promise<string> => ipcRenderer.invoke(dbusAPIHandle, [DbusAPIFunctions.getIGpuInfoValuesJSON]),
        getSensorDataCollectionStatus: (): Promise<boolean> => ipcRenderer.invoke(dbusAPIHandle, [DbusAPIFunctions.getSensorDataCollectionStatus]),
        getPrimeState: (): Promise<string> => ipcRenderer.invoke(dbusAPIHandle, [DbusAPIFunctions.getPrimeState]),
        getCpuPowerValuesJSON: (): Promise<string> => ipcRenderer.invoke(dbusAPIHandle, [DbusAPIFunctions.getCpuPowerValuesJSON]),
        getDisplayModesJSON: (): Promise<string> => ipcRenderer.invoke(dbusAPIHandle, [DbusAPIFunctions.getDisplayModesJSON]),
        setSensorDataCollectionStatus: (status: boolean): Promise<boolean> => ipcRenderer.invoke(dbusAPIHandle, [DbusAPIFunctions.setSensorDataCollectionStatus, status]),
        setDGpuD0Metrics: (status: boolean): Promise<void> => ipcRenderer.invoke(dbusAPIHandle, [DbusAPIFunctions.setDGpuD0Metrics, status]),
        dbusAvailable: (): Promise<boolean> => ipcRenderer.invoke(dbusAPIHandle, [DbusAPIFunctions.dbusAvailable]),
        getChargeStartAvailableThresholds: (): Promise<number[]> => ipcRenderer.invoke(dbusAPIHandle, [DbusAPIFunctions.getChargeStartAvailableThresholds]),
        getChargeEndAvailableThresholds: (): Promise<number[]> => ipcRenderer.invoke(dbusAPIHandle, [DbusAPIFunctions.getChargeEndAvailableThresholds]),
        getChargeStartThreshold: (): Promise<number> => ipcRenderer.invoke(dbusAPIHandle, [DbusAPIFunctions.getChargeStartThreshold]),
        getChargeEndThreshold: (): Promise<number> => ipcRenderer.invoke(dbusAPIHandle, [DbusAPIFunctions.getChargeEndThreshold]),
        getChargeType: (): Promise<string> => ipcRenderer.invoke(dbusAPIHandle, [DbusAPIFunctions.getChargeType]),
        setChargeStartThreshold: (newValue: number): Promise<boolean> => ipcRenderer.invoke(dbusAPIHandle, [DbusAPIFunctions.setChargeStartThreshold, newValue]),
        setChargeEndThreshold: (newValue: number): Promise<boolean> => ipcRenderer.invoke(dbusAPIHandle, [DbusAPIFunctions.setChargeEndThreshold, newValue]),
        setChargeType: (chargeType: ChargeType): Promise<boolean> => ipcRenderer.invoke(dbusAPIHandle, [DbusAPIFunctions.setChargeType, chargeType]),
        fanHwmonAvailable: (): Promise<boolean> => ipcRenderer.invoke(dbusAPIHandle, [DbusAPIFunctions.fanHwmonAvailable]),
        getIsX11: (): Promise<number> => ipcRenderer.invoke(dbusAPIHandle, [DbusAPIFunctions.getIsX11]),
        getDeviceJSON: (): Promise<string> => ipcRenderer.invoke(dbusAPIHandle, [DbusAPIFunctions.getDeviceJSON]),
        getNVIDIAPowerCTRLDefaultPowerLimit: (): Promise<number> => ipcRenderer.invoke(dbusAPIHandle, [DbusAPIFunctions.getNVIDIAPowerCTRLDefaultPowerLimit]),
        getNVIDIAPowerCTRLMaxPowerLimit: (): Promise<number> => ipcRenderer.invoke(dbusAPIHandle, [DbusAPIFunctions.getNVIDIAPowerCTRLMaxPowerLimit]),
        getNVIDIAPowerCTRLAvailable: (): Promise<boolean> => ipcRenderer.invoke(dbusAPIHandle, [DbusAPIFunctions.getNVIDIAPowerCTRLAvailable]),
        getIsUnsupportedConfigurableTGPDevice: (): Promise<boolean> => ipcRenderer.invoke(dbusAPIHandle, [DbusAPIFunctions.getIsUnsupportedConfigurableTGPDevice])
    }

// for render.d.ts typescript definition
export interface IDbusClientAPI
{
    getVersion: () => string,
    tuxedoWmiAvailable: () => Promise<boolean>,
    getFanData: () => Promise<string>,
    webcamSWAvailable: () => Promise<boolean>,
    getWebcamSWStatus: () => Promise<boolean>,
    getForceYUV420OutputSwitchAvailable: () => Promise<boolean>,
    consumeModeReapplyPending: () => Promise<boolean>,
    getActiveProfileJSON: () => Promise<string>,
    setTempProfileById: (profileId: string) => Promise<boolean>,
    getProfilesJSON: () => Promise<string>,
    getCustomProfilesJSON: () => Promise<string>,
    getDefaultProfilesJSON: () => Promise<string>,
    getDefaultValuesProfileJSON: () => Promise<string>,
    getSettingsJSON: () => Promise<string>,
    odmProfilesAvailable: () => Promise<string[]>,
    odmPowerLimitsJSON: () => Promise<string>,
    getKeyboardBacklightCapabilitiesJSON: () => Promise<string>,
    getKeyboardBacklightStatesJSON: () => Promise<string>,
    setKeyboardBacklightStatesJSON: (keyboardBacklightStatesJSON: string) => Promise<boolean>,
    getFansMinSpeed: () => Promise<number>,
    getFansOffAvailable: () => Promise<boolean>,
    getChargingProfilesAvailable: () => Promise<string[]>,
    getCurrentChargingProfile: () => Promise<string>,
    setChargingProfile: (profileDescriptor: string) => Promise<boolean>,
    getChargingPrioritiesAvailable: () => Promise<string[]>,
    getCurrentChargingPriority: () => Promise<string>,
    setChargingPriority: (priorityDescriptor: string) => Promise<boolean>,
    getIGpuInfoValuesJSON: () => Promise<string>,
    getDGpuInfoValuesJSON: () => Promise<string>,
    getIGpuAvailable: () => Promise<number>,
    getDGpuAvailable: () => Promise<number>,
    getSensorDataCollectionStatus: () => Promise<boolean>,
    getPrimeState: () => Promise<string>,
    getCpuPowerValuesJSON: () => Promise<string>,
    getDisplayModesJSON: () => Promise<string>,
    setSensorDataCollectionStatus: (status) => Promise<boolean>,
    setDGpuD0Metrics: (status) => Promise<boolean>,
    dbusAvailable: () => Promise<boolean>,
    getChargeStartAvailableThresholds: () => Promise<number[]>,
    getChargeEndAvailableThresholds: () => Promise<number[]>,
    getChargeStartThreshold: () => Promise<number>,
    getChargeEndThreshold: () => Promise<number>,
    getChargeType: () => Promise<string>,
    setChargeStartThreshold: (newValue: number) => Promise<boolean>,
    setChargeEndThreshold: (newValue: number) => Promise<boolean>,
    setChargeType: (chargeType: ChargeType) => Promise<boolean>,
    fanHwmonAvailable: () => Promise<boolean>,
    getIsX11: () => Promise<number>,
    getDeviceJSON: () => Promise<string>,
    getNVIDIAPowerCTRLDefaultPowerLimit: () => Promise<number>,
    getNVIDIAPowerCTRLMaxPowerLimit: () => Promise<number>,
    getNVIDIAPowerCTRLAvailable: () => Promise<boolean>,
    getIsUnsupportedConfigurableTGPDevice: () => Promise<boolean>,
}