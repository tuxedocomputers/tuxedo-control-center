import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { DBusService } from '../dbus.service';
import { Subscription } from 'rxjs';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { ITccProfile } from '../../../common/models/TccProfile';
import { ConfigService } from '../config.service';
import { ElectronService } from 'ngx-electron';

@Component({
  selector: 'app-display-settings',
  templateUrl: './display-settings.component.html',
  styleUrls: ['./display-settings.component.scss']
})
export class DisplaySettingsComponent implements OnInit, OnDestroy {

  private subscriptions = new Subscription();
  private updateInterval: NodeJS.Timeout;
  private updateIntervalMs = 1000;

  public inputBrightness = new FormControl(1);
  private disableBrightnessUpdate = false;
  private lastDisableTimer: NodeJS.Timeout;

  public selectedCustomProfile: string;
  public formProfileEdit: FormGroup;
  public inputBrightnessTrackCurrent = new FormControl(false);

  constructor(
    private dbus: DBusService,
    private ref: ChangeDetectorRef,
    private config: ConfigService,
    private electron: ElectronService) { }

  ngOnInit() {
    this.periodicUpdate();
    this.updateInterval = setInterval(() => { this.periodicUpdate(); }, this.updateIntervalMs);
    this.initializeDBusBrightness();

    this.formProfileEdit = new FormGroup({
      inputUseBrightness: new FormControl({ value: false }, [ Validators.required ]),
      inputBrightnessPercent: new FormControl({ value: 1 }, [ Validators.min(1), Validators.max(100) ]),
    });

    this.setCustomProfileEdit(this.config.getCurrentEditingProfile());
    this.subscriptions.add(this.config.observeEditingProfile.subscribe(editingProfile => { this.setCustomProfileEdit(editingProfile); }));
  }

  private initializeDBusBrightness(): void {
    if (this.dbus.currentDisplayBrightness !== undefined && this.disableBrightnessUpdate === false) {
      this.updateBrightnessSliderValue(this.dbus.currentDisplayBrightness);
    }
    this.subscriptions.add(this.dbus.observeDisplayBrightness.subscribe((brightnessPercent) => {
      if (this.disableBrightnessUpdate === false) {
        this.updateBrightnessSliderValue(brightnessPercent);
        // Speed up change detection for more responsive display
        this.ref.detectChanges();
      }
    }));
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
    if (this.updateInterval) { clearInterval(this.updateInterval); }
  }

  private periodicUpdate(): void {
  }

  inputBrightnessChange(valuePercent: number): void {
    this.disableBrightnessUpdate = true;
    if (valuePercent === 100) {
      this.dbus.setDisplayBrightness(valuePercent);
    } else {
      this.dbus.setDisplayBrightness(valuePercent + 1);
    }
    if (this.lastDisableTimer) { clearTimeout(this.lastDisableTimer); }
    this.lastDisableTimer = setTimeout(() => {
        this.disableBrightnessUpdate = false;
        this.updateBrightnessSliderValue(this.dbus.currentDisplayBrightness);
    }, 500);

    this.trackBrightnessSlider(valuePercent);
  }

  public getCustomProfiles(): ITccProfile[] {
    return this.config.getCustomProfiles();
  }

  public updateBrightnessSliderValue(valuePercent: number): void {
    this.inputBrightness.setValue(valuePercent);
    this.trackBrightnessSlider(valuePercent);
  }

  public trackBrightnessSlider(valuePercent?: number): void {
    if (this.inputBrightnessTrackCurrent.value) {
      if (valuePercent === undefined) {
        this.formProfileEdit.controls.inputBrightnessPercent.setValue(this.inputBrightness.value);
      } else {
        this.formProfileEdit.controls.inputBrightnessPercent.setValue(valuePercent);
      }
      this.formProfileEdit.controls.inputBrightnessPercent.markAsDirty();
      this.ref.detectChanges();
    }
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

  public currentlyEditingProfile(): boolean {
    return this.config.getCurrentEditingProfile() !== undefined;
  }

  private setCustomProfileEdit(profile: ITccProfile): void {
    if (profile === undefined) {
      this.selectedCustomProfile = undefined;
      return;
    }
    this.inputBrightnessTrackCurrent.setValue(false);
    this.selectedCustomProfile = profile.name;
    this.formProfileEdit.markAsPristine();
    const formControls = this.formProfileEdit.controls;
    const currentProfileDisplay = profile.display;

    if (currentProfileDisplay.useBrightness === undefined) {
      formControls.inputUseBrightness.setValue(false);
    } else {
      formControls.inputUseBrightness.setValue(currentProfileDisplay.useBrightness);
    }

    if (currentProfileDisplay.brightness === undefined) {
      formControls.inputBrightnessPercent.setValue(100);
    } else {
      formControls.inputBrightnessPercent.setValue(currentProfileDisplay.brightness);
    }

    this.enableBrightnessControls();
  }

  public enableBrightnessControls(): void {
    if (this.formProfileEdit.controls.inputUseBrightness.value) {
      this.formProfileEdit.controls.inputBrightnessPercent.enable();
      this.inputBrightnessTrackCurrent.enable();
    } else {
      this.formProfileEdit.controls.inputBrightnessPercent.disable();
      this.inputBrightnessTrackCurrent.disable();
      this.inputBrightnessTrackCurrent.setValue(false);
    }
  }
}
