import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ConfigService } from '../config.service';
import { ITccProfile } from '../../../common/models/TccProfile';
import { DecimalPipe } from '@angular/common';
import { UtilsService } from '../utils.service';
import { FormControl, Validators } from '@angular/forms';
import { MatInput } from '@angular/material/input';
import { ElectronService } from 'ngx-electron';

enum InputMode {
  New, Copy, Edit
}

class ProfileManagerButton {
  constructor(
    public show: () => boolean,
    public disable: () => boolean,
    public click: () => void,
    public label: () => string,
    public tooltip: () => string) {}
}

@Component({
  selector: 'app-profile-manager',
  templateUrl: './profile-manager.component.html',
  styleUrls: ['./profile-manager.component.scss']
})
export class ProfileManagerComponent implements OnInit {

  public currentProfile: ITccProfile;

  public inputActive = false;
  public currentInputMode: InputMode;
  public inputProfileName: FormControl = new FormControl('', [ Validators.required, Validators.minLength(1), Validators.maxLength(50) ]);
  public inputProfileNameLabel: string;

  @ViewChild('inputFocus', { static: false }) inputFocus: MatInput;

  public buttonActivate = new ProfileManagerButton(
    // Show
    () => true,
    // Disable
    () => this.isActiveProfile(),
    // Click
    () => { this.setActiveProfile(this.currentProfile.name); },
    // Label
    () => { if (this.isActiveProfile()) { return 'Activate'; } else { return 'Activate'; } },
    // Tooltip
    () => this.isActiveProfile() ? 'Profile is already active' : 'Set this profile as active'
  );

  public buttonCopy = new ProfileManagerButton(
    // Show
    () => this.currentProfile.name !== 'Default',
    // Disable
    () => false,
    // Click
    () => {
      this.currentInputMode = InputMode.Copy;
      this.inputProfileName.setValue('');
      this.inputProfileNameLabel = 'Copy this profile';
      this.inputActive = true;
      setImmediate( () => { this.inputFocus.focus(); });
    },
    // Label
    () => 'Copy',
    // Tooltip
    () => 'Copy this profile'
  );

  public buttonEdit = new ProfileManagerButton(
    // Show
    () => this.isCustomProfile(),
    // Disable
    () => this.isActiveProfile(),
    // Click
    () => {
      this.currentInputMode = InputMode.Edit;
      this.inputProfileName.setValue(this.currentProfile.name);
      this.inputProfileNameLabel = 'Rename this profile';
      this.inputActive = true;
      setImmediate( () => { this.inputFocus.focus(); });
    },
    // Label
    () => 'Rename',
    // Tooltip
    () => this.isActiveProfile() ? 'Can\'t rename active profile' : 'Rename this profile'
  );

  public buttonNew = new ProfileManagerButton(
    // Show
    () => true,
    // Disable
    () => false,
    // Click
    () => {
      this.currentInputMode = InputMode.New;
      this.inputProfileName.setValue('');
      this.inputProfileNameLabel = 'New profile';
      this.inputActive = true;
      setImmediate( () => { this.inputFocus.focus(); });
    },
    // Label
    () => 'New profile',
    // Tooltip
    () => 'Create a new profile with default settings'
  );

  public buttonDelete = new ProfileManagerButton(
    // Show
    () => this.isCustomProfile(),
    // Disable
    () => this.isActiveProfile(),
    // Click
    () => { this.deleteProfile(this.currentProfile.name); },
    // Label
    () => 'Delete',
    // Tooltip
    () => this.isActiveProfile() ? 'Can\'t delete active profile' : 'Delete this profile'
  );

  constructor(
    private route: ActivatedRoute,
    private config: ConfigService,
    private decimalPipe: DecimalPipe,
    private utils: UtilsService,
    private router: Router,
    private electron: ElectronService) { }

  ngOnInit() {
    this.route.params.subscribe(params => {
      if (params.profileName) {
        this.currentProfile = this.config.getProfileByName(params.profileName);
        this.config.setCurrentEditingProfile(this.currentProfile.name);
      } else {
        this.currentProfile = this.config.getCurrentEditingProfile();
        if (this.currentProfile === undefined) {
          this.currentProfile = this.config.getActiveProfile();
        }
      }
      this.utils.fillDefaultValuesProfile(this.currentProfile);
    });
  }

  public setActiveProfile(profileName: string): void {
    setImmediate(() => {
      if (profileName !== this.config.getSettings().activeProfileName) {
        this.config.setActiveProfile(profileName);
      }
    });
  }

  public onInputSubmit(): void {
    if (this.inputProfileName.valid) {
      switch (this.currentInputMode) {
        case InputMode.New:
          if (this.config.copyProfile('Default', this.inputProfileName.value)) {
            this.inputActive = false;
            this.router.navigate(['profile-manager', this.inputProfileName.value]);
          }
          break;
        case InputMode.Copy:
          if (this.config.copyProfile(this.currentProfile.name, this.inputProfileName.value)) {
            this.inputActive = false;
            this.router.navigate(['profile-manager', this.inputProfileName.value]);
          }
          break;
        case InputMode.Edit:
          if (this.config.setCurrentEditingProfile(this.currentProfile.name)) {
            console.log(this.config.getCurrentEditingProfile());
            this.config.getCurrentEditingProfile().name = this.inputProfileName.value;
            if (this.config.writeCurrentEditingProfile()) {
              this.inputActive = false;
              this.router.navigate(['profile-manager', this.inputProfileName.value]);
            }
            break;
          }
      }
    } else {
      const choice = this.electron.remote.dialog.showMessageBox(
        this.electron.remote.getCurrentWindow(),
        {
          title: 'Invalid input',
          message: 'A name for the profile is required',
          type: 'info',
          buttons: ['ok']
        }
      );
    }
  }

  public deleteProfile(profileName): void {
    if (this.config.deleteCustomProfile(profileName)) {
      this.router.navigate(['profile-manager', this.config.getActiveProfile().name]);
    }
  }

  public isCustomProfile(): boolean {
    return this.config.getCustomProfiles().find(profile => profile.name === this.currentProfile.name) !== undefined;
  }

  public isActiveProfile(): boolean {
    return this.currentProfile.name === this.config.getActiveProfile().name;
  }

  public formatFrequency(frequency: number): string {
    return this.decimalPipe.transform(frequency / 1000000, '1.2-2');
  }

}
