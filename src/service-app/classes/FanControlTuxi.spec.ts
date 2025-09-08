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

import "jasmine";
const mock: typeof import("mock-fs") = require("mock-fs");

import { FanControlTuxi } from "./FanControlTuxi";
import { SysFsPropertyInteger } from "../../common/classes/SysFsProperties";
import { TUXEDODevice } from "../../common/models/DefaultProfiles";

describe("FanControlTuxi", (): void => {
    it("Sirius Gen 2: check hwmon path", async (): Promise<void> => {
        mock({
            "/sys/class/hwmon/hwmon0/name": "ADP1",
            "/sys/class/hwmon/hwmon1/name": "acpitz",
            "/sys/class/hwmon/hwmon2/name": "BAT0",
            "/sys/class/hwmon/hwmon3/name": "nvme",
            "/sys/class/hwmon/hwmon4/name": "tuxedo_tuxi_sensors",
            "/sys/class/hwmon/hwmon5/name": "spd5118",
            "/sys/class/hwmon/hwmon6/name": "spd5118",
            "/sys/class/hwmon/hwmon7/name": "k10temp",
            "/sys/class/hwmon/hwmon8/name": "tuxedo",
            "/sys/class/hwmon/hwmon9/name": "iwlwifi_1",
            "/sys/class/hwmon/hwmon10/name": "amdgpu",
            "/sys/class/hwmon/hwmon11/name": "amdgpu",
            "/sys/bus/platform/devices/tuxedo_fan_control/": {},
        });

        const fanApi = new FanControlTuxi(undefined, TUXEDODevice.SIRIUS1602);

        expect(await fanApi.getHwmonPath()).toEqual("/sys/class/hwmon/hwmon4");
    });

    it("Sirius Gen 2: check tuxi available", async (): Promise<void> => {
        mock({
            "/sys/class/hwmon/hwmon4/name": "tuxedo_tuxi_sensors",
            "/sys/bus/platform/devices/tuxedo_fan_control/": {},
        });

        const fanApi = new FanControlTuxi(undefined, TUXEDODevice.SIRIUS1602);

        expect(await fanApi.checkAvailable()).toEqual([true, true]);
    });

    it("Sirius Gen 2: check tuxi and pwm available", async (): Promise<void> => {
        mock({
            "/sys/class/hwmon/hwmon4/name": "tuxedo_tuxi_sensors",
            "/sys/class/hwmon/hwmon8/name": "tuxedo",
            "/sys/bus/platform/devices/tuxedo_fan_control/": {},
        });

        const fanApi = new FanControlTuxi(undefined, TUXEDODevice.SIRIUS1602);

        expect(await fanApi.checkAvailable()).toEqual([true, true]);
        expect(await fanApi.getHwmonPath()).toEqual("/sys/class/hwmon/hwmon4");
    });

    it("Sirius Gen 2: check pwm available", async (): Promise<void> => {
        mock({
            "/sys/class/hwmon/hwmon8/name": "tuxedo",
            "/sys/bus/platform/devices/tuxedo_fan_control/": {},
        });

        const fanApi = new FanControlTuxi(undefined, TUXEDODevice.SIRIUS1602);

        expect(await fanApi.checkAvailable()).toEqual([false, false]);
    });

    it("Sirius Gen 2: check tuxi with only read available", async (): Promise<void> => {
        mock({
            "/sys/class/hwmon/hwmon4/name": "tuxedo_tuxi_sensors",
        });

        const fanApi = new FanControlTuxi(undefined, TUXEDODevice.SIRIUS1602);

        expect(await fanApi.checkAvailable()).toEqual([true, false]);
    });

    it("Sirius Gen 2: check tuxi with only write available", async (): Promise<void> => {
        mock({
            "/sys/class/hwmon/": {},
            "/sys/bus/platform/devices/tuxedo_fan_control/": {},
        });

        const fanApi = new FanControlTuxi(undefined, TUXEDODevice.SIRIUS1602);

        expect(await fanApi.checkAvailable()).toEqual([false, false]);
    });

    it("Sirius Gen 2: check fan control not available", async (): Promise<void> => {
        mock({ "/sys/class/hwmon/": {} });

        const fanApi = new FanControlTuxi(undefined, TUXEDODevice.SIRIUS1602);

        expect(await fanApi.checkAvailable()).toEqual([false, false]);
    });

    it("Sirius Gen 2: check only pwm available", async (): Promise<void> => {
        mock({
            "/sys/class/hwmon/hwmon0/name": "ADP1",
            "/sys/class/hwmon/hwmon1/name": "acpitz",
            "/sys/class/hwmon/hwmon2/name": "BAT0",
            "/sys/class/hwmon/hwmon3/name": "nvme",
            "/sys/class/hwmon/hwmon5/name": "spd5118",
            "/sys/class/hwmon/hwmon6/name": "spd5118",
            "/sys/class/hwmon/hwmon7/name": "k10temp",
            "/sys/class/hwmon/hwmon8/name": "tuxedo",
            "/sys/class/hwmon/hwmon9/name": "iwlwifi_1",
            "/sys/class/hwmon/hwmon10/name": "amdgpu",
            "/sys/class/hwmon/hwmon11/name": "amdgpu",
            "/sys/bus/platform/devices/tuxedo_fan_control/": {},
        });

        const fanApi = new FanControlTuxi(undefined, TUXEDODevice.SIRIUS1602);

        expect(await fanApi.checkAvailable()).toEqual([false, false]);
    });

    it("Sirius Gen 2: hwmon label match", async (): Promise<void> => {
        mock({});

        const fanApi = new FanControlTuxi(undefined, TUXEDODevice.SIRIUS1602);

        const fanLabelMap: Map<number, string> = new Map<number, string>();
        fanLabelMap.set(1, "cpu0");
        fanLabelMap.set(2, "gpu0");

        const tempLabelMap: Map<number, string> = new Map<number, string>();
        tempLabelMap.set(1, "cpu0");
        tempLabelMap.set(2, "gpu0");

        const tempInputMap: Map<number, SysFsPropertyInteger> = new Map<
            number,
            SysFsPropertyInteger
        >();
        tempInputMap.set(
            1,
            new SysFsPropertyInteger("/sys/class/hwmon/hwmon4/temp1_input")
        );
        tempInputMap.set(
            2,
            new SysFsPropertyInteger("/sys/class/hwmon/hwmon4/temp2_input")
        );

        fanApi.setFanLabelMap(fanLabelMap);
        fanApi.setTempLabelMap(tempLabelMap);
        fanApi.setTempInputMap(tempInputMap);

        const fanTempMap: Map<
            number,
            { tempLabel: string; tempInput: SysFsPropertyInteger }
        > = new Map<
            number,
            { tempLabel: string; tempInput: SysFsPropertyInteger }
        >();
        fanTempMap.set(1, {
            tempLabel: "cpu0",
            tempInput: new SysFsPropertyInteger(
                "/sys/class/hwmon/hwmon4/temp1_input"
            ),
        });
        fanTempMap.set(2, {
            tempLabel: "gpu0",
            tempInput: new SysFsPropertyInteger(
                "/sys/class/hwmon/hwmon4/temp2_input"
            ),
        });

        expect(fanApi.testMatchLabels()).toEqual(fanTempMap);
    });

    it("Sirius Gen 2: set map data", async (): Promise<void> => {
        mock({
            "/sys/class/hwmon/hwmon4/fan1_input": "0",
            "/sys/class/hwmon/hwmon4/fan1_label": "cpu0",
            "/sys/class/hwmon/hwmon4/fan1_max": "6000",
            "/sys/class/hwmon/hwmon4/fan1_min": "0",
            "/sys/class/hwmon/hwmon4/fan2_input": "0",
            "/sys/class/hwmon/hwmon4/fan2_label": "gpu0",
            "/sys/class/hwmon/hwmon4/fan2_max": "6000",
            "/sys/class/hwmon/hwmon4/fan2_min": "0",
            "/sys/class/hwmon/hwmon4/temp1_input": "40000",
            "/sys/class/hwmon/hwmon4/temp1_label": "cpu0",
            "/sys/class/hwmon/hwmon4/temp2_input": "40000",
            "/sys/class/hwmon/hwmon4/temp2_label": "gpu0",
        });

        const fanApi = new FanControlTuxi(undefined, TUXEDODevice.SIRIUS1602);

        const hwmonPath = "/sys/class/hwmon/hwmon4";
        const platformPath = "/sys/bus/platform/devices/tuxedo_fan_control";

        fanApi.setHwmonPath(hwmonPath);

        const numberInterfaces: number = await fanApi.getNumberFanInterfaces();
        await fanApi.mapLogicToFans(numberInterfaces, false);
        await fanApi.setMapData();

        const fanSpeedInputMap = new Map();
        fanSpeedInputMap.set(
            1,
            new SysFsPropertyInteger(`${hwmonPath}/fan1_input`)
        );
        fanSpeedInputMap.set(
            2,
            new SysFsPropertyInteger(`${hwmonPath}/fan2_input`)
        );

        const fanMaxInputMap = new Map();
        fanMaxInputMap.set(
            1,
            new SysFsPropertyInteger(`${hwmonPath}/fan1_max`)
        );
        fanMaxInputMap.set(
            2,
            new SysFsPropertyInteger(`${hwmonPath}/fan2_max`)
        );

        const pwmInputMap = new Map();
        pwmInputMap.set(
            1,
            new SysFsPropertyInteger(`${platformPath}/fan1_pwm`)
        );
        pwmInputMap.set(
            2,
            new SysFsPropertyInteger(`${platformPath}/fan2_pwm`)
        );

        const fanLabelMap = new Map();
        fanLabelMap.set(1, "cpu0");
        fanLabelMap.set(2, "gpu0");

        const tempInputMap = new Map();
        tempInputMap.set(
            1,
            new SysFsPropertyInteger(`${hwmonPath}/temp1_input`)
        );
        tempInputMap.set(
            2,
            new SysFsPropertyInteger(`${hwmonPath}/temp2_input`)
        );

        const tempLabelMap = new Map();
        tempLabelMap.set(1, "cpu0");
        tempLabelMap.set(2, "gpu0");

        expect(fanApi.getFanSpeedInputMap()).toEqual(fanSpeedInputMap);
        expect(fanApi.getFanMaxInputMap()).toEqual(fanMaxInputMap);
        expect(fanApi.getPwmInputMap()).toEqual(pwmInputMap);
        expect(fanApi.getFanLabelMap()).toEqual(fanLabelMap);
        expect(fanApi.getTempInputMap()).toEqual(tempInputMap);
        expect(fanApi.getTempLabelMap()).toEqual(tempLabelMap);
    });

    it("Sirius Gen 2: get fan speed", async (): Promise<void> => {
        mock({
            "/sys/class/hwmon/hwmon4/fan1_input": "3000",
            "/sys/class/hwmon/hwmon4/fan1_label": "cpu0",
            "/sys/class/hwmon/hwmon4/fan1_max": "6000",
            "/sys/class/hwmon/hwmon4/fan1_min": "0",
            "/sys/class/hwmon/hwmon4/fan2_input": "4000",
            "/sys/class/hwmon/hwmon4/fan2_label": "gpu0",
            "/sys/class/hwmon/hwmon4/fan2_max": "6000",
            "/sys/class/hwmon/hwmon4/fan2_min": "0",
            "/sys/class/hwmon/hwmon4/temp1_input": "40000",
            "/sys/class/hwmon/hwmon4/temp1_label": "cpu0",
            "/sys/class/hwmon/hwmon4/temp2_input": "40000",
            "/sys/class/hwmon/hwmon4/temp2_label": "gpu0",
        });

        const fanApi = new FanControlTuxi(undefined, TUXEDODevice.SIRIUS1602);

        const hwmonPath = "/sys/class/hwmon/hwmon4";
        fanApi.setHwmonPath(hwmonPath);

        const numberInterfaces: number = await fanApi.getNumberFanInterfaces();
        await fanApi.mapLogicToFans(numberInterfaces, false);
        await fanApi.setMapData();
        fanApi.matchLabels();

        expect(await fanApi.getFanSpeedPercent(0)).toEqual((3000 / 6000) * 100);
        expect(await fanApi.getFanSpeedPercent(1)).toEqual(
            Math.round((4000 / 6000) * 100)
        );
    });

    it("Sirius Gen 2: get number fan interfaces", async (): Promise<void> => {
        mock({
            "/sys/class/hwmon/hwmon4/fan1_input": "0",
            "/sys/class/hwmon/hwmon4/fan1_label": "cpu0",
            "/sys/class/hwmon/hwmon4/fan1_max": "6000",
            "/sys/class/hwmon/hwmon4/fan1_min": "0",
            "/sys/class/hwmon/hwmon4/fan2_input": "0",
            "/sys/class/hwmon/hwmon4/fan2_label": "gpu0",
            "/sys/class/hwmon/hwmon4/fan2_max": "6000",
            "/sys/class/hwmon/hwmon4/fan2_min": "0",
            "/sys/class/hwmon/hwmon4/temp1_input": "40000",
            "/sys/class/hwmon/hwmon4/temp1_label": "cpu0",
            "/sys/class/hwmon/hwmon4/temp2_input": "40000",
            "/sys/class/hwmon/hwmon4/temp2_label": "gpu0",
        });
        
        const fanApi = new FanControlTuxi(undefined, TUXEDODevice.SIRIUS1602);
        fanApi.setHwmonPath("/sys/class/hwmon/hwmon4/");

        expect(await fanApi.getNumberFanInterfaces()).toEqual(2);
    });

    it("Sirius Gen 2: get number temp", async (): Promise<void> => {
        mock({
            "/sys/class/hwmon/hwmon4/fan1_input": "0",
            "/sys/class/hwmon/hwmon4/fan1_label": "cpu0",
            "/sys/class/hwmon/hwmon4/fan1_max": "6000",
            "/sys/class/hwmon/hwmon4/fan1_min": "0",
            "/sys/class/hwmon/hwmon4/fan2_input": "0",
            "/sys/class/hwmon/hwmon4/fan2_label": "gpu0",
            "/sys/class/hwmon/hwmon4/fan2_max": "6000",
            "/sys/class/hwmon/hwmon4/fan2_min": "0",
            "/sys/class/hwmon/hwmon4/temp1_input": "40000",
            "/sys/class/hwmon/hwmon4/temp1_label": "cpu0",
            "/sys/class/hwmon/hwmon4/temp2_input": "40000",
            "/sys/class/hwmon/hwmon4/temp2_label": "gpu0",
        });

        const fanApi = new FanControlTuxi(undefined, TUXEDODevice.SIRIUS1602);
        fanApi.setHwmonPath("/sys/class/hwmon/hwmon4/");

        expect(await fanApi.getNumberTemp()).toEqual(2);
    });
});
