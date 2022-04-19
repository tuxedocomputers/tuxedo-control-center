/*!
 * Copyright (c) 2019-2022 TUXEDO Computers GmbH <tux@tuxedocomputers.com>
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
import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { ITccProfile, profileImageMap } from '../../../common/models/TccProfile';
import { UtilsService } from '../utils.service';
import { StateService, IStateInfo } from '../state.service';
import { ITccSettings } from '../../../common/models/TccSettings';
import { ConfigService } from '../config.service';
import { Router } from '@angular/router';
import { FormControl } from '@angular/forms';
import { CompatibilityService } from '../compatibility.service';
import { IGeneralCPUInfo, SysFsService } from '../sys-fs.service';
import { Subscription } from 'rxjs';
import { TccDBusClientService } from '../tcc-dbus-client.service';
import { TDPInfo } from '../../../native-lib/TuxedoIOAPI';

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
    @Input() used = false;

    /**
     * Special input to signal that it shouldn't display a profile and just
     * display an add symbol instead.
     *
     * If set to true it overrules the profile input. Defaults to false.
     */
    @Input() addProfileTile = false;

    @Input() showDetails = false;

    @Output() copyClick = new EventEmitter<string>();

    public selectStateControl: FormControl;
    public stateInputArray: IStateInfo[];

    public isCustomProfile = true;

    public cpuInfo: IGeneralCPUInfo;

    private subscriptions: Subscription = new Subscription();

    public odmProfileNames: string[] = [];
    public odmProfileToName: Map<string, string> = new Map();

    public odmPowerLimitInfos: TDPInfo[];
    public selectedCPUTabIndex: number;

    constructor(
        private utils: UtilsService,
        private state: StateService,
        private config: ConfigService,
        private router: Router,
        public compat: CompatibilityService,
        private sysfs: SysFsService,
        private tccDBus: TccDBusClientService
    ) { }

    ngOnInit() {
        this.subscriptions.add(this.sysfs.generalCpuInfo.subscribe(cpuInfo => { this.cpuInfo = cpuInfo; }));

        if (!this.addProfileTile) {
            if (this.selectStateControl === undefined) {
                this.selectStateControl = new FormControl(this.state.getProfileStates(this.profile.id));
            } else {
                this.selectStateControl.reset(this.state.getProfileStates(this.profile.id));
            }
        }

        this.stateInputArray = this.state.getStateInputs();
        if (this.profile) {
            this.isCustomProfile = this.config.getCustomProfileById(this.profile.id) !== undefined;
        }

        this.subscriptions.add(this.tccDBus.odmProfilesAvailable.subscribe(nextAvailableODMProfiles => {
            this.odmProfileNames = nextAvailableODMProfiles;

            // Update ODM profile name map
            this.odmProfileToName.clear();
            for (const profileName of this.odmProfileNames) {
                if (profileName.length > 0) {
                    this.odmProfileToName.set(profileName, profileName.charAt(0).toUpperCase() + profileName.replace('_', ' ').slice(1));
                }
            }
        }));

        this.subscriptions.add(this.tccDBus.odmPowerLimits.subscribe(nextODMPowerLimits => {
            if (JSON.stringify(nextODMPowerLimits) !== JSON.stringify(this.odmPowerLimitInfos)) {
                this.odmPowerLimitInfos = nextODMPowerLimits;
                if (this.profile) {
                    this.selectedCPUTabIndex = this.selectCPUCtlShown();
                }
            }
        }));

        if (this.profile) {
            this.selectedCPUTabIndex = this.selectCPUCtlShown();
        }
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

    public activateProfile(): void {
        this.tccDBus.setTempProfileById(this.profile.id);
    }

    public selectProfile(): void {
        setImmediate(() => {
            this.router.navigate(['profile-manager', this.profile.id]);
        });
    }

    public deleteProfile(): void {
        this.utils.pageDisabled = true;
        this.config.deleteCustomProfile(this.profile.id).then(success => {
            this.utils.pageDisabled = false;
        });
    }

    public saveStateSelection(): void {
        this.utils.pageDisabled = true;
        const profileStateAssignments: string[] = this.selectStateControl.value;
        this.config.writeProfile(this.profile.id, this.profile, profileStateAssignments).then(success => {
            if (success) {
                this.selectStateControl.markAsPristine();
            }
            this.utils.pageDisabled = false;
        });
    }

    public getProfileIcon(profile: ITccProfile): string {
        if (profileImageMap.get(profile.id) !== undefined) {
            return profileImageMap.get(profile.id);
        } else {
            return profileImageMap.get('custom');
        }
    }

    public copyProfile() {
        this.copyClick.emit(this.profile.id);
    }

    public selectCPUCtlShown(): number {
        const defaultProfile = this.config.getDefaultProfiles()[0];
        const powerNotDefault = JSON.stringify(this.profile.odmPowerLimits) !== JSON.stringify(defaultProfile.odmPowerLimits);
        const cpufreqNotDefault = JSON.stringify(this.profile.cpu) !== JSON.stringify(defaultProfile.cpu);
        const cpuFreqOnly = !this.compat.hasODMPowerLimitControl;

        const INDEX_ODMCPUTDP = 0;
        const INDEX_CPUFREQ = 1;

        let selectedCPUTabIndex;

        if (cpuFreqOnly) {
            selectedCPUTabIndex = INDEX_CPUFREQ;
        } else if (powerNotDefault) {
            selectedCPUTabIndex = INDEX_ODMCPUTDP;
        } else if (cpufreqNotDefault) {
            selectedCPUTabIndex = INDEX_CPUFREQ;
        } else {
            selectedCPUTabIndex = INDEX_ODMCPUTDP;
        }

        return selectedCPUTabIndex;
    }
}
