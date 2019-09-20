import { Injectable, OnDestroy } from '@angular/core';
import { determineState } from '../../common/classes/StateUtils';
import { ProfileStates, ITccSettings } from '../../common/models/TccSettings';
import { Observable, Subject, Subscription } from 'rxjs';
import { ITccProfile } from 'src/common/models/TccProfile';
import { ConfigService } from './config.service';

@Injectable({
  providedIn: 'root'
})
export class StateService implements OnDestroy {

  private updateInterval: NodeJS.Timeout;
  private currentSettings: ITccSettings;
  private subscriptions: Subscription = new Subscription();

  private activeState: ProfileStates;
  private stateSubject: Subject<ProfileStates>;
  public stateObserver: Observable<ProfileStates>;

  private activeProfile: ITccProfile;
  private activeProfileSubject: Subject<ITccProfile>;
  public activeProfileObserver: Observable<ITccProfile>;

  constructor(private config: ConfigService) {
    this.stateSubject = new Subject<ProfileStates>();
    this.stateObserver = this.stateSubject.asObservable();

    this.activeProfileSubject = new Subject<ITccProfile>();
    this.activeProfileObserver = this.activeProfileSubject.asObservable();

    this.currentSettings = this.config.getSettings();
    this.subscriptions.add(this.config.observeSettings.subscribe(newSettings => {
      this.currentSettings = newSettings;
      this.updateActiveProfile();
    }));

    this.pollActiveState();
    this.updateInterval = setInterval(() => {
      this.pollActiveState();
    }, 500);
  }

  public getActiveState(): ProfileStates {
    return this.activeState;
  }

  public getActiveProfile(): ITccProfile {
    return this.activeProfile;
  }

  private pollActiveState(): void {
    const newState = determineState();
    if (newState !== this.activeState) {
      this.activeState = newState;
      this.stateSubject.next(newState);
      this.updateActiveProfile();
    }
  }

  private updateActiveProfile(): void {
    const activeProfileName = this.currentSettings.stateMap[this.activeState.toString()];
    this.activeProfile = this.config.getProfileByName(activeProfileName);
    this.activeProfileSubject.next(this.activeProfile);
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
  }
}
