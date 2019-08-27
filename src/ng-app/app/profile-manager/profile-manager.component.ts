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
      } else {
        this.currentProfile = this.config.getActiveProfile();
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

  public newProfile(): void {
    this.currentInputMode = InputMode.New;
    this.inputProfileName.setValue('');
    this.inputProfileNameLabel = 'New profile';
    this.inputActive = true;
    setImmediate( () => { this.inputFocus.focus(); });
  }

  public copyProfile(): void {
    this.currentInputMode = InputMode.Copy;
    this.inputProfileName.setValue('');
    this.inputProfileNameLabel = 'Copy profile';
    this.inputActive = true;
    setImmediate( () => { this.inputFocus.focus(); });
  }

  public editProfile(): void {
    this.currentInputMode = InputMode.Edit;
    this.inputProfileName.setValue(this.currentProfile.name);
    this.inputProfileNameLabel = 'Rename profile';
    this.inputActive = true;
    setImmediate( () => { this.inputFocus.focus(); });
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
          break;
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

  public showApplyProfileButton(): boolean {
    return !this.isActiveProfile();
  }

  public showDeleteProfileButton(): boolean {
    return this.isCustomProfile();
  }

  public showCopyProfileButton(): boolean {
    return this.currentProfile.name !== 'Default';
  }

  public formatFrequency(frequency: number): string {
    return this.decimalPipe.transform(frequency / 1000000, '1.2-2');
  }

}
