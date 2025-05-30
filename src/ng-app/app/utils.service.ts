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

import { Injectable, Inject, LOCALE_ID } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { OverlayContainer } from '@angular/cdk/overlay';
import { BehaviorSubject } from 'rxjs';
import { ConfirmDialogData, ConfirmDialogResult, DialogConfirmComponent } from './dialog-confirm/dialog-confirm.component';
import { ChoiceDialogData, ConfirmChoiceResult, DialogChoiceComponent, WaitingDialogData } from './dialog-choice/dialog-choice.component';

import { MatDialog, MatDialogConfig, MatDialogRef } from '@angular/material/dialog';
import { ITccProfile } from '../../common/models/TccProfile';
import { DefaultProfileIDs, IProfileTextMappings, LegacyDefaultProfileIDs } from '../../common/models/DefaultProfiles';
import { DialogInputTextComponent } from './dialog-input-text/dialog-input-text.component';
import { DialogWaitingComponent } from './dialog-waiting/dialog-waiting.component';
import * as fs from 'fs';
import { OpenDialogReturnValue, SaveDialogReturnValue } from 'electron';
import { BrightnessModeString } from 'src/e-app/backendAPIs/brightnessAPI';

@Injectable({
  providedIn: 'root'
})
export class UtilsService {

  private blurNoInput: boolean = false;
  public get pageDisabled(): boolean { return this.blurNoInput; }
  public set pageDisabled(value: boolean) { this.blurNoInput = value; }

  private languagesMenuArray: { id: string, label: string, img: string }[] = [
    { id: 'en', label: 'English', img: 'english.svg' },
    { id: 'de', label: 'Deutsch', img: 'german.svg' }
  ];
  private languageMap: Map<string, {
        id: string;
        label: string;
        img: string;
    }>

  public themeClass: BehaviorSubject<string>;

  private localeId: string;

  constructor(
    private decimalPipe: DecimalPipe,
    public overlayContainer: OverlayContainer,
    public dialog: MatDialog,
    @Inject(LOCALE_ID) localeId: string) {
      this.localeId = localeId;
      this.languageMap = new Map()
      for (const lang of this.getLanguagesMenuArray()) {
        this.languageMap[lang.id] = lang;
      }

      this.themeClass = new BehaviorSubject(undefined);
    }

  public getFahrenheitFromCelsius(temp: number): number {
    return ((temp * 1.8) + 32);
  }


  // get Path, e.g. home path  https://www.electronjs.org/docs/latest/api/app#appgetpathname
  // logic moved to main.ts
  public async getPath(path: string): Promise<string>
  {
    return window.ipc.getPath(path);
  }

  public async openFileDialog(properties: Electron.OpenDialogOptions): Promise<string[]> {
    return new Promise<string[]>((resolve: (value: string[] | PromiseLike<string[]>) => void, reject: (reason?: unknown) => void): void => {
    window.ipc.openFileDialog(properties).then((result: OpenDialogReturnValue): void => {
      if (result.canceled) {
          console.log("utils: openFileDialog canceled")
          resolve([]);
        } else {
          resolve(result.filePaths);
        }
      });
    });
  }
  
  public async saveFileDialog(properties: Electron.OpenDialogOptions): Promise<string> {
    return new Promise<string>((resolve: (value: string | PromiseLike<string>) => void, reject: (reason?: unknown) => void): void => {
      window.ipc.saveFileDialog(properties).then((result: SaveDialogReturnValue): void => {
        if (result.canceled) {
          console.log("utils: saveFileDialog canceled")
          resolve("");
        } else {
          resolve(result.filePath);
        }
      });
    });
  }

  public async openExternal(url: string): Promise<void>
  {
    window.ipc.openExternal(url);
  }

public async writeTextFile(filePath: string, fileData: string | Buffer, writeFileOptions?: fs.WriteFileOptions): Promise<void> {
    return window.fs.writeTextFile(filePath,fileData,writeFileOptions);
}

  public async readTextFile(filePath: string): Promise<string> {
    return window.fs.readTextFile(filePath);
  }

  public formatCpuFrequency(frequency: number): string {
    return this.decimalPipe.transform(frequency / 1000000, '1.1-1');
  }

  public formatGpuFrequency(frequency: number): string {
    return this.decimalPipe.transform(frequency / 1000, '1.1-1');
  }

  public quit(): void
  {
    window.ipc.closeApp();
  }

  public closeWindow(): void
  {
    window.ipc.closeWindow();
  }

  public minimizeWindow(): void
  {
    window.ipc.minimizeWindow();
  }

   public changeLanguage(languageId: string): void {
    window.ipc.triggerLanguageChange(languageId);
  }

  public getCurrentLanguageId(): string {
    return this.localeId;
  }

  public getLanguageData(langId: string): string {
    return this.languageMap[langId];
  }

  public getLanguagesMenuArray(): { id: string, label: string, img: string }[] {
    return this.languagesMenuArray;
  }

  public getThemeClass(): string {
    return this.themeClass.value;
  }
  
  public getTextColor(): string {
    return getComputedStyle(
        document.documentElement
    ).getPropertyValue("--text-color");
  }

  // TODO make brightness mode into an enum and export it from somewhere else, e.g. render.d.ts
  public async setBrightnessMode(mode: BrightnessModeString): Promise<void> {
    return await window.ipc.setBrightnessMode(mode);
  }

  public async getBrightnessMode(): Promise<BrightnessModeString> {
    return await window.ipc.getBrightnessMode();
  }

  public async getShouldUseDarkColors(): Promise<boolean> {
    return window.ipc.getShouldUseDarkColors();
  }

  /**
   * Note: Only for updating web part, to change behaviour use setBrightnessMode
   */
  public setThemeClass(className: string): void {
    if (className === "light-theme") {
        this.overlayContainer.getContainerElement().classList.remove("dark-theme");
    }
    if (className === "dark-theme") {
        this.overlayContainer.getContainerElement().classList.remove("light-theme");
    }
    this.overlayContainer.getContainerElement().classList.add(className);
    this.themeClass.next(className);
  }

  public setThemeLight(): void {
    this.setThemeClass('light-theme');
  }

  public setThemeDark(): void {
    this.setThemeClass('dark-theme');
  }

  public async updateBrightnessMode(): Promise<void> {
    if (await this.getShouldUseDarkColors()) {
        this.setThemeDark();
    } else {
        this.setThemeLight();
    }
}

  public async confirmDialog(config: ConfirmDialogData): Promise<ConfirmDialogResult> {
    const dialogRef: MatDialogRef<DialogConfirmComponent, ConfirmDialogResult> = this.dialog.open(DialogConfirmComponent, {
      minWidth: 350,
      maxWidth: 600,
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
    const dialogRef: MatDialogRef<DialogChoiceComponent, ConfirmChoiceResult> = this.dialog.open(DialogChoiceComponent, {
      minWidth: 350,
      maxWidth: 600,
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

  // todo: using boolean instead of Boolean
  public async waitingDialog(
    config: WaitingDialogData,
    pkexecSetPrimeSelectAsync: Promise<Boolean>
  ): Promise<Boolean> {
    const dialogRef: MatDialogRef<DialogWaitingComponent, Boolean> = this.dialog.open(DialogWaitingComponent, {
      minWidth: 350,
      maxWidth: 600,
      data: config,
      autoFocus: false,
      disableClose: true,
    });
    const status: Boolean = await pkexecSetPrimeSelectAsync;
    dialogRef.close();
    return status;
  }

  public async inputTextDialog(config: any): Promise<string> {
    const dialogRef: MatDialogRef<DialogInputTextComponent, string> = this.dialog.open(DialogInputTextComponent, {
      minWidth: 350,
      data: config,
    });
    return dialogRef.afterClosed().toPromise();
  }

  private defaultProfileInfos: Map<string, IProfileTextMappings> = new Map<string, IProfileTextMappings>();

  public fillDefaultProfileTexts(profile: ITccProfile): void {

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

    const defaultProfileInfo: IProfileTextMappings = this.defaultProfileInfos.get(profile.id);
    if (defaultProfileInfo !== undefined) {
        profile.name = defaultProfileInfo.name;
        profile.description = defaultProfileInfo.description;
    }
  }

  public getDefaultProfileName(profileId: string): string {
    const info: IProfileTextMappings = this.defaultProfileInfos.get(profileId);
    if (info !== undefined) {
        return info.name;
    } else {
        return undefined;
    }
  }

  public getDefaultProfileDescription(profileId: string): string {
    const info: IProfileTextMappings = this.defaultProfileInfos.get(profileId);
    if (info !== undefined) {
        return info.description;
    } else {
        return undefined;
    }
  }
}
