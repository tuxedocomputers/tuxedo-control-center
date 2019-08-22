import { Injectable } from '@angular/core';

import { TccPaths } from '../../common/classes/TccPaths';
import { ITccSettings } from '../../common/models/TccSettings';
import { ITccProfile } from '../../common/models/TccProfile';
import { ConfigHandler } from '../../common/classes/ConfigHandler';
import { environment } from '../environments/environment';
import { ElectronService } from 'ngx-electron';

@Injectable({
  providedIn: 'root'
})
export class ConfigService {

  private config: ConfigHandler;

  private defaultProfiles: ITccProfile[];
  private customProfiles: ITccProfile[];
  private settings: ITccSettings;

  private currentProfileEdit: ITccProfile;

  // Exporting of relevant functions from ConfigHandler
  // public copyConfig = ConfigHandler.prototype.copyConfig;
  // public writeSettings = ConfigHandler.prototype.writeSettings;

  constructor(private electron: ElectronService) {
    this.config = new ConfigHandler(TccPaths.SETTINGS_FILE, TccPaths.PROFILES_FILE, TccPaths.AUTOSAVE_FILE);
    this.defaultProfiles = this.config.getDefaultProfiles();
    this.readFiles();
  }

  public readFiles(): void {
    this.customProfiles = this.config.getCustomProfilesNoThrow();
    this.settings = this.config.getSettingsNoThrow();
  }

  public getSettings(): ITccSettings {
    return this.settings;
  }

  public getCustomProfiles(): ITccProfile[] {
    return this.customProfiles;
  }

  public getDefaultProfiles(): ITccProfile[] {
    return this.defaultProfiles;
  }

  public getAllProfiles(): ITccProfile[] {
    return this.defaultProfiles.concat(this.getCustomProfiles());
  }

  public setActiveProfile(profileName: string): void {
    // Copy existing current settings and set name of new profile
    const newSettings: ITccSettings = this.config.copyConfig<ITccSettings>(this.getSettings());

    newSettings.activeProfileName = profileName;
    const tmpSettingsPath = '/tmp/tmptccsettings';
    this.config.writeSettings(newSettings, tmpSettingsPath);
    let tccdExec: string;
    if (environment.production) {
      tccdExec = TccPaths.TCCD_EXEC_FILE;
    } else {
      tccdExec = this.electron.process.cwd() + '/dist/tuxedo-control-center/data/service/tccd';
    }
    const result = this.electron.ipcRenderer.sendSync(
      'sudo-exec', 'pkexec ' + tccdExec + ' --new_settings ' + tmpSettingsPath
    );
    this.readFiles();
  }

  /**
   * Retrieves the currently chosen profile for edit
   *
   * @returns undefined if no profile is set, the profile otherwise
   */
  public getCurrentEditingProfile(): ITccProfile {
    return this.currentProfileEdit;
  }

  /**
   * Checks if the current edit profile has changes compared to the currently saved
   *
   * @returns true if there are changes, false if there are no changes or no profile
   *          is chosen for edit
   */
  public editProfileChanges(): boolean {
    if (this.currentProfileEdit === undefined) { return false; }
    const currentSavedProfile: ITccProfile = this.customProfiles.find(profile => profile.name === this.currentProfileEdit.name);
    // Compare the two profiles
    return JSON.stringify(this.currentProfileEdit) !== JSON.stringify(currentSavedProfile);
  }

  /**
   * Set the current profile to edit. Effectively makes a new copy of the chosen profile
   * for edit and compare with current profile values. Overwrites any current changes.
   *
   * @param customProfileName Profile name used to look up the profile
   * @returns false if the name doesn't exist among the custom profiles, true if successfully set
   */
  public setCurrentEditingProfile(customProfileName: string): boolean {
    const profile: ITccProfile = this.customProfiles.find(e => e.name === customProfileName);
    if (profile === undefined) {
      return false;
    } else {
      this.currentProfileEdit = this.config.copyConfig<ITccProfile>(profile);
      return true;
    }
  }
}
