import { Component, OnInit, OnDestroy } from '@angular/core';

import { SysFsService, ILogicalCoreInfo, IGeneralCPUInfo } from '../sys-fs.service';
import { DecimalPipe } from '@angular/common';

@Component({
  selector: 'app-cpu-settings',
  templateUrl: './cpu-settings.component.html',
  styleUrls: ['./cpu-settings.component.scss']
})
export class CpuSettingsComponent implements OnInit, OnDestroy {

  public cpuCoreInfo: ILogicalCoreInfo[];
  public cpuInfo: IGeneralCPUInfo;

  private updateInterval: NodeJS.Timeout;

  public activeCores: number;
  public activeScalingMinFreqs: string[];
  public activeScalingMaxFreqs: string[];
  public activeScalingDrivers: string[];
  public activeScalingGovernors: string[];
  public activeEnergyPerformancePreference: string[];

  public test: string[] = ['12', '34'];

  constructor(private sysfs: SysFsService, private decimalPipe: DecimalPipe) {}

  ngOnInit() {
    this.updateData();
    this.updateInterval = setInterval(() => { this.periodicUpdate(); }, 2000);
  }

  public updateData(): void {
    this.cpuCoreInfo = this.sysfs.getLogicalCoreInfo();
    this.cpuInfo = this.sysfs.getGeneralCpuInfo();

    this.activeCores = 0;
    this.activeScalingMinFreqs = [];
    this.activeScalingMaxFreqs = [];
    this.activeScalingDrivers = [];
    this.activeScalingGovernors = [];
    this.activeEnergyPerformancePreference = [];
    for (const core of this.cpuCoreInfo) {
      if (!this.activeScalingMinFreqs.includes(this.formatFrequency(core.scalingMinFreq))) {
        this.activeScalingMinFreqs.push(this.formatFrequency(core.scalingMinFreq));
      }
      if (!this.activeScalingMaxFreqs.includes(this.formatFrequency(core.scalingMaxFreq))) {
        this.activeScalingMaxFreqs.push(this.formatFrequency(core.scalingMaxFreq));
      }
      if (!this.activeScalingGovernors.includes(core.scalingGovernor)) {
        this.activeScalingGovernors.push(core.scalingGovernor);
      }
      if (!this.activeEnergyPerformancePreference.includes(core.energyPerformancePreference)) {
        this.activeEnergyPerformancePreference.push(core.energyPerformancePreference);
      }
      if (!this.activeScalingDrivers.includes(core.scalingDriver)) {
        this.activeScalingDrivers.push(core.scalingDriver);
      }
    }
  }

  public formatFrequency(frequency: number): string {
    return this.decimalPipe.transform(frequency / 1000000, '1.2-2');
  }

  private periodicUpdate(): void {
    this.updateData();
  }

  ngOnDestroy() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
  }

}
