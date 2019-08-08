import { Component } from '@angular/core';
import { ElectronService } from 'ngx-electron';

import { TccPaths } from '../../common/classes/TccPaths';
import { ConfigHandler } from '../../common/classes/ConfigHandler';
import { ITccProfile } from '../../common/models/TccProfile';
import { ITccSettings } from '../../common/models/TccSettings';
import { environment } from '../environments/environment';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {

  private config: ConfigHandler;

  public profiles: ITccProfile[];
  public settings: ITccSettings;

  constructor(private electron: ElectronService) {
    this.config = new ConfigHandler(TccPaths.SETTINGS_FILE, TccPaths.PROFILES_FILE, TccPaths.AUTOSAVE_FILE);
    this.profiles = this.config.getAllProfilesNoThrow();
    this.settings = this.config.getSettingsNoThrow();
  }

  title = 'TUXEDO Control Center';

  buttonExit() {
    this.electron.remote.getCurrentWindow().close();
  }

  chooseProfile(profileName: string) {
    // Copy existing current settings and set name of new profile
    const newSettings: ITccSettings = this.config.copyConfig<ITccSettings>(this.settings);

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
    this.settings = this.config.readSettings();
  }
}
