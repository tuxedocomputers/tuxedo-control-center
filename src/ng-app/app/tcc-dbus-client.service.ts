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
import { TccDBusController } from '../../common/classes/TccDBusController';
import { BehaviorSubject } from 'rxjs';
import { FanData } from '../../service-app/classes/TccDBusInterface';

export interface IDBusFanData {
  cpu: FanData;
  gpu1: FanData;
  gpu2: FanData;
}

@Injectable({
  providedIn: 'root'
})
export class TccDBusClientService implements OnDestroy {

  private tccDBusInterface: TccDBusController;
  private isAvailable: boolean;
  private timeout: NodeJS.Timeout;
  private updateInterval = 500;

  public tuxedoWmiAvailable: BehaviorSubject<boolean>;
  public fanData = new BehaviorSubject<IDBusFanData>({cpu: new FanData(), gpu1: new FanData(), gpu2: new FanData() });

  constructor() {
    this.tccDBusInterface = new TccDBusController();
    this.tccDBusInterface.init().then(success => {
      this.isAvailable = success;
      this.periodicUpdate();
      this.timeout = setInterval(() => { this.periodicUpdate(); }, this.updateInterval);
    });
  }

  private async periodicUpdate() {
    if (!this.isAvailable) {
      this.isAvailable = await this.tccDBusInterface.init();
    }

    const wmiStatus = await this.tccDBusInterface.tuxedoWmiAvailable();
    if (this.tuxedoWmiAvailable === undefined) {
      this.tuxedoWmiAvailable = new BehaviorSubject(wmiStatus);
    } else {
      this.tuxedoWmiAvailable.next(wmiStatus);
    }

    const fanData: IDBusFanData = {
      cpu: await this.tccDBusInterface.getFanDataCPU(),
      gpu1: await this.tccDBusInterface.getFanDataGPU1(),
      gpu2: await this.tccDBusInterface.getFanDataGPU2()
    };
    this.fanData.next(fanData);
  }

  ngOnDestroy() {
    // Cleanup
    if (this.timeout !== undefined) {
      clearInterval(this.timeout);
    }
  }
}
