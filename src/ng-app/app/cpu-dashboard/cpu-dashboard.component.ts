import { Component, OnInit, OnDestroy } from '@angular/core';
import { ILogicalCoreInfo, IGeneralCPUInfo, SysFsService, IPstateInfo } from '../sys-fs.service';
import { Subscription } from 'rxjs';
import { UtilsService } from '../utils.service';
import { TccDBusClientService, IDBusFanData } from '../tcc-dbus-client.service';

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

  public fanData: IDBusFanData;

  private subscriptions: Subscription = new Subscription();

  constructor(
    private sysfs: SysFsService,
    private utils: UtilsService,
    private tccdbus: TccDBusClientService
  ) { }

  ngOnInit() {
    this.subscriptions.add(this.sysfs.generalCpuInfo.subscribe(cpuInfo => { this.cpuInfo = cpuInfo; }));
    this.subscriptions.add(this.sysfs.logicalCoreInfo.subscribe(coreInfo => { this.cpuCoreInfo = coreInfo; this.updateFrequencyData(); }));
    this.subscriptions.add(this.sysfs.pstateInfo.subscribe(pstateInfo => { this.pstateInfo = pstateInfo; }));
    this.subscriptions.add(this.tccdbus.fanData.subscribe(fanData => { this.fanData = fanData; }));
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
  }

  public formatFrequency(frequency: number): string {
    return this.utils.formatFrequency(frequency);
  }
}
