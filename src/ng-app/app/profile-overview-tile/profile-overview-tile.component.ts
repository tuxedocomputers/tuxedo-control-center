/*!
 * Copyright (c) 2019-2026 TUXEDO Computers GmbH <tux@tuxedocomputers.com>
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

import { Component, EventEmitter, Input, type OnInit, Output } from '@angular/core';
import { FormControl } from '@angular/forms';
// biome-ignore lint: injection token
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import type { IGeneralCPUInfo } from '../../../common/models/ICpuInfos';
import { type ITccProfile, profileImageMap } from '../../../common/models/TccProfile';
import type { ITccSettings } from '../../../common/models/TccSettings';
import type { TDPInfo } from '../../../native-lib/TuxedoIOAPI';
// biome-ignore lint: injection token
import { CompatibilityService } from '../compatibility.service';
// biome-ignore lint: injection token
import { ConfigService } from '../config.service';
// biome-ignore lint: injection token
import { type IStateInfo, StateService } from '../state.service';
// biome-ignore lint: injection token
import { SysFsService } from '../sys-fs.service';
// biome-ignore lint: injection token
import { TccDBusClientService } from '../tcc-dbus-client.service';
// biome-ignore lint: injection token
import { UtilsService } from '../utils.service';

@Component({
    selector: 'app-profile-overview-tile',
    templateUrl: './profile-overview-tile.component.html',
    styleUrls: ['./profile-overview-tile.component.scss'],
    standalone: false,
})
export class ProfileOverviewTileComponent implements OnInit {
    @Input() public profile: ITccProfile;
    @Input() public hoverEffect: boolean = false;
    @Input() public isSelected: boolean = false;
    @Input() public visible: boolean = true;
    @Input() public active: boolean = false;
    @Input() public used: boolean = false;

    /**
     * Special input to signal that it shouldn't display a profile and just
     * display an add symbol instead.
     *
     * If set to true it overrules the profile input. Defaults to false.
     */
    @Input() public addProfileTile: boolean = false;

    @Input() public showDetails: boolean = false;

    @Output() public copyClick: EventEmitter<string> = new EventEmitter<string>();

    public selectStateControl: FormControl;
    public stateInputArray: IStateInfo[];

    public isCustomProfile: boolean = true;

    public cpuInfo: IGeneralCPUInfo;

    private subscriptions: Subscription = new Subscription();

    public odmPowerLimitInfos: TDPInfo[];
    public selectedCPUTabIndex: number;

    public get hasMaxFreqWorkaround(): boolean {
        return this.compat.hasMissingMaxFreqBoostWorkaround;
    }

    constructor(
        private utils: UtilsService,
        private state: StateService,
        private config: ConfigService,
        private router: Router,
        private route: ActivatedRoute,
        public compat: CompatibilityService,
        private sysfs: SysFsService,
        private tccDBus: TccDBusClientService,
    ) {}

    public ngOnInit(): void {
        this.subscriptions.add(
            this.sysfs.generalCpuInfo.subscribe((cpuInfo: IGeneralCPUInfo): void => {
                this.cpuInfo = cpuInfo;
            }),
        );

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

        this.subscriptions.add(
            this.tccDBus.odmProfilesAvailable.subscribe((nextAvailableODMProfiles: string[]): void => {
                this.utils.setODMProfileNames(nextAvailableODMProfiles, this.compat.uwLEDOnlyMode);
            }),
        );

        this.subscriptions.add(
            this.tccDBus.odmPowerLimits.subscribe((nextODMPowerLimits: TDPInfo[]): void => {
                if (JSON.stringify(nextODMPowerLimits) !== JSON.stringify(this.odmPowerLimitInfos)) {
                    this.odmPowerLimitInfos = nextODMPowerLimits;
                    if (this.profile) {
                        this.selectedCPUTabIndex = this.selectCPUCtlShown();
                    }
                }
            }),
        );

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

    public formatCpuFrequency(frequency: number): string {
        return this.utils.formatCpuFrequency(frequency);
    }

    public activateProfile(): void {
        if (!this.active) {
            this.tccDBus.setTempProfileById(this.profile.id);
        }
    }

    public selectProfile(): void {
        setTimeout((): void => {
            this.router.navigate(['profile-manager', this.profile.id], { relativeTo: this.route.parent });
        }, 0);
    }

    public deleteProfile(): void {
        this.utils.pageDisabled = true;
        this.config.deleteCustomProfile(this.profile.id).then((success: boolean): void => {
            this.utils.pageDisabled = false;
        });
    }

    public saveStateSelection(): void {
        this.utils.pageDisabled = true;
        const profileStateAssignments: string[] = this.selectStateControl.value;
        this.config
            .writeProfile(this.profile.id, this.profile, profileStateAssignments)
            .then((success: boolean): void => {
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

    public copyProfile(): void {
        this.copyClick.emit(this.profile.id);
    }

    public selectCPUCtlShown(): number {
        const defaultProfile: ITccProfile = this.config.getDefaultProfiles()[0];
        const powerNotDefault: boolean =
            JSON.stringify(this.profile.odmPowerLimits) !== JSON.stringify(defaultProfile.odmPowerLimits);
        const cpufreqNotDefault: boolean = JSON.stringify(this.profile.cpu) !== JSON.stringify(defaultProfile.cpu);
        const cpuFreqOnly: boolean = !this.compat.hasODMPowerLimitControl;

        const INDEX_ODMCPUTDP = 0;
        const INDEX_CPUFREQ = 1;

        let selectedCPUTabIndex: number;

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
