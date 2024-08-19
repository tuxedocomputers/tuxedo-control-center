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
    const customFanCurve = await this.getCustomFanCurve(activeProfile);
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
