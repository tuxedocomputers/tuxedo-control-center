import { Injectable, OnDestroy } from '@angular/core';
import { determineState } from '../../common/classes/StateUtils';
import { ProfileStates, ITccSettings } from '../../common/models/TccSettings';
import { Observable, Subject, Subscription } from 'rxjs';
import { ITccProfile } from '../../common/models/TccProfile';
import { ConfigService } from './config.service';


export interface IStateInfo {
  label: string;
  icon: string;
  value: string;
}

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

  public stateInputMap = new Map<string, IStateInfo>();
  public stateInputArray: IStateInfo[];

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

    this.stateInputMap
      .set(ProfileStates.AC.toString(), { label: 'Mains', icon: 'power', value: ProfileStates.AC.toString() })
      .set(ProfileStates.BAT.toString(), { label: 'Battery ', icon: 'battery_std', value: ProfileStates.BAT.toString() }
    );
    this.stateInputArray = Array.from(this.stateInputMap.values());
  }

  public getStateInputs(): IStateInfo[] {
    return this.stateInputArray;
  }

  public getActiveState(): ProfileStates {
    return this.activeState;
  }

  public getActiveProfile(): ITccProfile {
    return this.activeProfile;
  }

  /**
   * Get the array of state names that the profile is activated for
   */
  public getProfileStates(profileName: string): string[] {
    // Filter on value (profile name) and map on key (state)
    return Object.entries(this.currentSettings.stateMap)
            .filter(entry => entry[1] === profileName)
            .map(entry => entry[0]);
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
