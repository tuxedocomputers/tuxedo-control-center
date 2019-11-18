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
