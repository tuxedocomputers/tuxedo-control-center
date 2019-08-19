import { Component, OnInit, OnDestroy } from '@angular/core';

import { SysFsService, ILogicalCoreInfo } from '../sys-fs.service';

@Component({
  selector: 'app-cpu-settings',
  templateUrl: './cpu-settings.component.html',
  styleUrls: ['./cpu-settings.component.scss']
})
export class CpuSettingsComponent implements OnInit, OnDestroy {

  public cpuInfo: ILogicalCoreInfo[];

  private updateInterval: NodeJS.Timeout;

  constructor(private sysfs: SysFsService) {}

  ngOnInit() {
    this.updateData();
    this.updateInterval = setInterval(() => { this.periodicUpdate(); }, 2000);
  }

  public updateData(): void {
    this.cpuInfo = this.sysfs.getLogicalCoreInfo();
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
