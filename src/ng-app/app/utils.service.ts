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
import { ChoiceDialogData, ConfirmChoiceResult, DialogChoiceComponent, WaitingDialogData } from './dialog-choice/dialog-choice.component';

import { MatDialog } from '@angular/material/dialog';
import { ITccProfile } from '../../common/models/TccProfile';
import { DefaultProfileIDs, IProfileTextMappings, LegacyDefaultProfileIDs } from '../../common/models/DefaultProfiles';
import { DialogInputTextComponent } from './dialog-input-text/dialog-input-text.component';
import { DialogWaitingComponent } from './dialog-waiting/dialog-waiting.component';

@Injectable({
  providedIn: 'root'
})
export class UtilsService {

  private blurNoInput = false;
  get pageDisabled(): boolean { return this.blurNoInput; }
  set pageDisabled(value: boolean) { this.blurNoInput = value; }

  private languagesMenuArray = [
    { id: 'en', label: 'English', img: 'english.svg' },
    { id: 'de', label: 'Deutsch', img: 'german.svg' },
    { id: 'fr', label: 'Français', img: 'french.svg' }
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

    // if return status code is not zero, it will count as an error
    // and grep returning nothing will count as an error
    public execCmdSync(command: string): string {
        const data = this.electron.ipcRenderer.sendSync(
            "exec-cmd-sync",
            command
        );

        if (data.error) {
            console.error("Sync Exec CMD failed: ", data.error);
        }

        if (data.data) {
            return Buffer.from(data.data.buffer).toString();
        }
    }

  public async execCmdAsync(command: string): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      this.electron.ipcRenderer.invoke('exec-cmd-async', command).then((result) => {
        if (result.error === null) {
          resolve(result.data.toString());
        } else {
          reject(result.error.toString());
        }
      });
    });
  }

  public getFahrenheitFromCelsius(temp: number): number {
    return ((temp * 1.8) + 32);
  }

  // get Path, e.g. home path  https://www.electronjs.org/docs/latest/api/app#appgetpathname
  public async getPath(path: string): Promise<string>
  {
    return new Promise<string>((resolve, reject) => {
        this.electron.ipcRenderer.invoke('get-path', path).then((result) => {
          if (result) {
            resolve(result);
          } else {
            reject(result);
          }
        });
      });
  }

  // Opens a file dialog (systems file dialog) and returns selected path or false if canceled
  // for selecting existing files
  // needs to be modified if you need more than one file (and you need to give it the multiSelections flag https://www.electronjs.org/de/docs/latest/api/dialog)
  public async openFileDialog(properties): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
      this.electron.ipcRenderer.invoke('show-open-dialog', properties).then((result) => {
        if (result.canceled) {
            reject(result.canceled);
          } else {
            resolve(result.filePaths);
          }
      });
    });
  }


  // Opens a file dialog (systems file dialog) and returns selected path or false if canceled
  // for selecting a non existing file (saving)
  // does not save anything, just returns a path
  public async saveFileDialog(properties): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
      this.electron.ipcRenderer.invoke('show-save-dialog', properties).then((result) => {
        if (result.canceled) {
          reject(result.canceled);
        } else {
          resolve(result.filePath);
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


  public async readTextFile(filePath: string, ): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      try {
        fs.readFile(filePath,(err, data) => {
          if (err) {
            reject(err);
          } else {
            resolve(data + "");
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

  public formatCpuFrequency(frequency: number): string {
    return this.decimalPipe.transform(frequency / 1000000, '1.1-1');
  }

  public formatGpuFrequency(frequency: number): string {
    return this.decimalPipe.transform(frequency / 1000, '1.1-1');
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
    if (className == "light-theme") {
        this.overlayContainer.getContainerElement().classList.remove("dark-theme");
    }
    if (className == "dark-theme") {
        this.overlayContainer.getContainerElement().classList.remove("light-theme");
    }
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

  public async choiceDialog(config: ChoiceDialogData, disableClose: boolean = false): Promise<ConfirmChoiceResult> {
    const dialogRef = this.dialog.open(DialogChoiceComponent, {
      minWidth: 350,
      maxWidth: 550,
      data: config,
      autoFocus: false,
      disableClose: disableClose
    });
    let result: ConfirmChoiceResult =  await dialogRef.afterClosed().toPromise();
    if (result === undefined) {
      result = {
        value: undefined,
        noBother: false
      };
    }
    return result;
  }

  public async waitingDialog(
    config: WaitingDialogData,
    pkexecSetPrimeSelectAsync: Promise<Boolean>
  ): Promise<Boolean> {
    const dialogRef = this.dialog.open(DialogWaitingComponent, {
      minWidth: 350,
      maxWidth: 550,
      data: config,
      autoFocus: false,
      disableClose: true,
    });
    const status = await pkexecSetPrimeSelectAsync;
    dialogRef.close();
    return status;
  }

  public async inputTextDialog(config: any) {
    const dialogRef = this.dialog.open(DialogInputTextComponent, {
      minWidth: 350,
      data: config,
    });
    return dialogRef.afterClosed().toPromise();
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
