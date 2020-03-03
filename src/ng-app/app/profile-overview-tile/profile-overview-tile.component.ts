/*!
 * Copyright (c) 2019-2020 TUXEDO Computers GmbH <tux@tuxedocomputers.com>
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
import { Component, OnInit, Input } from '@angular/core';
import { ITccProfile } from '../../../common/models/TccProfile';
import { UtilsService } from '../utils.service';
import { StateService, IStateInfo } from '../state.service';
import { ITccSettings } from '../../../common/models/TccSettings';
import { ConfigService } from '../config.service';
import { Router } from '@angular/router';
import { FormControl } from '@angular/forms';

@Component({
  selector: 'app-profile-overview-tile',
  templateUrl: './profile-overview-tile.component.html',
  styleUrls: ['./profile-overview-tile.component.scss']
})
export class ProfileOverviewTileComponent implements OnInit {

  @Input() profile: ITccProfile;
  @Input() hoverEffect = false;
  @Input() isSelected = false;
  @Input() visible = true;
  @Input() active = false;

  /**
   * Special input to signal that it shouldn't display a profile and just
   * display an add symbol instead.
   *
   * If set to true it overrules the profile input. Defaults to false.
   */
  @Input() addProfileTile = false;

  public showOverlay = false;

  public selectStateControl: FormControl;
  public stateInputArray: IStateInfo[];

  constructor(
    private utils: UtilsService,
    private state: StateService,
    private config: ConfigService,
    private router: Router
  ) { }

  ngOnInit() {
    if (!this.addProfileTile) {
      if (this.selectStateControl === undefined) {
        this.selectStateControl = new FormControl(this.state.getProfileStates(this.profile.name));
      } else {
        this.selectStateControl.reset(this.state.getProfileStates(this.profile.name));
      }
    }

    this.stateInputArray = this.state.getStateInputs();
  }

  public getStateInputs(): IStateInfo[] {
    return this.state.getStateInputs();
  }

  public getSettings(): ITccSettings {
    return this.config.getSettings();
  }

  public formatFrequency(frequency: number): string {
    return this.utils.formatFrequency(frequency);
  }

  public activateOverlay(status: boolean): void {
    if (!this.addProfileTile) {
      if (status === false) {
        this.selectStateControl.reset(this.state.getProfileStates(this.profile.name));
      }
      this.showOverlay = status;
    }
  }

  public selectProfile(profileName?: string): void {
    setImmediate(() => {
      if (profileName === undefined) {
        this.router.navigate(['profile-manager']);
      } else {
        this.router.navigate(['profile-manager', profileName]);
      }
    });
  }

  public saveStateSelection(): void {
    const profileStateAssignments: string[] = this.selectStateControl.value;
    this.config.writeProfile(this.profile.name, this.profile, profileStateAssignments);
    this.selectStateControl.markAsPristine();
  }
}
