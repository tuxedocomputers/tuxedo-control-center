import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';

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
export class AppComponent implements OnInit, OnDestroy {

  public profileSelect: string;
  public activeProfileName: string;

  private subscriptions: Subscription = new Subscription();

  constructor(private electron: ElectronService, private config: ConfigService, private router: Router) { }

  title = 'TUXEDO Control Center v' + this.electron.remote.app.getVersion();

  public ngOnInit(): void {
    this.getSettings();
    this.subscriptions.add(this.config.observeSettings.subscribe(newSettings => { this.getSettings(); }));
  }

  public ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  public buttonExit(): void {
    this.electron.remote.getCurrentWindow().close();
  }

  public getAllProfiles(): ITccProfile[] {
    return this.config.getAllProfiles();
  }

  public getSettings(): ITccSettings {
    this.activeProfileName = this.config.getSettings().activeProfileName;
    return this.config.getSettings();
  }

  public chooseProfile(profileName: string): void {
    this.router.navigate(['profile-manager', profileName]);
    setImmediate(() => {
      this.profileSelect = '';
    });
  }
}
