import { Component } from '@angular/core';
import { ElectronService } from 'ngx-electron';

import { TccPaths } from '../../common/classes/TccPaths';
import { ConfigHandler } from '../../common/classes/ConfigHandler';
import { ITccProfile } from '../../common/models/TccProfile';
import { ITccSettings } from '../../common/models/TccSettings';
import { environment } from '../environments/environment';
import { ConfigService } from './config.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {

  constructor(private electron: ElectronService, private config: ConfigService) {}

  title = 'TUXEDO Control Center v' + this.electron.remote.app.getVersion();

  public buttonExit() {
    this.electron.remote.getCurrentWindow().close();
  }

  public getAllProfiles(): ITccProfile[] {
    return this.config.getAllProfiles();
  }

  public getSettings(): ITccSettings {
    return this.config.getSettings();
  }

  public chooseProfile(profileName: string) {
    this.config.setActiveProfile(profileName);
  }
}
