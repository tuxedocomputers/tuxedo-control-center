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

  public profiles: ITccProfile[];
  public settings: ITccSettings;

  // Exporting of relevant functions from ConfigHandler
  public copyConfig = ConfigHandler.prototype.copyConfig;
  public writeSettings = ConfigHandler.prototype.writeSettings;

  constructor(private electron: ElectronService) {
    this.config = new ConfigHandler(TccPaths.SETTINGS_FILE, TccPaths.PROFILES_FILE, TccPaths.AUTOSAVE_FILE);

    this.readProfiles();
    this.readSettings();
  }

  public readProfiles(): void {
    this.profiles = this.config.getAllProfilesNoThrow();
  }

  public readSettings(): void {
    this.settings = this.config.getSettingsNoThrow();
  }

  public getSettings(): ITccSettings {
    return this.settings;
  }

  public getAllProfiles(): ITccProfile[] {
    return this.profiles;
  }

  public setActiveProfile(profileName: string) {
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
    this.readSettings();
  }
}
