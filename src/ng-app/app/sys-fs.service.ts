import { Injectable } from '@angular/core';
import { CpuController } from '../../common/classes/CpuController';
import { DisplayBacklightController } from 'src/common/classes/DisplayBacklightController';

@Injectable({
  providedIn: 'root'
})
export class SysFsService {

  private cpu: CpuController;
  private displayBacklightControllers: DisplayBacklightController[];

  constructor() {
    this.cpu = new CpuController('/sys/devices/system/cpu');

    const displayBacklightControllerBasepath = '/sys/class/backlight';
    const displayBacklightControllerNames = DisplayBacklightController.getDeviceList(displayBacklightControllerBasepath);
    this.displayBacklightControllers = [];
    for (const driverName of displayBacklightControllerNames) {
      this.displayBacklightControllers.push(new DisplayBacklightController(displayBacklightControllerBasepath, driverName));
    }
  }

  public getGeneralCpuInfo(): IGeneralCPUInfo {
    let cpuInfo: IGeneralCPUInfo;
    try {
      cpuInfo = {
        availableCores: this.cpu.cores.length,
        scalingAvailableGovernors: this.cpu.cores[0].scalingAvailableGovernors.readValue(),
        energyPerformanceAvailablePreferences: this.cpu.cores[0].energyPerformanceAvailablePreferences.readValue()
      };
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
          scalingCurFreq: core.scalingCurFreq.readValue(),
          scalingMinFreq: core.scalingMinFreq.readValue(),
          scalingMaxFreq: core.scalingMaxFreq.readValue(),
          scalingDriver: core.scalingDriver.readValue(),
          energyPerformanceAvailablePreferences: core.energyPerformanceAvailablePreferences.readValue(),
          energyPerformancePreference: core.energyPerformancePreference.readValue(),
          scalingAvailableGovernors: core.scalingAvailableGovernors.readValue(),
          scalingGovernor: core.scalingGovernor.readValue(),
          cpuInfoMaxFreq: core.cpuinfoMaxFreq.readValue(),
          cpuInfoMinFreq: core.cpuinfoMinFreq.readValue()
        };
        coreInfoList.push(coreInfo);
      } catch (err) {
        console.log(err);
      }
    }
    return coreInfoList;
  }
}

export interface IGeneralCPUInfo {
  availableCores: number;
  scalingAvailableGovernors: string[];
  energyPerformanceAvailablePreferences: string[];
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
}

export interface IDisplayBrightnessInfo {
  brightness: number;
  maxBrightness: number;
}
