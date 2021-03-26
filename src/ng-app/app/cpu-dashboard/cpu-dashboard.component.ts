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
import { Component, OnInit, OnDestroy } from '@angular/core';
import { ILogicalCoreInfo, IGeneralCPUInfo, SysFsService, IPstateInfo } from '../sys-fs.service';
import { Subscription } from 'rxjs';
import { UtilsService } from '../utils.service';
import { TccDBusClientService, IDBusFanData } from '../tcc-dbus-client.service';
import { ITccProfile } from 'src/common/models/TccProfile';
import { StateService } from '../state.service';
import { Router } from '@angular/router';
import { ConfigService } from '../config.service';

import { I18n } from '@ngx-translate/i18n-polyfill';
import { NodeService } from '../node.service';
import { CompatibilityService } from '../compatibility.service';

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

  public activeProfile: ITccProfile;
  public isCustomProfile: boolean;

  public fanProfileProgressMap: Map<string, number>;

  public animatedGauges = true;
  public animatedGaugesDuration = 0.1;

  private subscriptions: Subscription = new Subscription();

  private tweakVal = 0;

  constructor(
    private sysfs: SysFsService,
    private utils: UtilsService,
    private tccdbus: TccDBusClientService,
    private state: StateService,
    private router: Router,
    private config: ConfigService,
    private node: NodeService,
    public compat: CompatibilityService,
    private i18n: I18n
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
        this.isCustomProfile = this.config.getCustomProfileByName(this.activeProfile.name) !== undefined;
      }
    }));

    const fanProfileNames = this.config.getFanProfiles().map(fanProfile => fanProfile.name);
    this.fanProfileProgressMap = new Map();
    const fanProfileProgressStep = 100.0 / fanProfileNames.length;
    let progressValue = 0;
    for (const fanProfileName of fanProfileNames) {
      progressValue += fanProfileProgressStep;
      this.fanProfileProgressMap.set(fanProfileName, progressValue);
    }

    /*this.cpuModelName = this.node.getOs().cpus()[0].model;
    this.cpuModelName = this.cpuModelName.split('@')[0];
    this.cpuModelName = this.cpuModelName.split('CPU')[0];*/
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
      if (core.scalingMinFreq !== undefined && !this.activeScalingMinFreqs.includes(this.utils.formatFrequency(core.scalingMinFreq))) {
        this.activeScalingMinFreqs.push(this.utils.formatFrequency(core.scalingMinFreq));
      }
      if (core.scalingMaxFreq !== undefined && !this.activeScalingMaxFreqs.includes(this.utils.formatFrequency(core.scalingMaxFreq))) {
        this.activeScalingMaxFreqs.push(this.utils.formatFrequency(core.scalingMaxFreq));
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

  public formatFrequency = (frequency: number): string => {
    return this.utils.formatFrequency(frequency);
  }

  public gaugeFreqFormat: (value: number) => string = (value) => {
    return this.utils.formatFrequency(value);
  }

  public gaugeFanTempFormat: (value: number) => string = (value) => {
    if (this.compat.hasFancontrol) {
      return Math.round(value).toString();
    } else {
      return this.i18n({ value: 'N/A'});
    }
  }

  public gaugeFanSpeedFormat: (value: number) => string = (value) => {
    if (this.compat.hasFancontrol) {
      return Math.round(value).toString();
    } else {
      return this.i18n({ value: 'N/A'});
    }
  }

  public gaugeOnOffFormat: (value: number) => string = (value) => {
    if (value === 0) {
      return this.i18n({ value: 'off'});
    } else {
      return this.i18n({ value: 'on'});
    }
  }

  public goToProfileEdit(profile: ITccProfile): void {
    if (profile !== undefined) {
      this.router.navigate(['profile-manager', profile.name]);
    }
  }
}
