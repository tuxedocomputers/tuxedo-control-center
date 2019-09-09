import { Component, OnInit } from '@angular/core';
import { ElectronService } from 'ngx-electron';
import { ProgramManagementService } from '../program-management.service';

@Component({
  selector: 'app-support',
  templateUrl: './support.component.html',
  styleUrls: ['./support.component.scss']
})
export class SupportComponent implements OnInit {

  public anydeskProgramName = 'anydesk';
  public anydeskInstalled: boolean;

  constructor(
    private electron: ElectronService,
    private program: ProgramManagementService
  ) { }

  ngOnInit() {
    this.updateAnydeskInstallStatus();
  }

  public openExternalUrl(url: string): void {
    this.electron.shell.openExternal(url);
  }

  public updateAnydeskInstallStatus(): void {
    if (!this.progress().get(this.anydeskProgramName)) {
      this.program.isInstalled(this.anydeskProgramName).then((isInstalled) => {
        this.anydeskInstalled = isInstalled;
      });
    }
  }

  public buttonInstallRemoveAnydesk(): void {
    if (this.anydeskInstalled) {
      this.program.remove(this.anydeskProgramName).then(() => {
        this.updateAnydeskInstallStatus();
      });
    } else {
      this.program.install(this.anydeskProgramName).then(() => {
        this.updateAnydeskInstallStatus();
      });
    }
  }

  public buttonStartAnydesk(): void {
    this.program.run('anydesk');
  }

  public progress(): Map<string, boolean> {
    return this.program.isInProgress;
  }

  public progressCheck(): Map<string, boolean> {
    return this.program.isCheckingInstallation;
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
