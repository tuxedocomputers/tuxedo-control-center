import { Component, OnInit, Input, OnDestroy } from '@angular/core';
import { ITccProfile, TccProfile } from '../../../common/models/TccProfile';
import { UtilsService } from '../utils.service';
import { ITccSettings } from '../../../common/models/TccSettings';
import { ConfigService } from '../config.service';
import { StateService, IStateInfo } from '../state.service';
import { SysFsService, IGeneralCPUInfo } from '../sys-fs.service';
import { Subscription } from 'rxjs';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { DBusService } from '../dbus.service';

@Component({
  selector: 'app-profile-details-edit',
  templateUrl: './profile-details-edit.component.html',
  styleUrls: ['./profile-details-edit.component.scss']
})
export class ProfileDetailsEditComponent implements OnInit, OnDestroy {

  @Input() viewProfile: ITccProfile;

  public gridParams = {
    cols: 9,
    headerSpan: 4,
    valueSpan: 2,
    inputSpan: 3
  };

  public profileFormGroup: FormGroup;
  public profileFormProgress = false;

  private subscriptions: Subscription = new Subscription();
  public cpuInfo: IGeneralCPUInfo;
  public editProfile: ITccProfile;

  constructor(
    private utils: UtilsService,
    private config: ConfigService,
    private state: StateService,
    private sysfs: SysFsService,
    private fb: FormBuilder,
    private dbus: DBusService
  ) { }

  ngOnInit() {
    this.subscriptions.add(this.sysfs.generalCpuInfo.subscribe(generalCpuInfo => { this.cpuInfo = generalCpuInfo; }));
    this.subscriptions.add(this.config.editingProfile.subscribe(profile => {

      this.editProfile = profile;
      let p: ITccProfile;
      if (profile !== undefined) {
        p = profile;
      } else {
        // Not displayed dummy
        p = this.viewProfile;
      }

      // Create form group from profile
      this.profileFormGroup = this.createProfileFormGroup(p);
    }));
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  public getStateInputs(): IStateInfo[] {
    return this.state.getStateInputs();
  }

  public getSettings(): ITccSettings {
    return this.config.getSettings();
  }

  public submitFormInput() {
    this.profileFormProgress = true;

    if (this.profileFormGroup.valid) {
      const formProfileData: ITccProfile = this.profileFormGroup.value;
      this.config.writeProfile(formProfileData).then(success => {
        if (success) {
          this.profileFormGroup.markAsPristine();
        }
        this.profileFormProgress = false;
      });
    } else {
      this.profileFormProgress = false;
    }
  }

  public discardFormInput() {
    this.profileFormGroup.reset(this.editProfile);
  }

  private createProfileFormGroup(profile: ITccProfile) {
    const displayGroup: FormGroup = this.fb.group(profile.display);
    const cpuGroup: FormGroup = this.fb.group(profile.cpu);
    cpuGroup.controls.scalingMinFrequency.setValidators([ Validators.max(cpuGroup.controls.scalingMaxFrequency.value)]);
    cpuGroup.controls.scalingMaxFrequency.setValidators([ Validators.min(cpuGroup.controls.scalingMinFrequency.value)]);
    const fg = this.fb.group({
      name: profile.name,
      display: displayGroup,
      cpu: cpuGroup
    });

    return fg;
  }

  public sliderMinFreqChange() {
    const cpuGroup: FormGroup = this.profileFormGroup.controls.cpu as FormGroup;
    if (cpuGroup.controls.scalingMinFrequency.value > cpuGroup.controls.scalingMaxFrequency.value) {
      cpuGroup.controls.scalingMinFrequency.setValue(cpuGroup.controls.scalingMaxFrequency.value);
    }
  }

  public sliderMaxFreqChange() {
    const cpuGroup: FormGroup = this.profileFormGroup.controls.cpu as FormGroup;
    if (cpuGroup.controls.scalingMaxFrequency.value < cpuGroup.controls.scalingMinFrequency.value) {
      cpuGroup.controls.scalingMaxFrequency.setValue(cpuGroup.controls.scalingMinFrequency.value);
    }
  }

  public inputDisplayBrightnessChange(newValue: number) {
    if (!this.dbus.displayBrightnessNotSupported) {
      this.dbus.setDisplayBrightness(newValue);
    }
  }

  public formatFrequency(frequency: number): string {
    return this.utils.formatFrequency(frequency);
  }
}
