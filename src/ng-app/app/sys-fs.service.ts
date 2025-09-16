/*!
 * Copyright (c) 2019-2025 TUXEDO Computers GmbH <tux@tuxedocomputers.com>
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

import { Injectable, type OnDestroy } from '@angular/core';
import type { IGeneralCPUInfo, ILogicalCoreInfo, IPstateInfo, IDisplayBrightnessInfo } from '../../common/models/ICpuInfos';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SysFsService implements OnDestroy {


  private updateInterval: NodeJS.Timeout;
  private updatePeriodMs: number = 3000;
  public generalCpuInfo: BehaviorSubject<IGeneralCPUInfo>;
  public logicalCoreInfo: BehaviorSubject<ILogicalCoreInfo[]>;
  public pstateInfo: BehaviorSubject<IPstateInfo>;

  constructor() {
    this.generalCpuInfo = new BehaviorSubject(undefined);
    this.logicalCoreInfo = new BehaviorSubject(undefined);
    this.pstateInfo = new BehaviorSubject(undefined);


    this.periodicUpdate();
    this.updateInterval =  setInterval(async (): Promise<void> => { await this.periodicUpdate(); }, this.updatePeriodMs);
  }

  private async periodicUpdate(): Promise<void> {
    if (this.generalCpuInfo === undefined) {
      this.generalCpuInfo = new BehaviorSubject(await this.getGeneralCpuInfo());
    } else {
      this.generalCpuInfo.next(await this.getGeneralCpuInfo());
    }

    if (this.logicalCoreInfo === undefined) {
      this.logicalCoreInfo = new BehaviorSubject(await this.getLogicalCoreInfo());
    } else {
      this.logicalCoreInfo.next(await this.getLogicalCoreInfo());
    }

    if (this.pstateInfo === undefined) {
      this.pstateInfo = new BehaviorSubject(await this.getPstateInfo());
    } else {
      this.pstateInfo.next(await this.getPstateInfo());
    }
  }

  public ngOnDestroy(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
  }

  public async getGeneralCpuInfo(): Promise<IGeneralCPUInfo> {
    return window.cpu.getGeneralCpuInfoAsync();
  }

  public async getLogicalCoreInfo(): Promise<ILogicalCoreInfo[]> {
    return window.cpu.getLogicalCoreInfoAsync();
  }

  public async getPstateInfo(): Promise<IPstateInfo> {
    return new Promise<IPstateInfo>(async (resolve: (value: IPstateInfo | PromiseLike<IPstateInfo>) => void, reject: (reason?: unknown) => void): Promise<void> => {
        try {
            const pstateInfo: IPstateInfo = {
                noTurbo: await window.cpu.getIntelPstateTurboValueAsync()
              };
              resolve (pstateInfo);
        } catch (err: unknown) {
          console.error("sys-fs.service: getPstateInfo failed =>", err)
          reject(err);
        }
      });;
  }

  public getDisplayBrightnessInfo(): IDisplayBrightnessInfo[] {
    return window.backlight.getDisplayBrightnessInfo();
  }
}


