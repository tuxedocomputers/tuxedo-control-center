import { Component } from '@angular/core';
import { ElectronService } from 'ngx-electron';

import { TccPaths } from '../../common/classes/TccPaths';
import { ConfigHandler } from '../../common/classes/ConfigHandler';
import { ITccProfile } from '../../common/models/TccProfile';
import { ITccSettings } from '../../common/models/TccSettings';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {

  private config: ConfigHandler;

  private profiles: ITccProfile[];
  private settings: ITccSettings;

  constructor(private electron: ElectronService) {
    this.config = new ConfigHandler(TccPaths.SETTINGS_FILE, TccPaths.PROFILES_FILE, TccPaths.AUTOSAVE_FILE);
    this.profiles = this.config.getAllProfiles();
    this.settings = this.config.readSettings();
  }

  title = 'TUXEDO Control Center';

  buttonExit() {
    this.electron.remote.getCurrentWindow().close();
  }

  chooseProfile(profileName: string) {
    const newSettings: ITccSettings = JSON.parse(JSON.stringify(this.settings));
    newSettings.activeProfileName = profileName;
    const tmpPath = '/tmp/tcc/tmpsettings';
    this.config.writeSettings(newSettings, tmpPath);
    const result = this.electron.ipcRenderer.sendSync(
      'sudo-exec',
      'pkexec tccd --new_settings ' + tmpPath
    );
    this.settings = this.config.readSettings();
  }
}
