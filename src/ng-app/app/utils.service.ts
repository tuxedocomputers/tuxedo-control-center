import { Injectable } from '@angular/core';
import { SysFsService } from './sys-fs.service';
import { ConfigService } from './config.service';
import { ITccProfile, defaultCustomProfile } from '../../common/models/TccProfile';

@Injectable({
  providedIn: 'root'
})
export class UtilsService {

  constructor(private sysfs: SysFsService) { }

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
}
