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

import {
    ITccFanProfile,
    customFanPreset,
} from "../../common/models/TccFanTable";

import { interpolatePointsArray } from "../../common/classes/FanUtils";
import { ITccProfile } from "src/common/models/TccProfile";

export async function getCustomFanCurve(
    profile: ITccProfile
): Promise<ITccFanProfile> {
    if (profile.fan.customFanCurve === undefined) {
        return customFanPreset;
    } else {
        return profile.fan.customFanCurve;
    }
}

export async function getCurrentCustomProfile(
    activeProfile: ITccProfile
): Promise<ITccFanProfile> {
    const customFanCurve: ITccFanProfile =
        await getCustomFanCurve(activeProfile);
    const [tableCPU, tableGPU] = await Promise.all([
        interpolatePointsArray(customFanCurve.tableCPU),
        interpolatePointsArray(customFanCurve.tableGPU),
    ]);

    const tccFanTable = (temp: number, i: number) => ({
        temp: i,
        speed: temp,
    });
    const tccFanProfile: ITccFanProfile = {
        name: "Custom",
        tableCPU: tableCPU.map(tccFanTable),
        tableGPU: tableGPU.map(tccFanTable),
    };
    return tccFanProfile;
}
