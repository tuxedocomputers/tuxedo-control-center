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

import * as child_process from "node:child_process";
import { execCmd } from "./utilsAPI";
import { dialog } from "electron";

export class ProgramManagementService {

    public isInProgress: Map<string, boolean>;
    public isCheckingInstallation: Map<string, boolean>;

    constructor() {
      this.isInProgress = new Map();
      this.isCheckingInstallation = new Map();
    }

    public async isInstalled(name: string): Promise<boolean> {
        this.isCheckingInstallation.set(name, true);
          return new Promise<boolean>(async (resolve: (value: boolean | PromiseLike<boolean>) => void, reject: (reason?: unknown) => void): Promise<void> => {
          // using || to return a success code to avoid throwing an error when nothing was found with "which" and : means no-op
          await execCmd(`which ${name} || :`).then((result: string): void => {
            this.isCheckingInstallation.set(name, false);
            if (result.trim()) {
              resolve(true);
            }
            resolve(false)
          }).catch((err: unknown): void => {
            console.error("pgmsService: isInstalled failed =>", err)
            this.isCheckingInstallation.set(name, false);
            resolve(false);
          });
        });
      }

    public async install(name: string): Promise<boolean> {
      this.isInProgress.set(name, true);
        return new Promise<boolean>(async (resolve: (value: boolean | PromiseLike<boolean>) => void, reject: (reason?: unknown) => void): Promise<void> => {
        await execCmd('pkexec apt install -y ' + name).then((): void  => {
          this.isInProgress.set(name, false);
          resolve(true);
        }).catch((err: unknown): void => {
          console.error("pgmsService: install failed =>", err)
          this.isInProgress.set(name, false);
          resolve(false);
        });
      });
    }

    public async remove(name: string): Promise<boolean> {
      this.isInProgress.set(name, true);
        return new Promise<boolean>(async (resolve: (value: boolean | PromiseLike<boolean>) => void, reject: (reason?: unknown) => void): Promise<void> => {
        await execCmd('pkexec apt remove -y ' + name).then((): void => {
          this.isInProgress.set(name, false);
          resolve(true);
        }).catch((err: unknown): void => {
          console.error("pgmsService: remove failed =>", err)
          this.isInProgress.set(name, false);
          resolve(false);
        });
      });
    }

    public run(name: string): void {
        child_process.spawn(name, { detached: true, stdio: 'ignore' }).on('error', (err: Error): void => {
            console.log("\"" + name + "\" could not be executed.")
            dialog.showMessageBox({ title: "Notice", buttons: ["OK"], message: "\"" + name + "\" could not be executed." })
        });
    }
  }


