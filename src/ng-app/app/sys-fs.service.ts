/*!
 * Copyright (c) 2019-2020 TUXEDO Computers GmbH <tux@tuxedocomputers.com>
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
import { Injectable, OnDestroy } from '@angular/core';
import { CpuController } from '../../common/classes/CpuController';
import { DisplayBacklightController } from '../../common/classes/DisplayBacklightController';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SysFsService implements OnDestroy {

  private cpu: CpuController;
  private displayBacklightControllers: DisplayBacklightController[];

  private updateInterval: NodeJS.Timeout;
  private updatePeriodMs = 3000;
  public generalCpuInfo: BehaviorSubject<IGeneralCPUInfo>;
  public logicalCoreInfo: BehaviorSubject<ILogicalCoreInfo[]>;
  public pstateInfo: BehaviorSubject<IPstateInfo>;

  constructor() {
    this.cpu = new CpuController('/sys/devices/system/cpu');

    const displayBacklightControllerBasepath = '/sys/class/backlight';
    const displayBacklightControllerNames = DisplayBacklightController.getDeviceList(displayBacklightControllerBasepath);
    this.displayBacklightControllers = [];
    for (const driverName of displayBacklightControllerNames) {
      this.displayBacklightControllers.push(new DisplayBacklightController(displayBacklightControllerBasepath, driverName));
    }

    this.periodicUpdate();
    this.updateInterval = setInterval(() => { this.periodicUpdate(); }, this.updatePeriodMs);
  }

  private periodicUpdate(): void {
    if (this.generalCpuInfo === undefined) {
      this.generalCpuInfo = new BehaviorSubject(this.getGeneralCpuInfo());
    } else {
      this.generalCpuInfo.next(this.getGeneralCpuInfo());
    }

    if (this.logicalCoreInfo === undefined) {
      this.logicalCoreInfo = new BehaviorSubject(this.getLogicalCoreInfo());
    } else {
      this.logicalCoreInfo.next(this.getLogicalCoreInfo());
    }

    if (this.pstateInfo === undefined) {
      this.pstateInfo = new BehaviorSubject(this.getPstateInfo());
    } else {
      this.pstateInfo.next(this.getPstateInfo());
    }
  }

  ngOnDestroy() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
  }

  public getGeneralCpuInfo(): IGeneralCPUInfo {
    let cpuInfo: IGeneralCPUInfo;
    try {
      cpuInfo = {
        availableCores: this.cpu.cores.length,
        minFreq: this.cpu.cores[0].cpuinfoMinFreq.readValueNT(),
        maxFreq: this.cpu.cores[0].cpuinfoMaxFreq.readValueNT(),
        scalingAvailableFrequencies: this.cpu.cores[0].scalingAvailableFrequencies.readValueNT(),
        scalingAvailableGovernors: this.cpu.cores[0].scalingAvailableGovernors.readValueNT(),
        energyPerformanceAvailablePreferences: this.cpu.cores[0].energyPerformanceAvailablePreferences.readValueNT(),
        reducedAvailableFreq: this.cpu.cores[0].getReducedAvailableFreqNT()
      };
      if (this.cpu.boost.readValueNT() !== undefined) {
        // FIXME: Use actual max boost frequency
        cpuInfo.maxFreq *= 2;
        cpuInfo.scalingAvailableFrequencies.push(cpuInfo.maxFreq);
      }
    } catch (err) {
      console.log(err);
    }

    return cpuInfo;
  }

  public getLogicalCoreInfo(): ILogicalCoreInfo[] {
    const coreInfoList: ILogicalCoreInfo[] = [];
    for (const core of this.cpu.cores) {
      try {
        let onlineStatus = true;
        if (core.coreIndex !== 0) { onlineStatus = core.online.readValue(); }
        // Skip core if offline
        if (!onlineStatus) { continue; }
        const coreInfo: ILogicalCoreInfo = {
          index: core.coreIndex,
          online: onlineStatus,
          scalingCurFreq: core.scalingCurFreq.readValueNT(),
          scalingMinFreq: core.scalingMinFreq.readValueNT(),
          scalingMaxFreq: core.scalingMaxFreq.readValueNT(),
          scalingDriver: core.scalingDriver.readValueNT(),
          energyPerformanceAvailablePreferences: core.energyPerformanceAvailablePreferences.readValueNT(),
          energyPerformancePreference: core.energyPerformancePreference.readValueNT(),
          scalingAvailableGovernors: core.scalingAvailableGovernors.readValueNT(),
          scalingGovernor: core.scalingGovernor.readValueNT(),
          cpuInfoMaxFreq: core.cpuinfoMaxFreq.readValueNT(),
          cpuInfoMinFreq: core.cpuinfoMinFreq.readValueNT(),
          coreId: core.coreId.readValueNT(),
          coreSiblingsList: core.coreSiblingsList.readValueNT(),
          physicalPackageId: core.physicalPackageId.readValueNT(),
          threadSiblingsList: core.threadSiblingsList.readValueNT()
        };
        coreInfoList.push(coreInfo);
      } catch (err) {
        console.log(err);
      }
    }
    return coreInfoList;
  }

  public getPstateInfo(): IPstateInfo {
    const pstateInfo: IPstateInfo = {
      noTurbo: this.cpu.intelPstate.noTurbo.readValueNT()
    };
    return pstateInfo;
  }

  public getDisplayBrightnessInfo(): IDisplayBrightnessInfo[] {
    const infoArray: IDisplayBrightnessInfo[] = [];
    for (const controller of this.displayBacklightControllers) {
      try {
        const info: IDisplayBrightnessInfo = {
          driver: controller.driver,
          brightness: controller.brightness.readValue(),
          maxBrightness: controller.maxBrightness.readValue()
        };
        infoArray.push(info);
      } catch (err) {
        console.log(err);
      }
    }
    return infoArray;
  }
}

export interface IGeneralCPUInfo {
  availableCores: number;
  minFreq: number;
  maxFreq: number;
  scalingAvailableFrequencies: number[];
  scalingAvailableGovernors: string[];
  energyPerformanceAvailablePreferences: string[];
  reducedAvailableFreq: number;
}

export interface ILogicalCoreInfo {
  index: number;
  online: boolean;
  scalingCurFreq: number;
  scalingMinFreq: number;
  scalingMaxFreq: number;
  scalingDriver: string;
  energyPerformanceAvailablePreferences: string[];
  energyPerformancePreference: string;
  scalingAvailableGovernors: string[];
  scalingGovernor: string;
  cpuInfoMinFreq: number;
  cpuInfoMaxFreq: number;
  coreId: number;
  coreSiblingsList: number[];
  physicalPackageId: number;
  threadSiblingsList: number[];
}

export interface IDisplayBrightnessInfo {
  driver: string;
  brightness: number;
  maxBrightness: number;
}

export interface IPstateInfo {
  noTurbo: boolean;
}
