import { Component, OnInit, OnDestroy } from '@angular/core';

import { SysFsService, ILogicalCoreInfo, IGeneralCPUInfo } from '../sys-fs.service';
import { DecimalPipe } from '@angular/common';
import { ITccProfile } from '../../../common/models/TccProfile';
import { ConfigService } from '../config.service';
import { FormGroup, FormControl } from '@angular/forms';

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

  public customProfilesEdit: ITccProfile[];
  public showDefaultProfiles: boolean;
  public selectedCustomProfile: string;

  public formProfileEdit: FormGroup;

  constructor(private sysfs: SysFsService, private decimalPipe: DecimalPipe, private config: ConfigService) {
    this.formProfileEdit = new FormGroup({
      inputNumberCores: new FormControl(),
      inputMinFreq: new FormControl(),
      inputMaxFreq: new FormControl(),
      inputScalingGovernor: new FormControl(),
      inputEnergyPerformancePreference: new FormControl()
    });
  }

  ngOnInit() {
    this.updateData();
    this.updateInterval = setInterval(() => { this.periodicUpdate(); }, 2000);
  }

  ngOnDestroy() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
  }

  private periodicUpdate(): void {
    this.updateData();
  }

  public getCustomProfiles(): ITccProfile[] {
    return this.config.getCustomProfiles();
  }

  public getAllProfiles(): ITccProfile[] {
    return this.config.getAllProfiles();
  }

  public getDefaultProfilesForTable(): ITccProfile[] {
    if (this.showDefaultProfiles) {
      return this.config.getDefaultProfiles().filter(e => e.name !== 'Default');
    } else {
      return [];
    }
  }

  public selectCustomProfileEdit(profileName: string): void {
    if (this.config.getCurrentEditingProfile() !== undefined && this.config.getCurrentEditingProfile().name === profileName) { return; }
    if (!this.formProfileEdit.dirty && this.config.setCurrentEditingProfile(profileName)) {
      const formControls = this.formProfileEdit.controls;
      const currentProfileCpu = this.config.getCurrentEditingProfile().cpu;

      if (currentProfileCpu.onlineCores === undefined) {
        formControls.inputNumberCores.setValue(this.cpuInfo.availableCores);
      } else {
        formControls.inputNumberCores.setValue(currentProfileCpu.onlineCores);
      }

      if (currentProfileCpu.scalingMinFrequency === undefined) {
        formControls.inputMinFreq.setValue(this.cpuCoreInfo[0].cpuInfoMinFreq);
      } else {
        formControls.inputMinFreq.setValue(currentProfileCpu.scalingMinFrequency);
      }

      if (currentProfileCpu.scalingMaxFrequency === undefined) {
        formControls.inputMaxFreq.setValue(this.cpuCoreInfo[0].cpuInfoMaxFreq);
      } else {
        formControls.inputMaxFreq.setValue(currentProfileCpu.scalingMaxFrequency);
      }

      formControls.inputScalingGovernor.setValue(currentProfileCpu.governor);
      formControls.inputEnergyPerformancePreference.setValue(currentProfileCpu.energyPerformancePreference);
    } else {
      setImmediate(() => {
        if (!this.currentlyEditingProfile()) {
          this.selectedCustomProfile = undefined;
        } else {
          this.selectedCustomProfile = this.config.getCurrentEditingProfile().name;
        }
      });
    }
  }

  public currentlyEditingProfile(): boolean {
    return this.config.getCurrentEditingProfile() !== undefined;
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

  public getEditProfile(): ITccProfile {
    return this.config.getCurrentEditingProfile();
  }
}
