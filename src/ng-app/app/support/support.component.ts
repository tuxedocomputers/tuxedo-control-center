import { Component, OnInit } from '@angular/core';
import { ElectronService } from 'ngx-electron';
import { UtilsService } from '../utils.service';

@Component({
  selector: 'app-support',
  templateUrl: './support.component.html',
  styleUrls: ['./support.component.scss']
})
export class SupportComponent implements OnInit {

  constructor(
    private electron: ElectronService,
    private utils: UtilsService
  ) { }

  ngOnInit() {
  }

  public openExternalUrl(url: string): void {
    this.electron.shell.openExternal(url);
  }

  public async anydeskIsInstalled(): Promise<boolean> {
    return new Promise<boolean>(async (resolve) => {
      this.utils.execCmd('which anydesk').then(() => {
        resolve(true);
      }).catch(() => {
        resolve(false);
      });
    });
  }

  public async installAnydesk(): Promise<boolean> {
    return new Promise<boolean>(async (resolve) => {
      try {
        if (!(await this.anydeskIsInstalled())) {
          await this.utils.execCmd('pkexec apt install anydesk -y');
          resolve(true);
        } else {
          resolve(false);
        }
      } catch (err) {
        resolve(false);
      }
    });
  }

  public async removeAnydesk(): Promise<boolean> {
    return new Promise<boolean>(async (resolve) => {
      try {
        if (await this.anydeskIsInstalled()) {
          await this.utils.execCmd('pkexec apt remove anydesk -y');
          resolve(true);
        } else {
          resolve(false);
        }
      } catch (err) {
        resolve(false);
      }
    });
  }

  public async runSysteminfo(): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      // Check that a ticketnumber exists
      // Download systeminfo.sh from 'https://mytuxedo.de/index.php/s/DcAeZk4TbBTTjRq/download'
      // Chmod file +x
      // Run with pkexec
      // Check result?
    });
  }
}
