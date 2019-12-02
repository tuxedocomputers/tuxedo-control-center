/*!
 * Copyright (c) 2019 TUXEDO Computers GmbH <tux@tuxedocomputers.com>
 *
 * This file is part of TUXEDO Control Center.
 *
 * TUXEDO Control Center is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * TUXEDO Control Center is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with TUXEDO Control Center.  If not, see <https://www.gnu.org/licenses/>.
 */
import { Injectable, OnDestroy } from '@angular/core';
import { determineState } from '../../common/classes/StateUtils';
import { ProfileStates, ITccSettings } from '../../common/models/TccSettings';
import { Observable, Subject, Subscription } from 'rxjs';
import { ITccProfile } from '../../common/models/TccProfile';
import { ConfigService } from './config.service';
import { I18n } from '@ngx-translate/i18n-polyfill';


export interface IStateInfo {
  label: string;
  tooltip: string;
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

  constructor(private config: ConfigService, private i18n: I18n) {
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
      .set(ProfileStates.AC.toString(), {
        label: this.i18n({ value: 'Mains', id: 'stateLabelMains' }),
        tooltip: this.i18n({ value: 'Mains power adaptor', id: 'stateTooltipMains' }),
        icon: 'power',
        value: ProfileStates.AC.toString()
      })
      .set(ProfileStates.BAT.toString(), {
        label: this.i18n({ value: 'Battery ', id: 'stateLabelBattery' }),
        tooltip: this.i18n({ value: 'Battery powered', id: 'stateTooltipBattery' }),
        icon: 'battery_std',
        value: ProfileStates.BAT.toString()
      });
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
