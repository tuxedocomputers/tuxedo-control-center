/*!
 * Copyright (c) 2020-2023 TUXEDO Computers GmbH <tux@tuxedocomputers.com>
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
import { Injectable } from "@angular/core";
import { ScalingDriver } from "../../common/classes/LogicalCpuController";
import { DMIController } from "../../common/classes/DMIController";
import { SysFsService } from "./sys-fs.service";
import { TccDBusClientService } from "./tcc-dbus-client.service";
import { IdGpuInfo, IiGpuInfo } from "src/common/models/TccGpuValues";

@Injectable({
    providedIn: "root",
})
export class CompatibilityService {
    private hasAquarisValue: boolean;

    constructor(
        private tccDbus: TccDBusClientService,
        private sysfs: SysFsService
    ) {
        // TODO: Manual read until general device id get merged
        const dmi = new DMIController("/sys/class/dmi/id");
        const deviceName = dmi.productSKU.readValueNT();
        const boardVendor = dmi.boardVendor.readValueNT();
        const chassisVendor = dmi.chassisVendor.readValueNT();
        const sysVendor = dmi.sysVendor.readValueNT();
        let showAquarisMenu;
        const isTuxedo =
            (boardVendor !== undefined &&
                boardVendor.toLowerCase().includes("tuxedo")) ||
            (chassisVendor !== undefined &&
                chassisVendor.toLowerCase().includes("tuxedo")) ||
            (sysVendor !== undefined &&
                sysVendor.toLowerCase().includes("tuxedo"));

        if (isTuxedo) {
            if (
                deviceName !== undefined &&
                (deviceName === "STELLARIS1XI04" ||
                    deviceName === "STEPOL1XA04" ||
                    deviceName === "STELLARIS1XI05")
            ) {
                showAquarisMenu = true;
            } else {
                showAquarisMenu = false;
            }
        } else {
            showAquarisMenu = true;
        }
        this.hasAquarisValue = showAquarisMenu;
    }

    get hasFanInfo(): boolean {
        return this.hasFanControl;
    }

    get hasCpuPower(): boolean {
        const { cpuPower } = this.tccDbus;
        const { value: cpuPowerValue } = cpuPower;

        const powerDrawDefined =
            typeof cpuPowerValue?.powerDraw !== "undefined";

        return (
            powerDrawDefined &&
            cpuPowerValue.powerDraw > 0 &&
            this.tccDbus.tuxedoWmiAvailable.value
        );
    }

    get hasDGpuPowerDraw(): boolean {
        const dGpuPowerDraw = this.tccDbus.dGpuInfo?.value?.powerDraw;

        if (dGpuPowerDraw !== undefined) {
            return dGpuPowerDraw > 0 && this.tccDbus.tuxedoWmiAvailable.value;
        }

        return false;
    }

    get hasIGpuPowerDraw(): boolean {
        const iGpuPowerDraw = this.tccDbus.iGpuInfo?.value?.powerDraw;

        if (iGpuPowerDraw !== undefined) {
            return iGpuPowerDraw >= 0 && this.tccDbus.tuxedoWmiAvailable.value;
        }

        return false;
    }

    get hasDGpuFreq(): boolean {
        const dGpuInfo: IdGpuInfo | undefined = this.tccDbus.dGpuInfo?.value;
        if (!dGpuInfo) {
            return false;
        }
        const { coreFrequency, maxCoreFrequency } = dGpuInfo;
        return (
            coreFrequency !== undefined &&
            coreFrequency >= 0 &&
            maxCoreFrequency !== undefined &&
            maxCoreFrequency >= 0 &&
            this.tccDbus.tuxedoWmiAvailable.value
        );
    }

    get hasIGpuFreq(): boolean {
        const iGpuInfo: IiGpuInfo | undefined = this.tccDbus.iGpuInfo?.value;
        if (!iGpuInfo) {
            return false;
        }
        const { coreFrequency, maxCoreFrequency } = iGpuInfo;
        return (
            coreFrequency !== undefined &&
            coreFrequency >= 0 &&
            maxCoreFrequency !== undefined &&
            maxCoreFrequency >= 0 &&
            this.tccDbus.tuxedoWmiAvailable.value
        );
    }

    get hasIGpuTemp(): boolean {
        const iGpuInfo = this.tccDbus.iGpuInfo?.value;
        const temp = iGpuInfo?.temp ?? -1;
        return temp > 0 && this.tccDbus.tuxedoWmiAvailable.value;
    }

    // hasFanControl==true implies hasFanInfo==true, but not the other way around
    get hasFanControl(): boolean {
        /*const dmi = new DMIController('/sys/class/dmi/id');
    const boardName = dmi.boardName.readValueNT();
    // when adding or removing devices here don't forget to also alter getFanControlStatus() from FanControlWorker.ts from tccd
    if (boardName === "GMxRGxx") {
      return false;
    }*/
        return (
            this.tccDbus.tuxedoWmiAvailable.value &&
            this.tccDbus.fanData.value.cpu.temp.data.value > 1
        );
    }

    get compatibilityMessage(): string {
        return $localize`:@@compatibilityNotAvailable:This feature is currently not available.`;
    }

    get hasWebcamControl(): boolean {
        return (
            this.tccDbus.tuxedoWmiAvailable.value &&
            this.tccDbus.webcamSWAvailable.value
        );
    }

    get hasODMProfileControl(): boolean {
        return (
            this.tccDbus.tuxedoWmiAvailable.value &&
            this.tccDbus.odmProfilesAvailable.value !== undefined &&
            this.tccDbus.odmProfilesAvailable.value.length > 0
        );
    }

    get hasODMPowerLimitControl(): boolean {
        return (
            this.tccDbus.tuxedoWmiAvailable.value &&
            this.tccDbus.odmPowerLimits.value !== undefined &&
            this.tccDbus.odmPowerLimits.value.length > 0
        );
    }

    get uwLEDOnlyMode(): boolean {
        return this.hasODMPowerLimitControl && this.hasODMProfileControl;
    }

    get tccDbusAvailable() {
        return this.tccDbus.available;
    }

    get hasAquaris() {
        return this.hasAquarisValue;
    }

    /**
     * Condition where max freq workaround is applicable
     * (aka max freq missing regulated through boost flag)
     */
    get hasMissingMaxFreqBoostWorkaround() {
        if (
            this.sysfs.generalCpuInfo.value !== undefined &&
            this.sysfs.logicalCoreInfo.value !== undefined
        ) {
            const boost = this.sysfs.generalCpuInfo.value.boost;
            const scalingDriver =
                this.sysfs.logicalCoreInfo.value[0].scalingDriver;
            return (
                boost !== undefined &&
                scalingDriver === ScalingDriver.acpi_cpufreq
            );
        } else {
            return false;
        }
    }
}
