/*!
 * Copyright (c) 2020-2022 TUXEDO Computers GmbH <tux@tuxedocomputers.com>
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
import { Injectable } from '@angular/core';
import { SysFsService } from './sys-fs.service';
import { TccDBusClientService } from './tcc-dbus-client.service';
import { IdGpuInfo, IiGpuInfo } from "src/common/models/TccGpuValues";
import { dbusVariant, IDBusFanData, TimeData } from 'src/common/models/IFanData';
import { SystemProfileInfo, deviceSystemProfileInfo } from 'src/common/models/ISystemProfileInfo';
import { Subject } from 'rxjs';
import { ICpuPower } from 'src/common/models/TccPowerSettings';

@Injectable({
    providedIn: "root",
})
export class CompatibilityService {
  constructor(
        private tccDbus: TccDBusClientService,
        private sysfs: SysFsService
    ) {}

    public getSystemProfileInfo(): SystemProfileInfo {
        return deviceSystemProfileInfo.get(this.tccDbus.device);
    }

    public getHasSystemProfileInfo(): boolean {
        return (deviceSystemProfileInfo.get(this.tccDbus.device) !== undefined);
    }

    get hasFanInfo(): boolean {
        return this.hasFanControl;
    }

    private hasPowerDrawWithValue(powerData: ICpuPower): boolean {
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

    private hasDataWithValue(data: TimeData): boolean {
        return (
            data?.data !== undefined &&
            data.timestamp.value > 0 &&
            data.data > -1 &&
            data?.timestamp?.value !== undefined
        );
    }

    get hasCpuTemp(): boolean {
        const fanData: IDBusFanData = this.tccDbus.fanData?.value;
        const { cpu } = fanData;
        const cpuTemp: TimeData = cpu?.temp;
        return this.hasDataWithValue(cpuTemp);
    }

    get hasIGpuTemp(): boolean {
        const temp: number = this.tccDbus.iGpuInfo?.value?.temp ?? -1;

        return temp > 0;
    }

    get hasDGpuTemp(): boolean {
        const fanData: IDBusFanData = this.tccDbus.fanData?.value;
        const { gpu1, gpu2 } = fanData;
        const gpu1Temp: TimeData = gpu1?.temp;
        const gpu2Temp: TimeData = gpu2?.temp;

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
        const fanData: IDBusFanData = this.tccDbus.fanData?.value;
        const { cpu } = fanData;
        const cpuSpeed: TimeData = cpu?.speed;

        return this.hasDataWithValue(cpuSpeed);
    }

    get hasDGpuFan(): boolean {
        const fanData: IDBusFanData = this.tccDbus.fanData?.value;
        const { gpu1, gpu2 } = fanData;
        const gpu1Speed: TimeData = gpu1?.speed;
        const gpu2Speed: TimeData = gpu2?.speed;

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
        const iGpuPowerDraw: number = this.tccDbus.iGpuInfo?.value?.powerDraw;

        return (
            iGpuPowerDraw !== undefined &&
            this.hasPowerDrawWithValue({ powerDraw: iGpuPowerDraw })
        );
    }

    get hasDGpuPowerDraw(): boolean {
        const dGpuPowerDraw: number = this.tccDbus.dGpuInfo?.value?.powerDraw;

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
        return this.tccDbus?.fanData?.value?.cpu?.temp?.data > 1;
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
            this.tccDbus.odmProfilesAvailable.value?.length > 0
        );
    }

    get hasODMPowerLimitControl(): boolean {
        return (
            this.tccDbus.odmPowerLimits.value !== undefined &&
            this.tccDbus.odmPowerLimits.value?.length > 0
        );
    }

    get uwLEDOnlyMode(): boolean {
        return this.hasODMPowerLimitControl && this.hasODMProfileControl;
    }

    // todo: check if Subject is correct
    get tccDbusAvailable(): Subject<boolean> {
        return this.tccDbus.dbusAvailable;
    }

    get hasAquaris(): boolean {
        return this.tccDbus.hasAquaris;
    }

    /**
     * Condition where max freq workaround is applicable
     * (aka max freq missing regulated through boost flag)
     */
    get hasMissingMaxFreqBoostWorkaround(): boolean {
        if (
            this.sysfs.generalCpuInfo.value !== undefined &&
            this.sysfs.logicalCoreInfo.value !== undefined
        ) {
            const boost: boolean = this.sysfs.generalCpuInfo.value.boost;
            const scalingDriver: string =
                this.sysfs.logicalCoreInfo.value[0].scalingDriver;
            return (
                boost !== undefined &&
                scalingDriver === window.comp.getScalingDriverAcpiCpuFreq()
            );
        } else {
            return false;
        }
    }
}
