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
      this.utils.execCmd('which ' + name).then((result) => {
        resolve(true);
        this.isCheckingInstallation.set(name, false);
      }).catch(() => {
        this.isCheckingInstallation.set(name, false);
        resolve(false);
      });
    });
  }

  public async install(name: string): Promise<boolean> {
    this.isInProgress.set(name, true);
    return new Promise<boolean>(async (resolve) => {
      this.utils.execCmd('pkexec apt install -y ' + name).then(() => {
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
      this.utils.execCmd('pkexec apt remove -y ' + name).then(() => {
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
