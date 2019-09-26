import { Injectable } from '@angular/core';
import { SysFsService } from './sys-fs.service';
import { ITccProfile, defaultCustomProfile } from '../../common/models/TccProfile';
import { ElectronService } from 'ngx-electron';
import { DecimalPipe } from '@angular/common';
import * as https from 'https';
import * as fs from 'fs';
import * as path from 'path';

@Injectable({
  providedIn: 'root'
})
export class UtilsService {

  constructor(
    private sysfs: SysFsService,
    private electron: ElectronService,
    private decimalPipe: DecimalPipe) { }

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

  public async execCmd(command: string): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
      this.electron.ipcRenderer.once('exec-cmd-result', (event, result) => {
        if (result.error === null) {
          resolve(result.data);
        } else {
          reject(result.error);
        }
      });
      this.electron.ipcRenderer.send('exec-cmd-async', command);
    });
  }

  public spawnExternal(command: string): void {
    this.electron.ipcRenderer.send('spawn-external-async', command);
  }

  public async httpsGet(url: string): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
      try {
        const dataArray: Buffer[] = [];
        const req = https.get(url, response => {

          response.on('data', (data) => {
            dataArray.push(data);
          });

          response.once('end', () => {
            resolve(Buffer.concat(dataArray));
          });

          response.once('error', (err) => {
            reject(err);
          });

        });

        req.once('error', (err) => {
          reject(err);
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  public async writeTextFile(filePath: string, fileData: string | Buffer, writeFileOptions?: fs.WriteFileOptions): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      try {
        if (!fs.existsSync(path.dirname(filePath))) {
            fs.mkdirSync(path.dirname(filePath), { mode: 0o755, recursive: true });
        }
        fs.writeFile(filePath, fileData, writeFileOptions, err => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  public async modFile(filePath: string, mode: number): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      fs.chmod(filePath, mode, err => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  public formatFrequency(frequency: number): string {
    return this.decimalPipe.transform(frequency / 1000000, '1.1-2');
  }
}
