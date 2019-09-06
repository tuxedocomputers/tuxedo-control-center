import { Injectable } from '@angular/core';
import { SysFsService } from './sys-fs.service';
import { ConfigService } from './config.service';
import { ITccProfile, defaultCustomProfile } from '../../common/models/TccProfile';
import { ElectronService } from 'ngx-electron';

@Injectable({
  providedIn: 'root'
})
export class UtilsService {

  constructor(private sysfs: SysFsService, private electron: ElectronService) { }

  public fillDefaultValuesProfile(profile: ITccProfile): void {
    const cpuInfo = this.sysfs.getGeneralCpuInfo();
    const cpuCoreInfo = this.sysfs.getLogicalCoreInfo();

    if (profile.cpu.onlineCores === undefined) {
      profile.cpu.onlineCores = cpuInfo.availableCores;
    }

    if (profile.cpu.scalingMinFrequency === undefined) {
      profile.cpu.scalingMinFrequency = cpuCoreInfo[0].cpuInfoMinFreq;
    }

    if (profile.cpu.scalingMaxFrequency === undefined) {
      profile.cpu.scalingMaxFrequency = cpuCoreInfo[0].cpuInfoMaxFreq;
    }

    if (profile.cpu.governor === undefined) {
      profile.cpu.governor = defaultCustomProfile.cpu.governor;
    }

    if (profile.cpu.energyPerformancePreference === undefined) {
      profile.cpu.energyPerformancePreference = defaultCustomProfile.cpu.energyPerformancePreference;
    }
  }

  public execCmd(command: string): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
      this.electron.ipcRenderer.once('exec-cmd-result', (event, result) => {
        if (result.data !== undefined) {
          resolve(result.data);
        } else {
          reject(result.error);
        }
      });
      this.electron.ipcRenderer.send('exec-cmd-async', command);
    });
  }
}
