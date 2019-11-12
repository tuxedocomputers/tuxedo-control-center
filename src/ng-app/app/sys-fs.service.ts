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
        scalingAvailableGovernors: this.cpu.cores[0].scalingAvailableGovernors.readValueNT(),
        energyPerformanceAvailablePreferences: this.cpu.cores[0].energyPerformanceAvailablePreferences.readValueNT()
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
          scalingCurFreq: core.scalingCurFreq.readValueNT(),
          scalingMinFreq: core.scalingMinFreq.readValueNT(),
          scalingMaxFreq: core.scalingMaxFreq.readValueNT(),
          scalingDriver: core.scalingDriver.readValueNT(),
          energyPerformanceAvailablePreferences: core.energyPerformanceAvailablePreferences.readValueNT(),
          energyPerformancePreference: core.energyPerformancePreference.readValueNT(),
          scalingAvailableGovernors: core.scalingAvailableGovernors.readValueNT(),
          scalingGovernor: core.scalingGovernor.readValueNT(),
          cpuInfoMaxFreq: core.cpuinfoMaxFreq.readValueNT(),
          cpuInfoMinFreq: core.cpuinfoMinFreq.readValueNT()
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
  driver: string;
  brightness: number;
  maxBrightness: number;
}

export interface IPstateInfo {
  noTurbo: boolean;
}
