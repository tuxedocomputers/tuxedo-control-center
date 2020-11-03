/*!
 * Copyright (c) 2019 TUXEDO Computers GmbH <tux@tuxedocomputers.com>
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
export enum ProfileStates {
    AC = 'power_ac',
    BAT = 'power_bat'
}

export interface ITccSettings {
    stateMap: any;
    shutdownTime: string | null;
    profileSwitchSettings: ProfileSwitchSettings;
}

export interface ProfileSwitchSettings {
    activate: boolean;
    days: string[];
    startTime: string| null;
    endTime: string| null;
    profileNameAC: string;
    profileNameBat: string;
    lastProfileNameAC: string;
    lastProfileNameBat: string;
}

export const defaultSettings: ITccSettings = {
    stateMap: {
        power_ac: 'Default',
        power_bat: 'Default'
    },
    shutdownTime: null,
    profileSwitchSettings: {
        activate: false,
        days: [],
        startTime: null,
        endTime: null,
        profileNameAC: "",
        profileNameBat: "",
        lastProfileNameAC: "",
        lastProfileNameBat: ""
    }
};

export const defaultSettingsXP1508UHD: ITccSettings = {
    stateMap: {
        power_ac: 'Default',
        power_bat: 'Custom XP1508 UHD'
    },
    shutdownTime: null,
    profileSwitchSettings: {
        activate: false,
        days: [],
        startTime: null,
        endTime: null,
        profileNameAC: "",
        profileNameBat: "",
        lastProfileNameAC: "",
        lastProfileNameBat: ""
    }
};
