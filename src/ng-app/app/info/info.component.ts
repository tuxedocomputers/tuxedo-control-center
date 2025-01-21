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

import { Component, OnInit, VERSION } from '@angular/core';
import { UtilsService } from '../utils.service';
import { IProcessVersions } from '../renderer';

@Component({
  selector: 'app-info',
  templateUrl: './info.component.html',
  styleUrls: ['./info.component.scss'],
  standalone: false
})
export class InfoComponent implements OnInit {

  public appVersion: string;
  public nodeVersion: string;
  public electronVersion: string;
  public chromeVersion: string;
  public angularVersion: string;

  constructor(
    private utils: UtilsService
  ) { }

  ngOnInit(): void {
    this.init();
  }

  private async init(): Promise<void>
  {
    this.appVersion = await window.ipc.getAppVersion();
    let processVersions: IProcessVersions = await window.ipc.getProcessVersions();
    this.nodeVersion = processVersions.node;
    this.electronVersion = processVersions.electron;
    this.chromeVersion = processVersions.chrome;
    this.angularVersion = VERSION.full;
  }

  public changeLanguage(languageId: string): void {
    if (languageId !== this.getCurrentLanguageId()) {
      this.utils.changeLanguage(languageId);
    }
  }

  public getCurrentLanguageId(): string {
    return this.utils.getCurrentLanguageId();
  }

  public getLanguagesMenuArray(): { id: string; label: string; img: string }[] {
    return this.utils.getLanguagesMenuArray();
  }

  public getLanguageData(langId: string): string {
    return this.utils.getLanguageData(langId);
  }
}
