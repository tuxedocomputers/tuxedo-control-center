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

import { LegacyDefaultProfileIDs } from '../DefaultProfiles';
import { customFanPreset } from '../TccFanTable';
import type { ITccProfile } from '../TccProfile';

export const defaultProfiles: ITccProfile[] = [
    {
        id: LegacyDefaultProfileIDs.Default,
        name: 'Default',
        description: '',
        display: {
            brightness: 100,
            useBrightness: false,
            refreshRate: -1,
            useRefRate: false,
            xResolution: -1,
            yResolution: -1,
            useResolution: false,
        },
        cpu: {
            onlineCores: undefined,
            useMaxPerfGov: false,
            scalingMinFrequency: undefined,
            scalingMaxFrequency: undefined,
            governor: 'powersave', // unused: see CpuWorker.ts->applyCpuProfile(...)
            energyPerformancePreference: 'balance_performance',
            noTurbo: false,
        },
        webcam: {
            status: true,
            useStatus: true,
        },
        fan: {
            useControl: true,
            fanProfile: 'Balanced',
            minimumFanspeed: 0,
            maximumFanspeed: 100,
            offsetFanspeed: 0,
            customFanCurve: customFanPreset,
        },
        odmProfile: { name: undefined },
        odmPowerLimits: { tdpValues: [] },
        nvidiaPowerCTRLProfile: { cTGPOffset: undefined },
    },
    {
        id: LegacyDefaultProfileIDs.CoolAndBreezy,
        name: 'Cool and breezy',
        description: '',
        display: {
            brightness: 50,
            useBrightness: false,
            refreshRate: -1,
            useRefRate: false,
            xResolution: -1,
            yResolution: -1,
            useResolution: false,
        },
        cpu: {
            onlineCores: undefined,
            useMaxPerfGov: false,
            scalingMinFrequency: undefined,
            scalingMaxFrequency: undefined,
            governor: 'powersave', // unused: see CpuWorker.ts->applyCpuProfile(...)
            energyPerformancePreference: 'balance_performance',
            noTurbo: false,
        },
        webcam: {
            status: true,
            useStatus: true,
        },
        fan: {
            useControl: true,
            fanProfile: 'Quiet',
            minimumFanspeed: 0,
            maximumFanspeed: 100,
            offsetFanspeed: 0,
            customFanCurve: customFanPreset,
        },
        odmProfile: { name: undefined },
        odmPowerLimits: { tdpValues: [] },
        nvidiaPowerCTRLProfile: { cTGPOffset: 0 },
    },
    {
        id: LegacyDefaultProfileIDs.PowersaveExtreme,
        name: 'Powersave extreme',
        description: '',
        display: {
            brightness: 60,
            useBrightness: true,
            refreshRate: -1,
            useRefRate: false,
            xResolution: -1,
            yResolution: -1,
            useResolution: false,
        },
        cpu: {
            onlineCores: undefined,
            useMaxPerfGov: false,
            scalingMinFrequency: 0,
            scalingMaxFrequency: 0,
            governor: 'powersave', // unused: see CpuWorker.ts->applyCpuProfile(...)
            energyPerformancePreference: 'balance_performance',
            noTurbo: false,
        },
        webcam: {
            status: true,
            useStatus: true,
        },
        fan: {
            useControl: true,
            fanProfile: 'Silent',
            minimumFanspeed: 0,
            maximumFanspeed: 100,
            offsetFanspeed: 0,
            customFanCurve: customFanPreset,
        },
        odmProfile: { name: undefined },
        odmPowerLimits: { tdpValues: [] },
        nvidiaPowerCTRLProfile: { cTGPOffset: 0 },
    },
];

export const defaultCustomProfileXP1508UHD: ITccProfile = {
    name: 'Custom XP1508 UHD',
    id: 'Custom XP1508 UHD',
    description: '',
    display: {
        brightness: 100,
        useBrightness: false,
        refreshRate: -1,
        useRefRate: false,
        xResolution: -1,
        yResolution: -1,
        useResolution: false,
    },
    cpu: {
        onlineCores: undefined,
        useMaxPerfGov: false,
        scalingMinFrequency: undefined,
        scalingMaxFrequency: 1200000,
        governor: 'powersave', // unused: see CpuWorker.ts->applyCpuProfile(...)
        energyPerformancePreference: 'balance_performance',
        noTurbo: false,
    },
    webcam: {
        status: true,
        useStatus: true,
    },
    fan: {
        useControl: true,
        fanProfile: 'Balanced',
        minimumFanspeed: 0,
        maximumFanspeed: 100,
        offsetFanspeed: 0,
        customFanCurve: customFanPreset,
    },
    odmProfile: { name: undefined },
    odmPowerLimits: { tdpValues: [] },
    nvidiaPowerCTRLProfile: { cTGPOffset: undefined },
};
