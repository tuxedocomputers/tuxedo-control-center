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

import { DefaultProfileIDs, LegacyDefaultProfileIDs } from "./DefaultProfiles";
import { ITccFanProfile } from "./TccFanTable";

export interface ITccProfile {
    id: string;
    name: string;
    description: string;
    display: ITccProfileDisplay;
    cpu: ITccProfileCpu;
    webcam: ITccProfileWebCam;
    fan: ITccProfileFanControl;
    odmProfile: ITccODMProfile;
    odmPowerLimits: ITccODMPowerLimits;
    nvidiaPowerCTRLProfile: ITccNVIDIAPowerCTRLProfile;
}

export class TccProfile implements ITccProfile {
    id: string;
    name: string;
    description: string;
    display: ITccProfileDisplay;
    cpu: ITccProfileCpu;
    webcam: ITccProfileWebCam;
    fan: ITccProfileFanControl;
    odmProfile: ITccODMProfile;
    odmPowerLimits: ITccODMPowerLimits;
    nvidiaPowerCTRLProfile: ITccNVIDIAPowerCTRLProfile;
    public constructor(init: ITccProfile) {
        this.id = init.id;
        this.name = init.name;
        this.description = init.description;
        this.display = JSON.parse(JSON.stringify(init.display));
        this.cpu = JSON.parse(JSON.stringify(init.cpu));
        this.webcam = JSON.parse(JSON.stringify(init.webcam));
        this.fan = JSON.parse(JSON.stringify(init.fan));
        this.odmProfile = JSON.parse(JSON.stringify(init.odmProfile));
        this.odmPowerLimits = JSON.parse(JSON.stringify(init.odmPowerLimits));
        this.nvidiaPowerCTRLProfile = JSON.parse(JSON.stringify(init.nvidiaPowerCTRLProfile));
    }
}

interface ITccProfileDisplay {
    brightness: number;
    useBrightness: boolean;
    refreshRate: number;
    useRefRate: boolean;
    xResolution: number;
    yResolution: number;
    useResolution: boolean;
}

interface ITccProfileCpu {
    onlineCores: number;
    useMaxPerfGov: boolean;
    scalingMinFrequency: number;
    scalingMaxFrequency: number;
    governor: string; // unused: see CpuWorker.ts->applyCpuProfile(...)
    energyPerformancePreference: string;
    noTurbo: boolean;
}

interface ITccProfileWebCam {
    status: boolean;
    useStatus: boolean;
}

interface ITccProfileFanControl {
    useControl: boolean;
    fanProfile: string;
    minimumFanspeed: number;
    maximumFanspeed: number;
    offsetFanspeed: number;
    customFanCurve: ITccFanProfile;
}

interface ITccODMProfile {
    name: string;
}

interface ITccODMPowerLimits {
    tdpValues: number[];
}

interface ITccNVIDIAPowerCTRLProfile {
    cTGPOffset: number;
}

export function generateProfileId(): string {
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export const profileImageMap = new Map<string, string>();

profileImageMap.set(LegacyDefaultProfileIDs.Default, 'icon_profile_performance.svg');
profileImageMap.set(LegacyDefaultProfileIDs.CoolAndBreezy, 'icon_profile_breezy.svg');
profileImageMap.set(LegacyDefaultProfileIDs.PowersaveExtreme, 'icon_profile_energysaver.svg');
profileImageMap.set('custom', 'icon_profile_custom.svg');

profileImageMap.set(DefaultProfileIDs.MaxEnergySave, 'icon_profile_energysaver.svg');
profileImageMap.set(DefaultProfileIDs.Quiet, 'icon_profile_quiet4.svg');
profileImageMap.set(DefaultProfileIDs.Office, 'icon_profile_default.svg');
profileImageMap.set(DefaultProfileIDs.HighPerformance, 'icon_profile_performance.svg');
