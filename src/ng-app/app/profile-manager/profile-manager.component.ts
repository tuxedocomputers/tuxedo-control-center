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
    private electron: ElectronService) { }

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
            this.router.navigate(['profile-manager']);
          }
          break;
        case InputMode.Copy:
          if (this.config.copyProfile(this.currentProfile.name, this.inputProfileName.value)) {
            this.inputActive = false;
            this.router.navigate(['profile-manager']);
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
      this.router.navigate(['profile-manager']);
    }
  }

  public isCustomProfile(): boolean {
    return this.config.getCustomProfiles().find(profile => profile.name === this.currentProfile.name) !== undefined;
  }

  public isUsedProfile(): boolean {
    return Object.values(this.config.getSettings().stateMap).includes(this.currentProfile.name)
  }

  public formatFrequency(frequency: number): string {
    return this.utils.formatFrequency(frequency);
  }

  public defineButtons(): void {
    this.buttonCopy = new ProfileManagerButton(
      // Show
      () => true,
      // Disable
      () => this.currentProfile.name === 'Default',
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

    this.buttonEdit = new ProfileManagerButton(
      // Show
      () => true,
      // Disable
      () => this.isUsedProfile() || !this.isCustomProfile(),
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
      () => this.isUsedProfile() ? 'Can not rename used profile' : 'Rename this profile'
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
        this.inputProfileNameLabel = 'New profile';
        this.inputActive = true;
        setImmediate( () => { this.inputFocus.focus(); });
      },
      // Label
      () => 'New profile',
      // Tooltip
      () => 'Create a new profile with default settings'
    );

    this.buttonDelete = new ProfileManagerButton(
      // Show
      () => true,
      // Disable
      () => this.isUsedProfile() || this.config.getCustomProfiles().length === 1 || !this.isCustomProfile(),
      // Click
      () => { this.deleteProfile(this.currentProfile.name); },
      // Label
      () => 'Delete',
      // Tooltip
      () => {
        if (this.isUsedProfile()) { return 'Can not delete used profile'; }
        if (!this.isCustomProfile()) { return 'Can not delete preset profiles'; }
        if (this.config.getCustomProfiles().length === 1) { return 'Can not delete last custom profile'; }
        return 'Delete this profile';
      }
    );
  }
}
