import { Component, OnInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ConfigService } from '../config.service';
import { ITccProfile } from '../../../common/models/TccProfile';
import { UtilsService } from '../utils.service';
import { FormControl, Validators } from '@angular/forms';
import { MatInput } from '@angular/material/input';
import { ElectronService } from 'ngx-electron';
import { StateService, IStateInfo } from '../state.service';
import { Subscription } from 'rxjs';
import { ITccSettings } from '../../../common/models/TccSettings';

import { I18n } from '@ngx-translate/i18n-polyfill';

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
export class ProfileManagerComponent implements OnInit, OnDestroy {

  public currentProfile: ITccProfile;

  public inputActive = false;
  public currentInputMode: InputMode;
  public inputProfileName: FormControl = new FormControl('', [ Validators.required, Validators.minLength(1), Validators.maxLength(50) ]);
  public inputProfileNameLabel: string;

  private subscriptions: Subscription = new Subscription();

  public stateInputArray: IStateInfo[];

  public inputProfileFilter = 'all';

  @ViewChild('inputFocus', { static: false }) inputFocus: MatInput;

  public buttonCopy: ProfileManagerButton;
  public buttonEdit: ProfileManagerButton;
  public buttonNew: ProfileManagerButton;
  public buttonDelete: ProfileManagerButton;

  constructor(
    private route: ActivatedRoute,
    private config: ConfigService,
    private state: StateService,
    private utils: UtilsService,
    private router: Router,
    private electron: ElectronService,
    private i18n: I18n) { }

  ngOnInit() {
    this.defineButtons();

    this.route.params.subscribe(params => {
      this.inputActive = false;
      if (params.profileName) {
        this.currentProfile = this.config.getProfileByName(params.profileName);
        if (this.config.getCustomProfileByName(this.currentProfile.name) !== undefined) {
          this.config.setCurrentEditingProfile(this.currentProfile.name);
        } else {
          this.config.setCurrentEditingProfile(undefined);
        }
      } else {
        this.config.setCurrentEditingProfile(undefined);
        /*
        this.currentProfile = this.config.getCurrentEditingProfile();
        if (this.currentProfile === undefined) {
          this.currentProfile = this.state.getActiveProfile();
        }*/
      }
      if (this.currentProfile !== undefined) {
        this.utils.fillDefaultValuesProfile(this.currentProfile);
      }
    });

    this.stateInputArray = this.state.getStateInputs();
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  public isProfileActive(profileName: string): boolean {
    return this.state.getActiveProfile().name === profileName;
  }

  public getSettings(): ITccSettings {
    return this.config.getSettings();
  }

  public getAllProfiles(): ITccProfile[] {
    return this.config.getAllProfiles();
  }

  public getProfilesForList(): ITccProfile[] {
    if (this.inputProfileFilter === 'all') {
      return this.config.getAllProfiles();
    } else if (this.inputProfileFilter === 'default') {
      return this.config.getDefaultProfiles();
    } else if (this.inputProfileFilter === 'custom') {
      return this.config.getCustomProfiles();
    } else if (this.inputProfileFilter === 'used') {
      return this.config.getAllProfiles().filter(profile => {
        return Object.values(this.config.getSettings().stateMap).includes(profile.name);
      });
    } else {
      return [];
    }
  }

  public selectProfile(profileName?: string): void {
    setImmediate(() => {
      if (profileName === undefined) {
        this.router.navigate(['profile-manager']);
      } else {
        this.router.navigate(['profile-manager', profileName]);
      }
    });
  }

  public setActiveProfile(profileName: string, stateId: string): void {
    setImmediate(() => {
      this.config.setActiveProfile(profileName, stateId);
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
          title: this.i18n({ value: 'Invalid input', id: 'cProfMgrInvalidNameTitle' }),
          message: this.i18n({ value: 'A name for the profile is required', id: 'cProfMgrInvalidNameMessage' }),
          type: 'info',
          buttons: ['ok']
        }
      );
    }
  }

  public deleteProfile(profileName): void {
    if (this.config.deleteCustomProfile(profileName)) {
      this.router.navigate(['profile-manager']);
    }
  }

  public isCustomProfile(): boolean {
    return this.config.getCustomProfiles().find(profile => profile.name === this.currentProfile.name) !== undefined;
  }

  public isUsedProfile(): boolean {
    return Object.values(this.config.getSettings().stateMap).includes(this.currentProfile.name);
  }

  public formatFrequency(frequency: number): string {
    return this.utils.formatFrequency(frequency);
  }

  public defineButtons(): void {
    this.buttonCopy = new ProfileManagerButton(
      // Show
      () => true,
      // Disable
      () => false,
      // Click
      () => {
        this.currentInputMode = InputMode.Copy;
        this.inputProfileName.setValue('');
        this.inputProfileNameLabel = this.i18n({ value: 'Copy this profile', id: 'cProfMgrCopyProfileLabel' });
        this.inputActive = true;
        setImmediate( () => { this.inputFocus.focus(); });
      },
      // Label
      () => '',
      // Tooltip
      () => this.i18n({ value: 'Copy this profile', id: 'cProfMgrCopyButtonTooltip' })
    );

    this.buttonEdit = new ProfileManagerButton(
      // Show
      () => true,
      // Disable
      () => this.isUsedProfile() || !this.isCustomProfile(),
      // Click
      () => {
        this.currentInputMode = InputMode.Edit;
        this.inputProfileName.setValue(this.currentProfile.name);
        this.inputProfileNameLabel = this.i18n({ value: 'Rename this profile', id: 'cProfMgrRenameProfileLabel' }),
        this.inputActive = true;
        setImmediate( () => { this.inputFocus.focus(); });
      },
      // Label
      () => '',
      // Tooltip
      () => {
        if (this.isUsedProfile()) {
          return this.i18n({ value: 'Can not rename used profile', id: 'cProfMgrRenameButtonTooltipCannot' });
        } else {
          return this.i18n({ value: 'Rename this profile', id: 'cProfMgrRenameButtonTooltip' });
        }
      }
    );

    this.buttonNew = new ProfileManagerButton(
      // Show
      () => true,
      // Disable
      () => false,
      // Click
      () => {
        this.currentInputMode = InputMode.New;
        this.inputProfileName.setValue('');
        this.inputProfileNameLabel = this.i18n({ value: 'New profile', id: 'cProfMgrNewProfileLabel' });
        this.inputActive = true;
        setImmediate( () => { this.inputFocus.focus(); });
      },
      // Label
      () => '',
      // Tooltip
      () => this.i18n({ value: 'Create a new profile with default settings', id: 'cProfMgrNewButtonTooltip' }),
    );

    this.buttonDelete = new ProfileManagerButton(
      // Show
      () => true,
      // Disable
      () => this.isUsedProfile() || this.config.getCustomProfiles().length === 1 || !this.isCustomProfile(),
      // Click
      () => { this.deleteProfile(this.currentProfile.name); },
      // Label
      () => '',
      // Tooltip
      () => {
        if (!this.isCustomProfile()) {
          return this.i18n({ value: 'Can not delete preset profiles', id: 'cProfMgrDeleteButtonTooltipCannotPreset' });
        }
        if (this.isUsedProfile()) {
          return this.i18n({ value: 'Can not delete used profile', id: 'cProfMgrDeleteButtonTooltipCannotUsed' });
        }
        if (this.config.getCustomProfiles().length === 1) {
          return this.i18n({ value: 'Can not delete last custom profile', id: 'cProfMgrDeleteButtonTooltipCannotLast' });
        }
        return this.i18n({ value: 'Delete this profile', id: 'cProfMgrDeleteButtonTooltip' });
      }
    );
  }
}
