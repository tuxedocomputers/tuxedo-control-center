/*!
 * Copyright (c) 2019-2022 TUXEDO Computers GmbH <tux@tuxedocomputers.com>
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
import { Component, OnInit, OnDestroy } from '@angular/core';
import { ILogicalCoreInfo, IGeneralCPUInfo, SysFsService, IPstateInfo } from '../sys-fs.service';
import { Subscription } from 'rxjs';
import { UtilsService } from '../utils.service';
import { TccDBusClientService, IDBusFanData } from '../tcc-dbus-client.service';
import { ITccProfile } from 'src/common/models/TccProfile';
import { StateService } from '../state.service';
import { ActivatedRoute, Router } from '@angular/router';
import { ConfigService } from '../config.service';

import { NodeService } from '../node.service';
import { CompatibilityService } from '../compatibility.service';
import { CpuPower } from 'src/common/models/TccPowerSettings';
import { GpuInfo } from 'src/common/models/TccGpuValues';

@Component({
  selector: 'app-cpu-dashboard',
  templateUrl: './cpu-dashboard.component.html',
  styleUrls: ['./cpu-dashboard.component.scss']
})
export class CpuDashboardComponent implements OnInit, OnDestroy {

  public cpuCoreInfo: ILogicalCoreInfo[];
  public cpuInfo: IGeneralCPUInfo;
  public pstateInfo: IPstateInfo;

  public activeCores: number;
  public activeScalingMinFreqs: string[];
  public activeScalingMaxFreqs: string[];
  public activeScalingDrivers: string[];
  public activeScalingGovernors: string[];
  public activeEnergyPerformancePreference: string[];

  public avgCpuFreq: number;
  public avgCpuFreqData;

  public cpuModelName = '';

  public fanData: IDBusFanData;
  public gaugeGPUTemp: number;
  public gaugeGPUSpeed: number;
  public hasGPUTemp = false;

  public gaugeGPUPower: number;
  public gaugeGPUFreq: number;
  public gaugeCPUPower: number;
  public gpuPower: number;
  public gpuFreq: number;
  public cpuPower: number;

  public activeProfile: ITccProfile;
  public isCustomProfile: boolean;

  public animatedGauges = true;
  public animatedGaugesDuration = 0.1;

  private subscriptions: Subscription = new Subscription();

  private tweakVal = 0;

  public odmProfileNames: string[] = [];
  public odmProfileToName: Map<string, string> = new Map();
  public odmProfileProgressMap: Map<string, number> = new Map();

  constructor(
    private sysfs: SysFsService,
    private utils: UtilsService,
    private tccdbus: TccDBusClientService,
    private state: StateService,
    private router: Router,
    private route: ActivatedRoute,
    private config: ConfigService,
    private node: NodeService,
    public compat: CompatibilityService
  ) { }

  private validTemp(tempValue: number) {
    if (tempValue <= 1) {
      return false;
    } else {
      return true;
    }
  }

  ngOnInit() {
    this.subscriptions.add(this.sysfs.generalCpuInfo.subscribe(cpuInfo => { this.cpuInfo = cpuInfo; }));
    this.subscriptions.add(this.sysfs.logicalCoreInfo.subscribe(coreInfo => { this.cpuCoreInfo = coreInfo; this.updateFrequencyData(); }));
    this.subscriptions.add(this.sysfs.pstateInfo.subscribe(pstateInfo => { this.pstateInfo = pstateInfo; }));
    this.subscriptions.add(
        this.tccdbus.gpuInfo.subscribe((gpuInfo: GpuInfo) => {
            const gpuDefaultValues = {
                gaugeGPUPower: 0,
                gaugeGPUFreq: 0,
            };

            if (!gpuInfo) {
                Object.assign(this, gpuDefaultValues);
                return;
            }

            if (gpuInfo.powerDraw > 0 && gpuInfo.maxPowerLimit > 0) {
                this.gaugeGPUPower =
                    (gpuInfo.powerDraw / gpuInfo.maxPowerLimit) * 100;
                this.gpuPower = gpuInfo.powerDraw;
            } else if (gpuInfo.powerDraw > 0 && gpuInfo.maxPowerLimit < 0) {
                this.gaugeGPUPower = gpuDefaultValues.gaugeGPUPower;
                this.gpuPower = gpuInfo.powerDraw;
            } else {
                this.gaugeGPUPower = gpuDefaultValues.gaugeGPUPower;
                this.gpuPower = gpuDefaultValues.gaugeGPUPower;
            }

            if (gpuInfo.coreFrequency > 0 && gpuInfo.maxCoreFrequency > 0) {
                this.gaugeGPUFreq =
                    (gpuInfo.coreFrequency / gpuInfo.maxCoreFrequency) * 100;
                this.gpuFreq = gpuInfo.coreFrequency;
            } else {
                this.gaugeGPUFreq = gpuDefaultValues.gaugeGPUFreq;
                this.gpuFreq = gpuDefaultValues.gaugeGPUFreq;
            }
        })
    );

    this.subscriptions.add(
        this.tccdbus.cpuPower.subscribe((cpuPower: CpuPower) => {
            const cpuDefaultValues = { gaugeCPUPower: 0 };

            if (!cpuPower || !this.compat.hasCpuPower) {
                Object.assign(this, cpuDefaultValues);
                return;
            }

            if (cpuPower.powerDraw > 0 && cpuPower.maxPowerLimit > 0) {
                this.gaugeCPUPower =
                    (cpuPower.powerDraw / cpuPower.maxPowerLimit) * 100;
                this.cpuPower = cpuPower.powerDraw;
            } else {
                this.gaugeCPUPower = cpuDefaultValues.gaugeCPUPower;
                this.cpuPower = cpuDefaultValues.gaugeCPUPower;
            }
        })
    );

    this.subscriptions.add(this.tccdbus.fanData.subscribe(fanData => {
      this.fanData = fanData;
      let avgTemp: number;
      let avgSpeed: number;
      const temp1 = this.fanData.gpu1.temp.data.value;
      const temp2 = this.fanData.gpu2.temp.data.value;
      const speed1 = this.fanData.gpu1.speed.data.value;
      const speed2 = this.fanData.gpu2.speed.data.value;
      // TODO: Validation should in the future be decided in the data layer
      if (this.validTemp(temp1) && this.validTemp(temp2)) {
        avgTemp = (temp1 + temp2) / 2;
        avgSpeed = (speed1 + speed2) / 2;
      } else if (this.validTemp(temp1)) {
        avgTemp = temp1;
        avgSpeed = speed1;
      } else {
        // This covers two cases, temp2 having a valid temperature, and not having GPU temperature at all
        avgTemp = temp2;
        avgSpeed = speed2;
      }
      this.hasGPUTemp = this.validTemp(avgTemp);
      this.gaugeGPUTemp = Math.round(avgTemp);
      this.gaugeGPUSpeed = Math.round(avgSpeed);

      // Workaround for gauge not updating (in some cases) when the value is the same
      this.fanData.cpu.speed.data.value += this.tweakVal;
      this.fanData.cpu.temp.data.value += this.tweakVal;
      this.fanData.gpu1.speed.data.value += this.tweakVal;
      this.fanData.gpu1.temp.data.value += this.tweakVal;
      this.fanData.gpu2.speed.data.value += this.tweakVal;
      this.fanData.gpu2.temp.data.value += this.tweakVal;
      if (this.tweakVal === 0) {
        this.tweakVal = 0.0001;
      } else {
        this.tweakVal = 0;
      }
    }));
    this.subscriptions.add(this.state.activeProfile.subscribe(profile => {
      if (profile) {
        this.activeProfile = profile;
        this.isCustomProfile = this.config.getCustomProfileById(this.activeProfile.id) !== undefined;
      }
    }));

    /*this.cpuModelName = this.node.getOs().cpus()[0].model;
    this.cpuModelName = this.cpuModelName.split('@')[0];
    this.cpuModelName = this.cpuModelName.split('CPU')[0];*/

    this.subscriptions.add(this.tccdbus.odmProfilesAvailable.subscribe(nextAvailableODMProfiles => {
        this.odmProfileNames = nextAvailableODMProfiles;

        // Update ODM profile name map
        this.odmProfileToName.clear();
        this.odmProfileProgressMap.clear();
        let odmProfileProgressValue = 0;
        if (this.odmProfileNames.length > 0) {
            const odmProfileProgressStep = 100.0 / (this.odmProfileNames.length - 1);
            for (const profileName of this.odmProfileNames) {
                if (profileName.length > 0) {
                    this.odmProfileToName.set(profileName, profileName.charAt(0).toUpperCase() + profileName.replace('_', ' ').slice(1));
                    this.odmProfileProgressMap.set(profileName, odmProfileProgressValue);
                    odmProfileProgressValue += odmProfileProgressStep;
                }
            }
        }
    }));
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  private updateFrequencyData(): void {
    this.activeCores = 0;
    this.activeScalingMinFreqs = [];
    this.activeScalingMaxFreqs = [];
    this.activeScalingDrivers = [];
    this.activeScalingGovernors = [];
    this.activeEnergyPerformancePreference = [];
    for (const core of this.cpuCoreInfo) {
      if (core.scalingMinFreq !== undefined && !this.activeScalingMinFreqs.includes(this.utils.formatCpuFrequency(core.scalingMinFreq))) {
        this.activeScalingMinFreqs.push(this.utils.formatCpuFrequency(core.scalingMinFreq));
      }
      if (core.scalingMaxFreq !== undefined && !this.activeScalingMaxFreqs.includes(this.utils.formatCpuFrequency(core.scalingMaxFreq))) {
        this.activeScalingMaxFreqs.push(this.utils.formatCpuFrequency(core.scalingMaxFreq));
      }
      if (core.scalingGovernor !== undefined && !this.activeScalingGovernors.includes(core.scalingGovernor)) {
        this.activeScalingGovernors.push(core.scalingGovernor);
      }
      if (core.energyPerformancePreference !== undefined
        && !this.activeEnergyPerformancePreference.includes(core.energyPerformancePreference)) {
        this.activeEnergyPerformancePreference.push(core.energyPerformancePreference);
      }
      if (core.scalingDriver !== undefined && !this.activeScalingDrivers.includes(core.scalingDriver)) {
        this.activeScalingDrivers.push(core.scalingDriver);
      }
    }

    // Calculate average frequency over the logical cores
    const freqSum: number =
      this.cpuCoreInfo
      .map(info => info.scalingCurFreq)
      .reduce((sum, currentFreq) => sum + currentFreq, 0);
    this.avgCpuFreq = freqSum / this.cpuCoreInfo.length;
    this.avgCpuFreqData = [{ name: 'CPU frequency', value: this.avgCpuFreq }];
  }

  public formatCpuFrequency = (frequency: number): string => {
    return this.utils.formatCpuFrequency(frequency);
  }

  public formatGpuFrequency = (frequency: number): string => {
    if (frequency > 0) {
        return this.utils.formatGpuFrequency(frequency);
    } else {
        return $localize `:@@noGpuFreqValue:N/A`;
    }
  }

  public gaugeCpuFreqFormat: (value: number) => string = (value) => {
    return this.utils.formatCpuFrequency(value);
  }

  public gaugeTempFormat: (value: number) => string = (value) => {
    if (this.compat.hasFanInfo) {
      return Math.round(value).toString();
    } else {
      return $localize `:@@noFanTempValue:N/A`;
    }
  }

  public gaugeFanSpeedFormat: (value: number) => string = (value) => {
    if (this.compat.hasFanInfo) {
      return Math.round(value).toString();
    } else {
      return $localize `:@@noFanSpeedValue:N/A`;
    }
  }

  public cpuPowerFormat: (value: number) => string = (value) => {
    if (this.compat.hasCpuPower) {
      return Math.round(value).toString()
    } else {
      return $localize `:@@noCpuPowerValue:N/A`;
    }
  }

  public gpuPowerFormat: (value: number) => string = (value) => {
    if (this.compat.hasGpuPowerDraw) {
      return Math.round(value).toString()
    } else {
      return $localize `:@@noGpuPowerValue:N/A`;
    }
  }

  public goToProfileEdit(profile: ITccProfile): void {
    if (profile !== undefined) {
      this.router.navigate(['profile-manager', profile.id], { relativeTo: this.route.parent });
    }
  }

  public getCPUSettingsEnabled(): boolean {
    return this.config.getSettings().cpuSettingsEnabled;
  }

  public getCPUSettingsDisabledTooltip(): string {
    return this.config.cpuSettingsDisabledMessage;
  }

  public getFanControlEnabled(): boolean {
    return this.config.getSettings().fanControlEnabled;
  }

  public getFanControlDisabledTooltip(): string {
    return this.config.fanControlDisabledMessage;
  }
}