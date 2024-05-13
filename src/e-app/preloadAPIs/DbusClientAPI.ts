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

import { dbusAPIHandle, DbusAPIFunctions} from "../../common/models/IDbusAPI"
const { ipcRenderer } = require('electron');

// for preload script
export const DbusClientAPI =
    {
        getVersion: () => ipcRenderer.invoke(dbusAPIHandle, [DbusAPIFunctions.getVersion]),
        tuxedoWmiAvailable: () => ipcRenderer.invoke(dbusAPIHandle, [DbusAPIFunctions.tuxedoWmiAvailable]),
        getFanData: () => ipcRenderer.invoke(dbusAPIHandle, [DbusAPIFunctions.getFanData]),
        webcamSWAvailable: () => ipcRenderer.invoke(dbusAPIHandle, [DbusAPIFunctions.webcamSWAvailable]),
        getWebcamSWStatus: () => ipcRenderer.invoke(dbusAPIHandle, [DbusAPIFunctions.getWebcamSWStatus]),
        getForceYUV420OutputSwitchAvailable: () => ipcRenderer.invoke(dbusAPIHandle, [DbusAPIFunctions.getForceYUV420OutputSwitchAvailable]),
        consumeModeReapplyPending: () => ipcRenderer.invoke(dbusAPIHandle, [DbusAPIFunctions.consumeModeReapplyPending]),
        getActiveProfileJSON: () => ipcRenderer.invoke(dbusAPIHandle, [DbusAPIFunctions.getActiveProfileJSON]),
        setTempProfileById: (profileId) => ipcRenderer.invoke(dbusAPIHandle, [DbusAPIFunctions.setTempProfileById, profileId]),
        getProfilesJSON: () => ipcRenderer.invoke(dbusAPIHandle, [DbusAPIFunctions.getProfilesJSON]),
        getCustomProfilesJSON: () => ipcRenderer.invoke(dbusAPIHandle, [DbusAPIFunctions.getCustomProfilesJSON]),
        getDefaultProfilesJSON: () => ipcRenderer.invoke(dbusAPIHandle, [DbusAPIFunctions.getDefaultProfilesJSON]),
        getDefaultValuesProfileJSON: () => ipcRenderer.invoke(dbusAPIHandle, [DbusAPIFunctions.getDefaultValuesProfileJSON]),
        getSettingsJSON: () => ipcRenderer.invoke(dbusAPIHandle, [DbusAPIFunctions.getSettingsJSON]),
        odmProfilesAvailable: () => ipcRenderer.invoke(dbusAPIHandle, [DbusAPIFunctions.odmProfilesAvailable]),
        odmPowerLimitsJSON: () => ipcRenderer.invoke(dbusAPIHandle, [DbusAPIFunctions.odmPowerLimitsJSON]),
        getKeyboardBacklightCapabilitiesJSON: () => ipcRenderer.invoke(dbusAPIHandle, [DbusAPIFunctions.getKeyboardBacklightCapabilitiesJSON]),
        getKeyboardBacklightStatesJSON: () => ipcRenderer.invoke(dbusAPIHandle, [DbusAPIFunctions.getKeyboardBacklightStatesJSON]),
        setKeyboardBacklightStatesJSON: (keyboardBacklightStatesJSON) => ipcRenderer.invoke(dbusAPIHandle, [DbusAPIFunctions.setKeyboardBacklightStatesJSON, keyboardBacklightStatesJSON]),
        getFansMinSpeed: () => ipcRenderer.invoke(dbusAPIHandle, [DbusAPIFunctions.getFansMinSpeed]),
        getFansOffAvailable: () => ipcRenderer.invoke(dbusAPIHandle, [DbusAPIFunctions.getFansOffAvailable]),
        getChargingProfilesAvailable: () => ipcRenderer.invoke(dbusAPIHandle, [DbusAPIFunctions.getChargingProfilesAvailable]),
        getCurrentChargingProfile: () => ipcRenderer.invoke(dbusAPIHandle, [DbusAPIFunctions.getCurrentChargingProfile]),
        setChargingProfile: (profileDescriptor) => ipcRenderer.invoke(dbusAPIHandle, [DbusAPIFunctions.setChargingProfile, profileDescriptor]),
        getChargingPrioritiesAvailable: () => ipcRenderer.invoke(dbusAPIHandle, [DbusAPIFunctions.getChargingPrioritiesAvailable]),
        getCurrentChargingPriority: () => ipcRenderer.invoke(dbusAPIHandle, [DbusAPIFunctions.getCurrentChargingPriority]),
        setChargingPriority: (priorityDescriptor) => ipcRenderer.invoke(dbusAPIHandle, [DbusAPIFunctions.setChargingPriority, priorityDescriptor]),   
        getDGpuInfoValuesJSON: () => ipcRenderer.invoke(dbusAPIHandle, [DbusAPIFunctions.getDGpuInfoValuesJSON]),
        getIGpuInfoValuesJSON: () => ipcRenderer.invoke(dbusAPIHandle, [DbusAPIFunctions.getIGpuInfoValuesJSON]),
        getSensorDataCollectionStatus: () => ipcRenderer.invoke(dbusAPIHandle, [DbusAPIFunctions.getSensorDataCollectionStatus]),
        getPrimeState: () => ipcRenderer.invoke(dbusAPIHandle, [DbusAPIFunctions.getPrimeState]),
        getCpuPowerValuesJSON: () => ipcRenderer.invoke(dbusAPIHandle, [DbusAPIFunctions.getCpuPowerValuesJSON]),
        getDisplayModesJSON: () => ipcRenderer.invoke(dbusAPIHandle, [DbusAPIFunctions.getDisplayModesJSON]),
        setSensorDataCollectionStatus: (status) => ipcRenderer.invoke(dbusAPIHandle, [DbusAPIFunctions.setSensorDataCollectionStatus, status]),
        setDGpuD0Metrics: (status) => ipcRenderer.invoke(dbusAPIHandle, [DbusAPIFunctions.setDGpuD0Metrics, status]),
        dbusAvailable: () => ipcRenderer.invoke(dbusAPIHandle, [DbusAPIFunctions.dbusAvailable]),
        getChargeStartAvailableThresholds: () => ipcRenderer.invoke(dbusAPIHandle, [DbusAPIFunctions.getChargeStartAvailableThresholds]),
        getChargeEndAvailableThresholds: () => ipcRenderer.invoke(dbusAPIHandle, [DbusAPIFunctions.getChargeEndAvailableThresholds]),
        getChargeStartThreshold: () => ipcRenderer.invoke(dbusAPIHandle, [DbusAPIFunctions.getChargeStartThreshold]),
        getChargeEndThreshold: () => ipcRenderer.invoke(dbusAPIHandle, [DbusAPIFunctions.getChargeEndThreshold]),
        getChargeType: () => ipcRenderer.invoke(dbusAPIHandle, [DbusAPIFunctions.getChargeType]),
        setChargeStartThreshold: (newValue) => ipcRenderer.invoke(dbusAPIHandle, [DbusAPIFunctions.setChargeStartThreshold, newValue]),
        setChargeEndThreshold: (newValue) => ipcRenderer.invoke(dbusAPIHandle, [DbusAPIFunctions.setChargeEndThreshold, newValue]),
        setChargeType: (chargeType) => ipcRenderer.invoke(dbusAPIHandle, [DbusAPIFunctions.setChargeType, chargeType]),
        fanHwmonAvailable: () => ipcRenderer.invoke(dbusAPIHandle, [DbusAPIFunctions.fanHwmonAvailable]),
        getIsX11: () => ipcRenderer.invoke(dbusAPIHandle, [DbusAPIFunctions.getIsX11]),
        getDeviceJSON: () => ipcRenderer.invoke(dbusAPIHandle, [DbusAPIFunctions.getDeviceJSON])
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
    getDGpuInfoValuesJSON: () => Promise<string>,
    getIGpuInfoValuesJSON: () => Promise<string>,
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
    setChargeType: (chargeType) => Promise<boolean>,
    fanHwmonAvailable: () => Promise<boolean>,
    getIsX11: () => Promise<boolean>,
    getDeviceJSON: () => Promise<string>,
 
}