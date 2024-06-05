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

  
  public anydeskInstalled: boolean;
  public webFAICreatorInstalled: boolean;
  public formTicketNumber: FormGroup;
  public systeminfoRunOutput = '';
  public systeminfoRunProgress = false;
  public systeminfosCompleted = false;
  public anydeskProgramName = 'anydesk';
  public webFAICreatorProgramName = 'tuxedo-webfai-creator';
  // TODO how can we buffer this value better without using sync calls that will likely blockade everything?
  private installProgress: Map<string, boolean>;
  private isCheckingInstallation: Map<string, boolean>;

  constructor(
    private utils: UtilsService
  ) { }

  ngOnInit() {
    this.updateAnydeskInstallStatus();
    this.updateWebFAICreatorInstallStatus();
    this.updateProgressStatus();
    this.formTicketNumber = new FormGroup({
      inputTicketNumber: new FormControl('', [Validators.required, Validators.pattern('^(99)([0-9]){7}')])
    });
    // TODO register callback for onUpdateSysteminfoLabel and update label accordingly
    window.ipc.onUpdateSysteminfoLabel(async (event, text) => {
        this.systeminfoOutput(text);
    }); 
  }

  public focusControl(control): void {
    setTimeout(() => { control.focus(); }, 0);
  }

  public openExternalUrl(url: string): void {
    this.utils.openExternal(url);
  }

  public async updateAnydeskInstallStatus(): Promise<void> { 
        this.anydeskInstalled = await window.pgms.anydeskIsInstalled();
        this.isCheckingInstallation.set(this.anydeskProgramName, false);
  }

  public async updateWebFAICreatorInstallStatus(): Promise<void> {
    this.webFAICreatorInstalled = await window.pgms.webfaiCreatorIsInstalled();
    this.isCheckingInstallation.set(this.webFAICreatorProgramName, false);
  }

  public buttonInstallRemoveAnydesk(): void {
    this.installProgress.set(this.anydeskProgramName,true);
    this.isCheckingInstallation.set(this.anydeskProgramName,true);
    if (this.anydeskInstalled) {
      window.pgms.uninstallAnydesk().then(() => {
        this.updateAnydeskInstallStatus();
        this.updateProgressStatus();
      });
    } else {
      window.pgms.installAnydesk().then(() => {
        this.updateAnydeskInstallStatus();
        this.updateProgressStatus();
      });
    }
    this.updateProgressStatus();
    setTimeout(() => { this.updateProgressStatus() },500);
    setTimeout(() => { this.updateProgressStatus() },1000);
  }

  public buttonInstallRemoveWebFAICreator(): void {
    this.installProgress.set(this.webFAICreatorProgramName,true);
    this.isCheckingInstallation.set(this.webFAICreatorProgramName,true);
    if (this.webFAICreatorInstalled) {
      window.pgms.uninstallWebfaicreator().then(() => {
        this.updateWebFAICreatorInstallStatus();
        this.updateProgressStatus();
      });
    } else {
        window.pgms.installWebfaicreator().then(() => {
        this.updateWebFAICreatorInstallStatus();
        this.updateProgressStatus();
      });
    }
    this.updateProgressStatus();
    setTimeout(() => { this.updateProgressStatus() },500);
    setTimeout(() => { this.updateProgressStatus() },1000);
  }

  public buttonStartAnydesk(): void {
    window.pgms.startAnydesk();
  }

  public buttonStartWebFAICreator(): void {
    window.pgms.startWebfaicreator();
  }

  public progress(): Map<string, boolean> {
    return this.installProgress;
  }

  public progressCheck(): Map<string, boolean> {
    return this.isCheckingInstallation;
  }

  private async updateProgressStatus() {
    this.installProgress = await window.pgms.isInProgress();
    this.isCheckingInstallation = await window.pgms.isCheckingInstallation();
  }


  public buttonStartSysteminfo(systeminfoStepper: MatStepper): void {
    this.systeminfoRunProgress = true;
    this.utils.pageDisabled = true;
    window.ipc.runSysteminfo(this.formTicketNumber.controls.inputTicketNumber.value).then(() => {
      this.systeminfoOutput('Done');
      this.systeminfosCompleted = true;
      systeminfoStepper.selected.completed = true;
      systeminfoStepper.next();
    }).catch(err => {
      this.systeminfoRunOutput = err;
    }).finally(() => {
      this.systeminfoRunProgress = false;
      this.utils.pageDisabled = false;
    });
  }

  public systeminfoOutput(text: string): void {
    this.systeminfoRunOutput = text;
  }
}


