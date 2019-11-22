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
import { StateService } from './state.service';
import { UtilsService } from './utils.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, OnDestroy {

  public profileSelect: string;
  public activeProfileName: string;

  private subscriptions: Subscription = new Subscription();

  constructor(
    private electron: ElectronService,
    private config: ConfigService,
    private state: StateService,
    private utils: UtilsService) { }

  title = 'TUXEDO Control Center';

  public languagesMenu = {
    en: { id: 'en', label: 'English', img: 'english.svg' },
    de: { id: 'de', label: 'Deutsch', img: 'german.svg' }
  };
  public languagesMenuArray;

  public ngOnInit(): void {
    this.getSettings();
    // this.subscriptions.add(this.config.observeSettings.subscribe(newSettings => { this.getSettings(); }));
    this.subscriptions.add(this.state.activeProfileObserver.subscribe(activeProfile => { this.getSettings(); }));

    this.languagesMenuArray = Object.values(this.languagesMenu);
  }

  public ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  public pageDisabled(): boolean {
    return this.utils.pageDisabled;
  }

  public buttonExit(): void {
    this.electron.remote.getCurrentWindow().close();
  }

  public getSettings(): ITccSettings {
    this.activeProfileName = this.state.getActiveProfile().name;
    return this.config.getSettings();
  }

  public changeLanguage(languageId: string) {
    if (languageId !== this.getCurrentLanguageId()) {
      this.utils.changeLanguage(languageId);
    }
  }

  public getCurrentLanguageId(): string {
    return this.utils.getCurrentLanguageId();
  }

  print(stuff) {
    console.log(stuff);
  }
}
