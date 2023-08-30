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
import { Injectable, OnDestroy } from '@angular/core';
import { IGeneralCPUInfo, ILogicalCoreInfo, IPstateInfo, IDisplayBrightnessInfo } from '../../common/models/ICpuInfos';
import { BehaviorSubject } from 'rxjs';



@Injectable({
  providedIn: 'root'
})
export class SysFsService implements OnDestroy {
  // TODO do not use backlight controller directly, use specific methods over the contextbridge 


  private updateInterval: NodeJS.Timeout;
  private updatePeriodMs = 3000;
  public generalCpuInfo: BehaviorSubject<IGeneralCPUInfo>;
  public logicalCoreInfo: BehaviorSubject<ILogicalCoreInfo[]>;
  public pstateInfo: BehaviorSubject<IPstateInfo>;

  constructor() {



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
    return window.cpu.getGeneralCpuInfoSync();
  }

  public getLogicalCoreInfo(): ILogicalCoreInfo[] {
    return window.cpu.getLogicalCoreInfoSync();
  }

  public getPstateInfo(): IPstateInfo {
    const pstateInfo: IPstateInfo = {
      noTurbo: window.cpu.getIntelPstateTurboValueSync()
    };
    return pstateInfo;
  }

  public getDisplayBrightnessInfo(): IDisplayBrightnessInfo[] {
    return window.backlight.getDisplayBrightnessInfo();
  }
}


