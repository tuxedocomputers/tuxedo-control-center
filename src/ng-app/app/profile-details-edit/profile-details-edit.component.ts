import { Component, OnInit, Input, OnDestroy, ViewChild } from '@angular/core';
import { ITccProfile, TccProfile } from '../../../common/models/TccProfile';
import { UtilsService } from '../utils.service';
import { ITccSettings } from '../../../common/models/TccSettings';
import { ConfigService } from '../config.service';
import { StateService, IStateInfo } from '../state.service';
import { SysFsService, IGeneralCPUInfo } from '../sys-fs.service';
import { Subscription } from 'rxjs';
import { FormGroup, FormBuilder, Validators, FormControl, ValidatorFn, AbstractControl } from '@angular/forms';
import { DBusService } from '../dbus.service';
import { MatInput } from '@angular/material/input';

function minControlValidator(comparisonControl: AbstractControl): ValidatorFn {
  return (thisControl: AbstractControl): {[key: string]: any} | null => {
    let errors = null;
    if (thisControl.value < comparisonControl.value) {
      errors = { min: comparisonControl.value, actual: thisControl.value };
    }
    return errors;
  };
}

function maxControlValidator(comparisonControl: AbstractControl): ValidatorFn {
  return (thisControl: AbstractControl): {[key: string]: any} | null => {
    let errors = null;
    if (thisControl.value > comparisonControl.value) {
      errors = { max: comparisonControl.value, actual: thisControl.value };
    }
    return errors;
  };
}

@Component({
  selector: 'app-profile-details-edit',
  templateUrl: './profile-details-edit.component.html',
  styleUrls: ['./profile-details-edit.component.scss']
})
export class ProfileDetailsEditComponent implements OnInit, OnDestroy {

  public viewProfile: ITccProfile;

  @Input()
  set profile(profile: ITccProfile) {
    this.viewProfile = profile;

    if (profile === undefined) { return; }

    // Create form group from profile
    if (this.profileFormGroup === undefined) {
      this.profileFormGroup = this.createProfileFormGroup(profile);
    } else {
      this.profileFormGroup.reset(profile);
    }

    if (this.selectStateControl === undefined) {
      this.selectStateControl = new FormControl(this.state.getProfileStates(this.viewProfile.name));
    } else {
      this.selectStateControl.reset(this.state.getProfileStates(this.viewProfile.name));
    }

    this.editProfile = (this.config.getCustomProfileByName(profile.name) !== undefined);
  }

  @Input()
  get profileDirty(): boolean { return this.profileFormGroup.dirty || this.selectStateControl.dirty; }

  public gridParams = {
    cols: 9,
    headerSpan: 4,
    valueSpan: 2,
    inputSpan: 3
  };

  public selectStateControl: FormControl;
  public profileFormGroup: FormGroup;
  public profileFormProgress = false;

  private subscriptions: Subscription = new Subscription();
  public cpuInfo: IGeneralCPUInfo;
  public editProfile: boolean;

  public stateInputArray: IStateInfo[];

  @ViewChild('inputName', { static: false }) inputName: MatInput;

  constructor(
    private utils: UtilsService,
    private config: ConfigService,
    private state: StateService,
    private sysfs: SysFsService,
    private fb: FormBuilder,
    private dbus: DBusService
  ) { }

  ngOnInit() {
    if (this.viewProfile === undefined) { return; }
    this.subscriptions.add(this.sysfs.generalCpuInfo.subscribe(generalCpuInfo => { this.cpuInfo = generalCpuInfo; }));

    this.stateInputArray = this.state.getStateInputs();
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
    this.utils.pageDisabled = true;

    if (this.profileFormGroup.valid) {
      const formProfileData: ITccProfile = this.profileFormGroup.value;
      const newProfileStateAssignments: string[] = this.selectStateControl.value;
      this.config.writeProfile(this.viewProfile.name, formProfileData, newProfileStateAssignments).then(success => {
        if (success) {
          this.profileFormGroup.markAsPristine();
          this.selectStateControl.markAsPristine();
          this.viewProfile = formProfileData;
        }
        this.profileFormProgress = false;
        this.utils.pageDisabled = false;
      });
    } else {
      this.profileFormProgress = false;
      this.utils.pageDisabled = false;
    }
  }

  public discardFormInput() {
    this.profileFormGroup.reset(this.viewProfile);
    this.selectStateControl.reset(this.state.getProfileStates(this.viewProfile.name));
    // Also restore brightness to active profile if applicable
    if (!this.dbus.displayBrightnessNotSupported) {
      const activeProfile = this.state.getActiveProfile();
      if (activeProfile.display.useBrightness) {
        this.dbus.setDisplayBrightness(activeProfile.display.brightness);
      }
    }
  }

  private createProfileFormGroup(profile: ITccProfile) {
    const displayGroup: FormGroup = this.fb.group(profile.display);
    const cpuGroup: FormGroup = this.fb.group(profile.cpu);
    cpuGroup.controls.scalingMinFrequency.setValidators([ maxControlValidator(cpuGroup.controls.scalingMaxFrequency) ]);
    cpuGroup.controls.scalingMaxFrequency.setValidators([ minControlValidator(cpuGroup.controls.scalingMinFrequency) ]);
    const fg = this.fb.group({
      name: profile.name,
      display: displayGroup,
      cpu: cpuGroup
    });

    fg.controls.name.setValidators([ Validators.required, Validators.minLength(1), Validators.maxLength(50) ]);

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
