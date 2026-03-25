/*!
 * Copyright (c) 2019-2026 TUXEDO Computers GmbH <tux@tuxedocomputers.com>
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

export const dbusAPIHandle = 'dbusAPIHandle';

export enum DbusAPIFunctions {
    getVersion = 'getVersion',
    tuxedoWmiAvailable = 'tuxedoWmiAvailable',
    getFanData = 'getFanData',
    webcamSWAvailable = 'webcamSWAvailable',
    getWebcamSWStatus = 'getWebcamSWStatus',
    getForceYUV420OutputSwitchAvailable = 'getForceYUV420OutputSwitchAvailable',
    consumeModeReapplyPending = 'consumeModeReapplyPending',
    getActiveProfileJSON = 'getActiveProfileJSON',
    setTempProfileById = 'setTempProfileById',
    getProfilesJSON = 'getProfilesJSON',
    getCustomProfilesJSON = 'getCustomProfilesJSON',
    getDefaultProfilesJSON = 'getDefaultProfilesJSON',
    getDefaultValuesProfileJSON = 'getDefaultValuesProfileJSON',
    getSettingsJSON = 'getSettingsJSON',
    odmProfilesAvailable = 'odmProfilesAvailable',
    odmPowerLimitsJSON = 'odmPowerLimitsJSON',
    getKeyboardBacklightCapabilitiesJSON = 'getKeyboardBacklightCapabilitiesJSON',
    getKeyboardBacklightStatesJSON = 'getKeyboardBacklightStatesJSON',
    setKeyboardBacklightStatesJSON = 'setKeyboardBacklightStatesJSON',
    getFansMinSpeed = 'getFansMinSpeed',
    getFansOffAvailable = 'getFansOffAvailable',
    getChargingProfilesAvailable = 'getChargingProfilesAvailable',
    getCurrentChargingProfile = 'getCurrentChargingProfile',
    setChargingProfile = 'setChargingProfile',
    getChargingPrioritiesAvailable = 'getChargingPrioritiesAvailable',
    getCurrentChargingPriority = 'getCurrentChargingPriority',
    setChargingPriority = 'setChargingPriority',
    getIGpuInfoValuesJSON = 'getIGpuInfoValuesJSON',
    getDGpuInfoValuesJSON = 'getDGpuInfoValuesJSON',
    getIGpuAvailable = 'getIGpuAvailable',
    getDGpuAvailable = 'getDGpuAvailable',
    getSensorDataCollectionStatus = 'getSensorDataCollectionStatus',
    getPrimeState = 'getPrimeState',
    getCpuPowerValuesJSON = 'getCpuPowerValuesJSON',
    getDisplayModesJSON = 'getDisplayModesJSON',
    setSensorDataCollectionStatus = 'setSensorDataCollectionStatus',
    setDGpuD0Metrics = 'setDGpuD0Metrics',
    dbusAvailable = 'dbusAvailable',
    getChargeStartAvailableThresholds = 'getChargeStartAvailableThresholds',
    getChargeEndAvailableThresholds = 'getChargeEndAvailableThresholds',
    getChargeStartThreshold = 'getChargeStartThreshold',
    getChargeEndThreshold = 'getChargeEndThreshold',
    getChargeType = 'getChargeType',
    setChargeStartThreshold = 'setChargeStartThreshold',
    setChargeEndThreshold = 'setChargeEndThreshold',
    setChargeType = 'setChargeType',
    fanHwmonAvailable = 'fanHwmonAvailable',
    getIsX11 = 'getIsX11',
    getDeviceJSON = 'getDeviceJSON',
    getNVIDIAPowerCTRLDefaultPowerLimit = 'getNVIDIAPowerCTRLDefaultPowerLimit',
    getNVIDIAPowerCTRLMaxPowerLimit = 'getNVIDIAPowerCTRLMaxPowerLimit',
    getNVIDIAPowerCTRLAvailable = 'getNVIDIAPowerCTRLAvailable',
    getIsUnsupportedConfigurableTGPDevice = 'getIsUnsupportedConfigurableTGPDevice',
}
