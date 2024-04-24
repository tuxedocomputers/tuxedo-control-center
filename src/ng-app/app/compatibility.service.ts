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
import { TimeData } from "src/service-app/classes/TccDBusInterface";
import { deviceSystemProfileInfo, SystemProfileInfo } from "src/common/models/ISystemProfileInfo";
import { TUXEDODevice } from "src/common/models/DefaultProfiles";

@Injectable({
    providedIn: "root",
})
export class CompatibilityService {
    private hasAquarisValue: boolean;
    private hideCTGPValue: boolean;

    constructor(
        private tccDbus: TccDBusClientService,
        private sysfs: SysFsService,
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
                    deviceName === "STELLARIS1XI05" ||
                    deviceName === 'STELLARIS17I06')
            ) {
                showAquarisMenu = true;
            } else {
                showAquarisMenu = false;
            }
        } else {
            showAquarisMenu = true;
        }
        this.hasAquarisValue = showAquarisMenu;

        this.hideCTGPValue = deviceName === "IBP14G6_TQF" ||
                             deviceName === "IBP14G7_AQF_ARX" ||
                             deviceName === "IBPG8";
    }

    public getSystemProfileInfo(): SystemProfileInfo {
        return deviceSystemProfileInfo.get(this.tccDbus.device);
    }

    public getCurrentDevice(): TUXEDODevice {
        return this.tccDbus.device;
    }

    public getHasSystemProfileInfo(): boolean {
        return (deviceSystemProfileInfo.get(this.tccDbus.device) !== undefined);
    }

    get hasFanInfo(): boolean {
        return this.hasFanControl;
    }

    private hasPowerDrawWithValue(powerData: any): boolean {
        return (
            typeof powerData?.powerDraw !== "undefined" &&
            powerData.powerDraw > -1
        );
    }

    private hasFrequencyWithValue(gpuInfo: IiGpuInfo | IdGpuInfo): boolean {
        return (
            gpuInfo.coreFrequency !== undefined && gpuInfo.coreFrequency >= 0
        );
    }

    private hasDataWithValue(data: TimeData<number>): boolean {
        return (
            data?.data?.value !== undefined &&
            data.timestamp.value > 0 &&
            data.data.value > -1 &&
            data?.timestamp?.value !== undefined
        );
    }

    get hasCpuTemp(): boolean {
        const fanData = this.tccDbus.fanData?.value;
        const { cpu } = fanData;
        const cpuTemp = cpu?.temp;
        return this.hasDataWithValue(cpuTemp);
    }

    get hasIGpuTemp(): boolean {
        const temp = this.tccDbus.iGpuInfo?.value?.temp ?? -1;

        return temp > 0;
    }

    get hasDGpuTemp(): boolean {
        const fanData = this.tccDbus.fanData?.value;
        const { gpu1, gpu2 } = fanData;
        const gpu1Temp = gpu1?.temp;
        const gpu2Temp = gpu2?.temp;

        return (
            this.hasDataWithValue(gpu1Temp) || this.hasDataWithValue(gpu2Temp)
        );
    }

    get hasIGpuFreq(): boolean {
        const iGpuInfo: IiGpuInfo | undefined = this.tccDbus.iGpuInfo?.value;

        return iGpuInfo !== undefined && this.hasFrequencyWithValue(iGpuInfo);
    }

    get hasDGpuFreq(): boolean {
        const dGpuInfo: IdGpuInfo | undefined = this.tccDbus.dGpuInfo?.value;

        return dGpuInfo !== undefined && this.hasFrequencyWithValue(dGpuInfo);
    }

    get hasCpuFan(): boolean {
        const fanData = this.tccDbus.fanData?.value;
        const { cpu } = fanData;
        const cpuSpeed = cpu?.speed;

        return this.hasDataWithValue(cpuSpeed);
    }

    get hasDGpuFan(): boolean {
        const fanData = this.tccDbus.fanData?.value;
        const { gpu1, gpu2 } = fanData;
        const gpu1Speed = gpu1?.speed;
        const gpu2Speed = gpu2?.speed;

        return (
            this.hasDataWithValue(gpu1Speed) || this.hasDataWithValue(gpu2Speed)
        );
    }

    get hasCpuPower(): boolean {
        const { cpuPower } = this.tccDbus;
        const { value: cpuPowerValue } = cpuPower;

        return this.hasPowerDrawWithValue(cpuPowerValue);
    }

    get hasIGpuPowerDraw(): boolean {
        const iGpuPowerDraw = this.tccDbus.iGpuInfo?.value?.powerDraw;

        return (
            iGpuPowerDraw !== undefined &&
            this.hasPowerDrawWithValue({ powerDraw: iGpuPowerDraw })
        );
    }

    get hasDGpuPowerDraw(): boolean {
        const dGpuPowerDraw = this.tccDbus.dGpuInfo?.value?.powerDraw;

        return (
            dGpuPowerDraw !== undefined &&
            this.hasPowerDrawWithValue({ powerDraw: dGpuPowerDraw })
        );
    }

    // hasFanControl==true implies hasFanInfo==true, but not the other way around
    get hasFanControl(): boolean {
        /*const dmi = new DMIController('/sys/class/dmi/id');
    const boardName = dmi.boardName.readValueNT();
    // when adding or removing devices here don't forget to also alter getFanControlStatus() from FanControlWorker.ts from tccd
    if (boardName === "GMxRGxx") {
      return false;
    }*/
        return this.tccDbus.fanData.value.cpu.temp.data.value > 1;
    }

    get compatibilityMessage(): string {
        return $localize`:@@compatibilityNotAvailable:This feature is currently not available.`;
    }

    get hasWebcamControl(): boolean {
        return this.tccDbus.webcamSWAvailable.value;
    }

    get hasODMProfileControl(): boolean {
        return (
            this.tccDbus.odmProfilesAvailable.value !== undefined &&
            this.tccDbus.odmProfilesAvailable.value.length > 0
        );
    }

    get hasODMPowerLimitControl(): boolean {
        return (
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

    get hideCTGP() {
        return this.hideCTGPValue;
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
