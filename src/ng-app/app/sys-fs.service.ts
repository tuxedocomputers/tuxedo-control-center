import { Injectable } from '@angular/core';
import { CpuController } from '../../common/classes/CpuController';

@Injectable({
  providedIn: 'root'
})
export class SysFsService {

  private cpu: CpuController;

  constructor() {
    this.cpu = new CpuController('/sys/devices/system/cpu');
  }

  public getGeneralCpuInfo(): IGeneralCPUInfo {
    let cpuInfo: IGeneralCPUInfo;
    try {
      cpuInfo = {
        availableCores: this.cpu.cores.length
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
