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
import { UtilsService } from './utils.service';

@Injectable({
  providedIn: 'root'
})
export class ProgramManagementService {

  public isInProgress: Map<string, boolean>;
  public isCheckingInstallation: Map<string, boolean>;

  constructor(private utils: UtilsService) {
    this.isInProgress = new Map();
    this.isCheckingInstallation = new Map();
  }

  public async isInstalled(name: string): Promise<boolean> {
    this.isCheckingInstallation.set(name, true);
    return new Promise<boolean>(async (resolve) => {
      this.utils.execCmdAsync('which ' + name).then((result) => {
        this.isCheckingInstallation.set(name, false);
        resolve(true);
      }).catch(() => {
        this.isCheckingInstallation.set(name, false);
        resolve(false);
      });
    });
  }

  public async install(name: string): Promise<boolean> {
    this.isInProgress.set(name, true);
    return new Promise<boolean>(async (resolve) => {
      this.utils.execCmdAsync('pkexec apt install -y ' + name).then(() => {
        this.isInProgress.set(name, false);
        resolve(true);
      }).catch(() => {
        this.isInProgress.set(name, false);
        resolve(false);
      });
    });
  }

  public async remove(name: string): Promise<boolean> {
    this.isInProgress.set(name, true);
    return new Promise<boolean>(async (resolve) => {
      this.utils.execCmdAsync('pkexec apt remove -y ' + name).then(() => {
        this.isInProgress.set(name, false);
        resolve(true);
      }).catch(() => {
        this.isInProgress.set(name, false);
        resolve(false);
      });
    });
  }

  public run(name: string): void {
    this.utils.spawnExternal(name);
  }
}
