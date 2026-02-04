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
import { Component, OnInit, inject } from '@angular/core';
import { ElectronService } from '../electron.service';
import { ProgramManagementService } from '../program-management.service';
import { UntypedFormGroup, UntypedFormControl, Validators } from '@angular/forms';
import { UtilsService } from '../utils.service';
import { MatStepper } from '@angular/material/stepper';
import { STEPPER_GLOBAL_OPTIONS } from '@angular/cdk/stepper';
import { SharedModule } from '../shared/shared.module';

@Component({
  standalone: true,
  imports: [SharedModule], 
    selector: 'app-support',
    templateUrl: './support.component.html',
    styleUrls: ['./support.component.scss'],
    providers: [
        {
            provide: STEPPER_GLOBAL_OPTIONS,
            useValue: { displayDefaultIndicatorType: false }
        }
    ],
    
})
export class SupportComponent implements OnInit {
  private electron = inject(ElectronService);
  private program = inject(ProgramManagementService);
  private utils = inject(UtilsService);

  public webFAICreatorProgramName = 'tuxedo-webfai-creator';
  public webFAICreatorInstalled: boolean;

  public formTicketNumber: UntypedFormGroup;
  public systeminfoRunOutput = '';
  public systeminfoRunProgress = false;
  public systeminfoFilePath = '/tmp/tcc/systeminfos.sh';
  public systeminfosURL = 'https://mytuxedo.de/public.php/dav/files/DcAeZk4TbBTTjRq/?accept=zip';
  public systeminfosCompleted = false;



  ngOnInit() {
    this.updateWebFAICreatorInstallStatus();
    this.formTicketNumber = new UntypedFormGroup({
      inputTicketNumber: new UntypedFormControl('', [Validators.required, Validators.pattern('^(99)([0-9]){7}')])
    });
  }

  public focusControl(control): void {
    setImmediate(() => { control.focus(); });
  }

  public openExternalUrl(url: string): void {
    this.electron.shell.openExternal(url);
  }

  public updateWebFAICreatorInstallStatus(): void {
    if (!this.progress().get(this.webFAICreatorProgramName)) {
      this.program.isInstalled(this.webFAICreatorProgramName).then((isInstalled) => {
        this.webFAICreatorInstalled = isInstalled;
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
        await this.utils.execCmdAsync('pkexec env DISPLAY=$DISPLAY XAUTHORITY=$XAUTHORITY XDG_SESSION_TYPE=$XDG_SESSION_TYPE XDG_CURRENT_DESKTOP=$XDG_CURRENT_DESKTOP sh ' + this.systeminfoFilePath + ' ' + ticketNumber);
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
