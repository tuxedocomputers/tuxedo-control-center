/*!
 * Copyright (c) 2019-2021 TUXEDO Computers GmbH <tux@tuxedocomputers.com>
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
import { Component, OnInit } from '@angular/core';
import { ElectronService } from 'ngx-electron';
import { ProgramManagementService } from '../program-management.service';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { UtilsService } from '../utils.service';
import { MatStepper } from '@angular/material/stepper';
import { STEPPER_GLOBAL_OPTIONS } from '@angular/cdk/stepper';

@Component({
  selector: 'app-support',
  templateUrl: './support.component.html',
  styleUrls: ['./support.component.scss'],
  providers: [
    {
      provide: STEPPER_GLOBAL_OPTIONS,
      useValue: { displayDefaultIndicatorType: false }
    }
  ]
})
export class SupportComponent implements OnInit {

  public anydeskProgramName = 'anydesk';
  public anydeskInstalled: boolean;
  public webFAICreatorProgramName = 'tuxedo-webfai-creator';
  public webFAICreatorInstalled: boolean;

  public formTicketNumber: FormGroup;
  public systeminfoRunOutput = '';
  public systeminfoRunProgress = false;
  public systeminfoFilePath = '/tmp/tcc/systeminfos.sh';
  public systeminfosURL = 'https://mytuxedo.de/index.php/s/DcAeZk4TbBTTjRq/download';
  public systeminfosCompleted = false;

  constructor(
    private electron: ElectronService,
    private program: ProgramManagementService,
    private utils: UtilsService
  ) { }

  ngOnInit() {
    this.updateAnydeskInstallStatus();
    this.updateWebFAICreatorInstallStatus();
    this.formTicketNumber = new FormGroup({
      inputTicketNumber: new FormControl('', [Validators.required, Validators.pattern('^(990)([0-9]){6}')])
    });
  }

  public focusControl(control): void {
    setImmediate(() => { control.focus(); });
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

  public updateWebFAICreatorInstallStatus(): void {
    if (!this.progress().get(this.webFAICreatorProgramName)) {
      this.program.isInstalled(this.webFAICreatorProgramName).then((isInstalled) => {
        this.webFAICreatorInstalled = isInstalled;
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

  public buttonInstallRemoveWebFAICreator(): void {
    if (this.webFAICreatorInstalled) {
      this.program.remove(this.webFAICreatorProgramName).then(() => {
        this.updateWebFAICreatorInstallStatus();
      });
    } else {
      this.program.install(this.webFAICreatorProgramName).then(() => {
        this.updateWebFAICreatorInstallStatus();
      });
    }
  }

  public buttonStartAnydesk(): void {
    this.program.run(this.anydeskProgramName);
  }

  public buttonStartWebFAICreator(): void {
    this.program.run(this.webFAICreatorProgramName);
  }

  public progress(): Map<string, boolean> {
    return this.program.isInProgress;
  }

  public progressCheck(): Map<string, boolean> {
    return this.program.isCheckingInstallation;
  }

  public buttonStartSysteminfo(systeminfoStepper: MatStepper): void {
    this.systeminfoRunProgress = true;
    this.runSysteminfo().then(() => {
      this.systeminfoOutput('Done');
      this.systeminfosCompleted = true;
      systeminfoStepper.selected.completed = true;
      systeminfoStepper.next();
    }).catch(err => {
      this.systeminfoRunOutput = err;
    }).finally(() => {
      this.systeminfoRunProgress = false;
    });
  }

  public async runSysteminfo(): Promise<void> {
    return new Promise<void>(async (resolve, reject) => {
      let fileData: string;
      // Download file
      try {
        this.systeminfoOutput('Fetching: ' + this.systeminfosURL);
        const data = await this.utils.httpsGet(this.systeminfosURL);
        fileData = data.toString();
      } catch (err) {
        reject('Download failed'); return;
      }

      // Write file
      try {
        this.systeminfoOutput('Writing file: ' + this.systeminfoFilePath);
        await this.utils.writeTextFile(this.systeminfoFilePath, fileData, { mode: 0o755 });
      } catch (err) {
        reject('Failed to write file ' + this.systeminfoFilePath); return;
      }

      // Run
      try {
        const ticketNumber: number = this.formTicketNumber.controls.inputTicketNumber.value;
        this.systeminfoOutput('Running systeminfos.sh');
        this.utils.pageDisabled = true;
        await this.utils.execCmd('pkexec env DISPLAY=$DISPLAY XAUTHORITY=$XAUTHORITY XDG_SESSION_TYPE=$XDG_SESSION_TYPE XDG_CURRENT_DESKTOP=$XDG_CURRENT_DESKTOP sh ' + this.systeminfoFilePath + ' ' + ticketNumber);
      } catch (err) {
        reject('Failed to execute script');
      } finally {
        this.utils.pageDisabled = false;
      }

      resolve();
    });
  }

  public systeminfoOutput(text: string): void {
    this.systeminfoRunOutput = text;
  }
}
