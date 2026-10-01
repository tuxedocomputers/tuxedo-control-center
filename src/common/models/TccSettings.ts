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

import { defaultCustomProfile, defaultMobileCustomProfileID, TUXEDODevice } from './DefaultProfiles';

export enum ProfileStates {
    AC = 'power_ac',
    BAT = 'power_bat',
}

export enum KeyboardColorModes {
    static,
    breathing,
}

export interface KeyboardCapabilitiesInterface {
    modes?: KeyboardColorModes[];
    zones: number;
    maxBrightness: number;
    // colors optional because of white only keyboard
    maxRed?: number;
    maxGreen?: number;
    maxBlue?: number;
}

export interface LightbarCapabilitiesInterface {
    maxBrightness: number;
    maxRed: number;
    maxGreen: number;
    maxBlue: number;
}

export interface KeyboardStateInterface {
    mode: KeyboardColorModes;
    brightness: number;
    red: number;
    green: number;
    blue: number;
}

export interface LightbarStateInterface {
    brightness: number;
    red: number;
    green: number;
    blue: number;
}

export interface ITccSettings {
    fahrenheit: boolean;
    stateMap: {
        power_ac: string;
        power_bat: string;
    };
    shutdownTime: string | null;
    cpuSettingsEnabled: boolean;
    fanControlEnabled: boolean;
    keyboardBacklightControlEnabled: boolean;
    ycbcr420Workaround: Array<Object>;
    chargingProfile: string | null;
    chargingPriority: string | null;
    keyboardBacklightStates?: KeyboardStateInterface[];
    keyboardStates: KeyboardStateInterface[];
    lightbarStates: LightbarStateInterface | null;
}

export const defaultSettings: ITccSettings = {
    fahrenheit: false,
    stateMap: {
        power_ac: '__default_custom_profile__',
        power_bat: '__default_custom_profile__',
    },
    shutdownTime: null,
    cpuSettingsEnabled: true,
    fanControlEnabled: true,
    keyboardBacklightControlEnabled: true,
    ycbcr420Workaround: [],
    chargingProfile: null,
    chargingPriority: null,
    keyboardStates: [],
    lightbarStates: null,
};

export const defaultSettingsXP1508UHD: ITccSettings = {
    fahrenheit: false,
    stateMap: {
        power_ac: 'Default',
        power_bat: 'Custom XP1508 UHD',
    },
    shutdownTime: null,
    cpuSettingsEnabled: true,
    fanControlEnabled: true,
    keyboardBacklightControlEnabled: true,
    ycbcr420Workaround: [],
    chargingProfile: null,
    chargingPriority: null,
    keyboardStates: [],
    lightbarStates: null,
};

const defaultSettingsMobile: ITccSettings = {
    fahrenheit: false,
    stateMap: {
        power_ac: defaultCustomProfile.id,
        power_bat: defaultMobileCustomProfileID,
    },
    shutdownTime: null,
    cpuSettingsEnabled: true,
    fanControlEnabled: true,
    keyboardBacklightControlEnabled: true,
    ycbcr420Workaround: [],
    chargingProfile: null,
    chargingPriority: null,
    keyboardStates: [],
    lightbarStates: null,
};

export const deviceCustomSettings: Map<TUXEDODevice, ITccSettings> = new Map();

deviceCustomSettings.set(TUXEDODevice.IBPG8, defaultSettingsMobile);
deviceCustomSettings.set(TUXEDODevice.AURA14G3, defaultSettingsMobile);
deviceCustomSettings.set(TUXEDODevice.AURA15G3, defaultSettingsMobile);
