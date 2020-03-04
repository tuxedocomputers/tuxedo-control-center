/*!
 * Copyright (c) 2019 TUXEDO Computers GmbH <tux@tuxedocomputers.com>
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
import { Component, OnInit, OnDestroy, ViewEncapsulation } from '@angular/core';
import { ILogicalCoreInfo, IGeneralCPUInfo, SysFsService, IPstateInfo } from '../sys-fs.service';
import { Subscription } from 'rxjs';
import { UtilsService } from '../utils.service';
import { TccDBusClientService, IDBusFanData } from '../tcc-dbus-client.service';
import { ITccProfile } from 'src/common/models/TccProfile';
import { StateService } from '../state.service';
import { Router } from '@angular/router';
import { ConfigService } from '../config.service';

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

  public fanData: IDBusFanData;

  public activeProfile: ITccProfile;
  public isCustomProfile: boolean;

  public fanProfileProgressMap: Map<string, number>;

  private subscriptions: Subscription = new Subscription();

  constructor(
    private sysfs: SysFsService,
    private utils: UtilsService,
    private tccdbus: TccDBusClientService,
    private state: StateService,
    private router: Router,
    private config: ConfigService
  ) { }

  ngOnInit() {
    this.subscriptions.add(this.sysfs.generalCpuInfo.subscribe(cpuInfo => { this.cpuInfo = cpuInfo; }));
    this.subscriptions.add(this.sysfs.logicalCoreInfo.subscribe(coreInfo => { this.cpuCoreInfo = coreInfo; this.updateFrequencyData(); }));
    this.subscriptions.add(this.sysfs.pstateInfo.subscribe(pstateInfo => { this.pstateInfo = pstateInfo; }));
    this.subscriptions.add(this.tccdbus.fanData.subscribe(fanData => { this.fanData = fanData; }));
    this.subscriptions.add(this.state.activeProfile.subscribe(profile => {
      this.activeProfile = profile;
      this.isCustomProfile = this.config.getCustomProfileByName(this.activeProfile.name) !== undefined;
    }));

    const fanProfileNames = this.config.getFanProfiles().map(fanProfile => fanProfile.name);
    this.fanProfileProgressMap = new Map();
    const fanProfileProgressStep = 100.0 / fanProfileNames.length;
    let progressValue = 0;
    for (const fanProfileName of fanProfileNames) {
      progressValue += fanProfileProgressStep;
      this.fanProfileProgressMap.set(fanProfileName, progressValue);
    }
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

  public gaugeOnOffFormat: (value: number) => string = (value) => {
    if (value === 0) {
      return "off";
    } else {
      return "on";
    }
  }

  public goToProfileEdit(profile: ITccProfile): void {
    if (profile !== undefined) {
      this.router.navigate(['profile-manager', profile.name]);
    }
  }
}
