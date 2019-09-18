import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';

import { SysFsService, ILogicalCoreInfo, IGeneralCPUInfo } from '../sys-fs.service';
import { DecimalPipe } from '@angular/common';
import { ITccProfile } from '../../../common/models/TccProfile';
import { ConfigService } from '../config.service';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { ElectronService } from 'ngx-electron';

@Component({
  selector: 'app-cpu-settings',
  templateUrl: './cpu-settings.component.html',
  styleUrls: ['./cpu-settings.component.scss']
})
export class CpuSettingsComponent implements OnInit, OnDestroy {

  public cpuCoreInfo: ILogicalCoreInfo[];
  public cpuInfo: IGeneralCPUInfo;

  private updateInterval: NodeJS.Timeout;

  public activeCores: number;
  public activeScalingMinFreqs: string[];
  public activeScalingMaxFreqs: string[];
  public activeScalingDrivers: string[];
  public activeScalingGovernors: string[];
  public activeEnergyPerformancePreference: string[];

  public showDefaultProfiles: boolean;
  public selectedCustomProfile: string;
  public showActiveProfile = true;

  public activeProfile: ITccProfile;

  public formProfileEdit: FormGroup;

  constructor(
    private sysfs: SysFsService,
    private decimalPipe: DecimalPipe,
    private config: ConfigService,
    private electron: ElectronService) {
  }

  private subscriptions: Subscription = new Subscription();

  ngOnInit() {
    this.updateFrequencyData();

    this.formProfileEdit = new FormGroup({
      inputNumberCores: new FormControl('', [ Validators.required, Validators.min(1), Validators.max(this.cpuInfo.availableCores)]),
      inputMinFreq: new FormControl(),
      inputMaxFreq: new FormControl(),
      inputScalingGovernor: new FormControl(),
      inputEnergyPerformancePreference: new FormControl()
    });

    this.formProfileEdit.controls.inputMinFreq.setValidators([ Validators.max(this.formProfileEdit.controls.inputMaxFreq.value) ]);
    this.formProfileEdit.controls.inputMaxFreq.setValidators([ Validators.min(this.formProfileEdit.controls.inputMinFreq.value) ]);

    this.updateInterval = setInterval(() => { this.periodicUpdate(); }, 2000);

    this.setCustomProfileEdit(this.config.getCurrentEditingProfile());
    this.subscriptions.add(this.config.observeEditingProfile.subscribe(editingProfile => { this.setCustomProfileEdit(editingProfile); }));
    this.activeProfile = this.config.getActiveProfile();
    this.subscriptions.add(this.config.observeSettings.subscribe(
      newSettings => {
        this.activeProfile = this.config.getProfileByName(newSettings.activeProfileName);
      }
    ));
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
  }

  public submitProfileEdit(): void {
    if (this.formProfileEdit.dirty) {
      const changedProfile = this.config.getCurrentEditingProfile();
      const controls = this.formProfileEdit.controls;
      if (this.formProfileEdit.valid && parseInt(controls.inputMinFreq.value, 10) < parseInt(controls.inputMaxFreq.value, 10)) {
        // Save profile
        changedProfile.cpu.onlineCores = Number.parseInt(controls.inputNumberCores.value, 10);
        changedProfile.cpu.scalingMinFrequency = Number.parseInt(controls.inputMinFreq.value, 10);
        changedProfile.cpu.scalingMaxFrequency = Number.parseInt(controls.inputMaxFreq.value, 10);
        changedProfile.cpu.governor = controls.inputScalingGovernor.value;
        changedProfile.cpu.energyPerformancePreference = controls.inputEnergyPerformancePreference.value;
        const profileWritten = this.config.writeCurrentEditingProfile();
        if (profileWritten) {
          this.formProfileEdit.markAsPristine();
          this.config.setCurrentEditingProfile(this.selectedCustomProfile);
        }
      } else {
        const choice = this.electron.remote.dialog.showMessageBox(
          this.electron.remote.getCurrentWindow(),
          {
            title: 'Invalid input',
            message: 'Make sure all values are in range',
            type: 'info',
            buttons: ['ok']
          }
        );
      }
    }
  }

  private periodicUpdate(): void {
    this.updateFrequencyData();
  }

  public getCustomProfiles(): ITccProfile[] {
    return this.config.getCustomProfiles();
  }

  public getAllProfiles(): ITccProfile[] {
    return this.config.getAllProfiles();
  }

  public getDefaultProfilesForTable(): ITccProfile[] {
    if (this.showDefaultProfiles) {
      return this.config.getDefaultProfiles().filter(e => e.name !== 'Default');
    } else {
      return [];
    }
  }

  private setCustomProfileEdit(profile: ITccProfile): void {
    if (profile === undefined) {
      this.selectedCustomProfile = undefined;
      return;
    }
    this.selectedCustomProfile = profile.name;
    this.formProfileEdit.markAsPristine();
    const formControls = this.formProfileEdit.controls;
    const currentProfileCpu = profile.cpu;

    if (currentProfileCpu.onlineCores === undefined) {
      formControls.inputNumberCores.setValue(this.cpuInfo.availableCores);
    } else {
      formControls.inputNumberCores.setValue(currentProfileCpu.onlineCores);
    }

    if (currentProfileCpu.scalingMinFrequency === undefined) {
      formControls.inputMinFreq.setValue(this.cpuCoreInfo[0].cpuInfoMinFreq);
    } else {
      formControls.inputMinFreq.setValue(currentProfileCpu.scalingMinFrequency);
    }

    if (currentProfileCpu.scalingMaxFrequency === undefined) {
      formControls.inputMaxFreq.setValue(this.cpuCoreInfo[0].cpuInfoMaxFreq);
    } else {
      formControls.inputMaxFreq.setValue(currentProfileCpu.scalingMaxFrequency);
    }

    formControls.inputScalingGovernor.setValue(currentProfileCpu.governor);
    formControls.inputEnergyPerformancePreference.setValue(currentProfileCpu.energyPerformancePreference);
  }

  public selectCustomProfileEdit(profileName: string): void {
    if (this.config.getCurrentEditingProfile() !== undefined && this.config.getCurrentEditingProfile().name === profileName) { return; }
    let choice = 0;
    if (this.formProfileEdit.dirty) {
      choice = this.electron.remote.dialog.showMessageBox(
        this.electron.remote.getCurrentWindow(),
        {
          title: 'Switching profile to edit',
          message: 'Discard changes?',
          type: 'question',
          buttons: [ 'Discard', 'Cancel' ]
        }
      );
    }
    if (choice === 0 && this.config.setCurrentEditingProfile(profileName)) {
      // this.setCustomProfileEdit(this.config.getCurrentEditingProfile());
    } else {
      setImmediate(() => {
        if (!this.currentlyEditingProfile()) {
          this.selectedCustomProfile = undefined;
        } else {
          this.selectedCustomProfile = this.config.getCurrentEditingProfile().name;
        }
      });
    }
  }

  public discardProfileEdit(): void {
    this.setCustomProfileEdit(this.config.getProfileByName(this.config.getCurrentEditingProfile().name));
    setImmediate(() => {
      this.formProfileEdit.markAsPristine();
    });
  }

  public currentlyEditingProfile(): boolean {
    return this.config.getCurrentEditingProfile() !== undefined;
  }

  public updateFrequencyData(): void {
    this.cpuCoreInfo = this.sysfs.getLogicalCoreInfo();
    this.cpuInfo = this.sysfs.getGeneralCpuInfo();

    this.activeCores = 0;
    this.activeScalingMinFreqs = [];
    this.activeScalingMaxFreqs = [];
    this.activeScalingDrivers = [];
    this.activeScalingGovernors = [];
    this.activeEnergyPerformancePreference = [];
    for (const core of this.cpuCoreInfo) {
      if (core.scalingMinFreq !== undefined && !this.activeScalingMinFreqs.includes(this.formatFrequency(core.scalingMinFreq))) {
        this.activeScalingMinFreqs.push(this.formatFrequency(core.scalingMinFreq));
      }
      if (core.scalingMaxFreq !== undefined && !this.activeScalingMaxFreqs.includes(this.formatFrequency(core.scalingMaxFreq))) {
        this.activeScalingMaxFreqs.push(this.formatFrequency(core.scalingMaxFreq));
      }
      if (core.scalingGovernor !== undefined && !this.activeScalingGovernors.includes(core.scalingGovernor)) {
        this.activeScalingGovernors.push(core.scalingGovernor);
      }
      if (core.energyPerformancePreference !== undefined
        && !this.activeEnergyPerformancePreference.includes(core.energyPerformancePreference)) {
        this.activeEnergyPerformancePreference.push(core.energyPerformancePreference);
      }
      if (core.scalingDriver !== undefined && !this.activeScalingDrivers.includes(core.scalingDriver)) {
        this.activeScalingDrivers.push(core.scalingDriver);
      }
    }
  }

  public formatFrequency(frequency: number): string {
    return this.decimalPipe.transform(frequency / 1000000, '1.2-2');
  }

  public getEditProfile(): ITccProfile {
    return this.config.getCurrentEditingProfile();
  }
}
