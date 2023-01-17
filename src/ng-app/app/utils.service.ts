/*!
 * Copyright (c) 2019-2022 TUXEDO Computers GmbH <tux@tuxedocomputers.com>
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
import { Injectable, Inject, LOCALE_ID } from '@angular/core';
import { SysFsService } from './sys-fs.service';
import { ElectronService } from 'ngx-electron';
import { DecimalPipe } from '@angular/common';
import * as https from 'https';
import * as fs from 'fs';
import * as path from 'path';

import { OverlayContainer } from '@angular/cdk/overlay';
import { BehaviorSubject } from 'rxjs';
import { ConfirmDialogData, ConfirmDialogResult, DialogConfirmComponent } from './dialog-confirm/dialog-confirm.component';
import { MatDialog } from '@angular/material/dialog';
import { ITccProfile } from '../../common/models/TccProfile';
import { DefaultProfileIDs, IProfileTextMappings, LegacyDefaultProfileIDs } from '../../common/models/DefaultProfiles';

@Injectable({
  providedIn: 'root'
})
export class UtilsService {

  private blurNoInput = false;
  get pageDisabled(): boolean { return this.blurNoInput; }
  set pageDisabled(value: boolean) { this.blurNoInput = value; }

  private languagesMenuArray = [
    { id: 'en', label: 'English', img: 'english.svg' },
    { id: 'de', label: 'Deutsch', img: 'german.svg' }
  ];
  private languageMap;

  public themeClass: BehaviorSubject<string>;

  private localeId: string;

  constructor(
    private sysfs: SysFsService,
    private electron: ElectronService,
    private decimalPipe: DecimalPipe,
    public overlayContainer: OverlayContainer,
    public dialog: MatDialog,
    @Inject(LOCALE_ID) localeId) {
      this.localeId = localeId;
      this.languageMap = {};
      for (const lang of this.getLanguagesMenuArray()) {
        this.languageMap[lang.id] = lang;
      }

      this.themeClass = new BehaviorSubject(undefined);
    }

  public async execCmd(command: string): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
      this.electron.ipcRenderer.invoke('exec-cmd-async', command).then((result) => {
        if (result.error === null) {
          resolve(result.data);
        } else {
          reject(result.error);
        }
      });
    });
  }

  public async execFile(command: string): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
      this.electron.ipcRenderer.invoke('exec-file-async', command).then((result) => {
        if (result.error === null) {
          resolve(result.data);
        } else {
          reject(result.error);
        }
      });
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
    return this.decimalPipe.transform(frequency / 1000000, '1.1-1');
  }

  public getAppVersion(): string {
    return this.electron.remote.app.getVersion();
  }

  public getProcessVersions(): NodeJS.ProcessVersions {
    return this.electron.remote.process.versions;
  }

  public changeLanguage(languageId: string) {
    this.electron.ipcRenderer.send('trigger-language-change', languageId);
  }

  public getCurrentLanguageId(): string {
    return this.localeId;
  }

  public getLanguageData(langId: string) {
    return this.languageMap[langId];
  }

  public getLanguagesMenuArray() {
    return this.languagesMenuArray;
  }

  public getThemeClass(): string {
    return this.themeClass.value;
  }

  public async setBrightnessMode(mode: 'light' | 'dark' | 'system') {
    return await this.electron.ipcRenderer.invoke('set-brightness-mode', mode);
  }

  public async getBrightnessMode(): Promise<'light' | 'dark' | 'system'> {
    return await this.electron.ipcRenderer.invoke('get-brightness-mode');
  }

  public async getShouldUseDarkColors(): Promise<boolean> {
    return this.electron.ipcRenderer.invoke('get-should-use-dark-colors');
  }

  /**
   * Note: Only for updating web part, to change behaviour use setBrightnessMode
   */
  public setThemeClass(className: string) {
    this.overlayContainer.getContainerElement().classList.add(className);
    this.themeClass.next(className);
  }

  public setThemeLight() {
    this.setThemeClass('light-theme');
  }

  public setThemeDark() {
    this.setThemeClass('dark-theme');
  }

  public async updateBrightnessMode() {
    if (await this.getShouldUseDarkColors()) {
        this.setThemeDark();
    } else {
        this.setThemeLight();
    }
}

  public async confirmDialog(config: ConfirmDialogData): Promise<ConfirmDialogResult> {
    const dialogRef = this.dialog.open(DialogConfirmComponent, {
      minWidth: 350,
      maxWidth: 550,
      data: config
    });
    let result: ConfirmDialogResult =  await dialogRef.afterClosed().toPromise();
    if (result === undefined) {
      result = {
        confirm: false,
        noBother: false
      };
    }
    return result;
  }

  private defaultProfileInfos = new Map<string, IProfileTextMappings>();

  public fillDefaultProfileTexts(profile: ITccProfile) {

    this.defaultProfileInfos.set(DefaultProfileIDs.Quiet, {
        name: $localize `:@@profileNameQuiet:Quiet`,
        description: $localize `:@@profileDescQuiet:Low performance for light office tasks for very quiet fans and low power consumption.`
    });

    this.defaultProfileInfos.set(DefaultProfileIDs.Office, {
        name: $localize `:@@profileNameOffice:Office and Multimedia`,
        description: $localize `:@@profileDescOffice:Mid-tier performance for more demanding office tasks or multimedia usage and quiet fans.`
    });

    this.defaultProfileInfos.set(DefaultProfileIDs.HighPerformance, {
        name: $localize `:@@profileNameHighPerformance:High Performance`,
        description: $localize `:@@profileDescHighPerformance:High performance for gaming and demanding computing tasks at the cost of moderate to high fan noise and higher temperatures.`
    });

    this.defaultProfileInfos.set(DefaultProfileIDs.MaxEnergySave, {
        name: $localize `:@@profileNamePowersaveExtreme:Powersave extreme`,
        description: $localize `:@@profileDescPowersaveExtreme:Lowest possible power consumption and silent fans at the cost of extremely low performance.`
    });

    // Old profiles
    this.defaultProfileInfos.set(LegacyDefaultProfileIDs.Default, {
        name: $localize `:@@profileNameLegacyDefault:Default`,
        description: $localize `:@@profileDescLegacyDefault:Full performance at the expense of more noise and high temperatures.`
    });

    this.defaultProfileInfos.set(LegacyDefaultProfileIDs.CoolAndBreezy, {
        name: $localize `:@@profileNameLegacyCoolAndBreezy:Cool and breezy`,
        description: $localize `:@@profileDescLegacyCoolAndBreezy:Reduced power in favor of low temperatures and quiet fan noise.`
    });

    this.defaultProfileInfos.set(LegacyDefaultProfileIDs.PowersaveExtreme, {
        name: $localize `:@@profileNameLegacyPowersaveExtreme:Powersave extreme`,
        description: $localize `:@@profileDescLegacyPowersaveExtreme:Heavily reduced performance in favor of lowest possible power consumption and silent cooling.`
    });

    const defaultProfileInfo = this.defaultProfileInfos.get(profile.id);
    if (defaultProfileInfo !== undefined) {
        profile.name = defaultProfileInfo.name;
        profile.description = defaultProfileInfo.description;
    }
  }

  public getDefaultProfileName(profileId: string): string {
    const info = this.defaultProfileInfos.get(profileId);
    if (info !== undefined) {
        return info.name;
    } else {
        return undefined;
    }
  }

  public getDefaultProfileDescription(profileId: string): string {
    const info = this.defaultProfileInfos.get(profileId);
    if (info !== undefined) {
        return info.description;
    } else {
        return undefined;
    }
  }
}
