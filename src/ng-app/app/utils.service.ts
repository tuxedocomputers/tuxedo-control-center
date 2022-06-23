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
import { Injectable, HostBinding, Inject, LOCALE_ID } from '@angular/core';
import { SysFsService } from './sys-fs.service';
import { ITccProfile, defaultCustomProfile } from '../../common/models/TccProfile';
import { ElectronService } from 'ngx-electron';
import { DecimalPipe } from '@angular/common';
import * as https from 'https';
import * as fs from 'fs';
import * as path from 'path';

import { OverlayContainer } from '@angular/cdk/overlay';
import { AppComponent } from './app.component';
import { BehaviorSubject } from 'rxjs';
import { ConfirmDialogData, ConfirmDialogResult, DialogConfirmComponent } from './dialog-confirm/dialog-confirm.component';
import { MatDialog } from '@angular/material/dialog';

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

      if (localStorage.getItem('themeClass')) {
        this.themeClass = new BehaviorSubject<string>(localStorage.getItem('themeClass'));
      } else {
        this.themeClass = new BehaviorSubject<string>('light-theme');
      }
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

  public setThemeClass(className: string) {
    this.overlayContainer.getContainerElement().classList.add(className);
    this.themeClass.next(className);
    localStorage.setItem('themeClass', className);
  }

  public setThemeLight() {
    this.setThemeClass('light-theme');
  }

  public setThemeDark() {
    this.setThemeClass('dark-theme');
  }

  public async confirmDialog(config: ConfirmDialogData): Promise<ConfirmDialogResult> {
    const dialogRef = this.dialog.open(DialogConfirmComponent, {
      minWidth: 350,
      maxWidth: 450,
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
}
