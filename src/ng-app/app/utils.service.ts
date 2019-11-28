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

  private blurNoInput = false;
  get pageDisabled(): boolean { return this.blurNoInput; }
  set pageDisabled(value: boolean) { this.blurNoInput = value; }

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

    if (profile.cpu.noTurbo === undefined) {
      profile.cpu.noTurbo = defaultCustomProfile.cpu.noTurbo;
    }

    if (profile.webcam === undefined) {
      profile.webcam = {
        useStatus: false,
        status: true
      };
    }

    if (profile.webcam.useStatus === undefined) {
      profile.webcam.useStatus = false;
    }

    if (profile.webcam.status === undefined) {
      profile.webcam.status = true;
    }

    if (profile.fan === undefined) {
      profile.fan = {
        useControl: true,
        fanProfile: 'Balanced'
      };
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

  public getAppVersion(): string {
    return this.electron.remote.app.getVersion();
  }

  public getProcessVersions(): NodeJS.ProcessVersions {
    return this.electron.remote.process.versions;
  }

  public changeLanguage(languageId: string) {
    localStorage.setItem('langId', languageId);
    location.reload();
  }

  public getCurrentLanguageId(): string {
    let langId = 'en';
    const storedLangId = localStorage.getItem('langId');
    if (storedLangId !== undefined && storedLangId !== null) {
      langId = storedLangId;
    }
    return langId;
  }
}
