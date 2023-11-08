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

import { TUXEDODevice, defaultCustomProfile, defaultMobileCustomProfileCl, defaultMobileCustomProfileTDP, defaultMobileCustomProfileID } from "./DefaultProfiles";

export enum ProfileStates {
    AC = 'power_ac',
    BAT = 'power_bat'
}

export enum KeyboardBacklightColorModes {
    static,
    breathing
}

export interface KeyboardBacklightCapabilitiesInterface {
    modes: Array<KeyboardBacklightColorModes>;
    zones: number;
    maxBrightness: number;
    maxRed: number;
    maxGreen: number;
    maxBlue: number;
}

export interface KeyboardBacklightStateInterface {
    mode: KeyboardBacklightColorModes;
    brightness: number;
    red: number;
    green: number;
    blue: number;
}

export interface ITccSettings {
    stateMap: any;
    shutdownTime: string | null;
    cpuSettingsEnabled: boolean;
    fanControlEnabled: boolean;
    keyboardBacklightControlEnabled: boolean;
    ycbcr420Workaround: Array<Object>;
    chargingProfile: string | null;
    chargingPriority: string | null;
    keyboardBacklightBrightness: number;
    keyboardBacklightColorMode: KeyboardBacklightColorModes;
    keyboardBacklightColor: Array<number>;
}

export const defaultSettings: ITccSettings = {
    stateMap: {
        power_ac: '__default_custom_profile__',
        power_bat: '__default_custom_profile__'
    },
    shutdownTime: null,
    cpuSettingsEnabled: true,
    fanControlEnabled: true,
    keyboardBacklightControlEnabled: true,
    ycbcr420Workaround: [],
    chargingProfile: null,
    chargingPriority: null,
    keyboardBacklightBrightness: undefined, // undefined is interpreted as "default brightness" aka 50% by tccd
    keyboardBacklightColorMode: KeyboardBacklightColorModes.static,
    keyboardBacklightColor: []
};

export const defaultSettingsXP1508UHD: ITccSettings = {
    stateMap: {
        power_ac: 'Default',
        power_bat: 'Custom XP1508 UHD'
    },
    shutdownTime: null,
    cpuSettingsEnabled: true,
    fanControlEnabled: true,
    keyboardBacklightControlEnabled: true,
    ycbcr420Workaround: [],
    chargingProfile: null,
    chargingPriority: null,
    keyboardBacklightBrightness: 0,
    keyboardBacklightColorMode: KeyboardBacklightColorModes.static,
    keyboardBacklightColor: []
};

export const defaultSettingsMobile: ITccSettings = {
    stateMap: {
        power_ac: defaultCustomProfile.id,
        power_bat: defaultMobileCustomProfileID
    },
    shutdownTime: null,
    cpuSettingsEnabled: true,
    fanControlEnabled: true,
    keyboardBacklightControlEnabled: true,
    ycbcr420Workaround: [],
    chargingProfile: null,
    chargingPriority: null,
    keyboardBacklightBrightness: undefined, // undefined is interpreted as "default brightness" aka 50% by tccd
    keyboardBacklightColorMode: KeyboardBacklightColorModes.static,
    keyboardBacklightColor: []
};

export const deviceCustomSettings: Map<TUXEDODevice, ITccSettings> = new Map();

deviceCustomSettings.set(TUXEDODevice.IBPG8, defaultSettingsMobile);
deviceCustomSettings.set(TUXEDODevice.AURA14G3, defaultSettingsMobile);
deviceCustomSettings.set(TUXEDODevice.AURA15G3, defaultSettingsMobile);