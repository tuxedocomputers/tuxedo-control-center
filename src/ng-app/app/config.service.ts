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
import { Injectable, OnDestroy } from '@angular/core';

import { TccPaths } from '../../common/classes/TccPaths';
import { ITccSettings } from '../../common/models/TccSettings';
import { ITccProfile, generateProfileId } from '../../common/models/TccProfile';
import { ConfigHandler } from '../../common/classes/ConfigHandler';
import { environment } from '../environments/environment';
import { ElectronService } from 'ngx-electron';
import { Observable, Subject, BehaviorSubject, Subscription } from 'rxjs';
import { UtilsService } from './utils.service';
import { ITccFanProfile } from '../../common/models/TccFanTable';
import { DefaultProfileIDs, IProfileTextMappings } from '../../common/models/DefaultProfiles';
import { TccDBusClientService } from './tcc-dbus-client.service';

@Injectable({
    providedIn: 'root'
})
export class ConfigService implements OnDestroy {

    private config: ConfigHandler;

    private defaultProfiles: ITccProfile[];
    private customProfiles: ITccProfile[];
    private settings: ITccSettings;

    private currentProfileEdit: ITccProfile;
    private currentProfileEditIndex: number;

    public observeSettings: Observable<ITccSettings>;
    private settingsSubject: Subject<ITccSettings>;

    public observeEditingProfile: Observable<ITccProfile>;
    private editingProfileSubject: Subject<ITccProfile>;
    public editingProfile: BehaviorSubject<ITccProfile>;

    private subscriptions: Subscription = new Subscription();

    private defaultProfileInfos = new Map<string, IProfileTextMappings>();

    // Exporting of relevant functions from ConfigHandler
    // public copyConfig = ConfigHandler.prototype.copyConfig;
    // public writeSettings = ConfigHandler.prototype.writeSettings;

    constructor(
        private electron: ElectronService,
        private utils: UtilsService,
        private dbus: TccDBusClientService) {
        this.settingsSubject = new Subject<ITccSettings>();
        this.observeSettings = this.settingsSubject.asObservable();

        this.editingProfileSubject = new Subject<ITccProfile>();
        this.observeEditingProfile = this.editingProfileSubject.asObservable();
        this.editingProfile = new BehaviorSubject<ITccProfile>(undefined);

        this.config = new ConfigHandler(
            TccPaths.SETTINGS_FILE,
            TccPaths.PROFILES_FILE,
            TccPaths.AUTOSAVE_FILE,
            TccPaths.FANTABLES_FILE
        );

        this.defaultProfileInfos.set(DefaultProfileIDs.MaxEnergySave, {
            name: $localize `:@@profileNamePowersaveExtreme:Powersave extreme`,
            description: $localize `:@@profileDescPowersaveExtreme:Lowest possible power consumption and silent fans at the cost of extremely low performance.`
        });

        this.defaultProfileInfos.set(DefaultProfileIDs.Quiet, {
            name: $localize `:@@profileNameQuiet:Quiet`,
            description: $localize `:@@profileDescQuiet:Low performance for light office tasks for very quiet fans and low power consumption.`
        });

        this.defaultProfileInfos.set(DefaultProfileIDs.Office, {
            name: $localize `:@@profileNameOffice:Office and Multimedia`,
            description: $localize `:@@profileDescOffice:Mid-tier performance for more demanding office tasks or multimedia usage and quiet fans.`
        });

        this.defaultProfileInfos.set(DefaultProfileIDs.HighPerformance, {
            name: $localize `:@@profileNameHighPerformance:High Performance`,
            description: $localize `:@@profileDescHighPerformance:High performance for gaming and demanding computing tasks at the cost of moderate to high fan noise and higher temperatures.`
        });

        this.defaultProfileInfos.set(DefaultProfileIDs.MaximumPerformance, {
            name: $localize `:@@profileNameMaximumPerformance:Max Performance`,
            description: $localize `:@@profileDescMaximumPerformance:Maximum performance at the cost of very loud fan noise levels and very high temperatures.`
        });

        this.defaultProfiles = this.dbus.defaultProfiles.value;
        this.updateConfigData();
        this.subscriptions.add(this.dbus.customProfiles.subscribe(nextCustomProfiles => {
            this.customProfiles = nextCustomProfiles;
        }));
        this.subscriptions.add(this.dbus.defaultProfiles.subscribe(nextDefaultProfiles => {
            this.defaultProfiles = nextDefaultProfiles;
        }));
    }

    ngOnDestroy(): void {
        this.subscriptions.unsubscribe();
    }

    public updateConfigData(): void {
        // this.customProfiles = this.config.getCustomProfilesNoThrow();
        this.customProfiles = this.dbus.customProfiles.value;
        /*for (const profile of this.customProfiles) {
            this.utils.fillDefaultValuesProfile(profile);
        }*/
        this.settings = this.config.getSettingsNoThrow();
        this.settingsSubject.next(this.settings);
    }

    public getSettings(): ITccSettings {
        return this.settings;
    }

    get cpuSettingsDisabledMessage(): string {
        return $localize `:@@messageCPUSettingsOff:CPU settings deactivated in Tools→Global\u00A0Settings`;
    }

    get fanControlDisabledMessage(): string {
        return $localize `:@@messageFanControlOff:Fan control deactivated in Tools→Global\u00A0Settings`;
    }

    public getCustomProfiles(): ITccProfile[] {
        return this.customProfiles;
    }

    public getDefaultProfiles(): ITccProfile[] {
        return this.defaultProfiles;
    }

    public getAllProfiles(): ITccProfile[] {
        return this.defaultProfiles.concat(this.getCustomProfiles());
    }

    public setActiveProfile(profileId: string, stateId: string): void {
        // Copy existing current settings and set id of new profile
        const newSettings: ITccSettings = this.config.copyConfig<ITccSettings>(this.getSettings());

        newSettings.stateMap[stateId] = profileId;
        const tmpSettingsPath = '/tmp/tmptccsettings';
        this.config.writeSettings(newSettings, tmpSettingsPath);
        let tccdExec: string;

        if (environment.production) {
            tccdExec = TccPaths.TCCD_EXEC_FILE;
        } else {
            tccdExec = this.electron.process.cwd() + '/dist/tuxedo-control-center/data/service/tccd';
        }

        const result = this.electron.ipcRenderer.sendSync(
            'exec-cmd-sync', 'pkexec ' + tccdExec + ' --new_settings ' + tmpSettingsPath
        );
        
        this.updateConfigData();
    }

    public async copyProfile(sourceProfileId: string, newProfileName: string) {
        const profileToCopy: ITccProfile = this.getProfileById(sourceProfileId);

        if (profileToCopy === undefined) {
            return false;
        }

        const newProfile: ITccProfile = this.config.copyConfig<ITccProfile>(profileToCopy);
        newProfile.name = newProfileName;
        newProfile.id = generateProfileId();
        const newProfileList = this.getCustomProfiles().concat(newProfile);
        const success = await this.pkexecWriteCustomProfilesAsync(newProfileList);
        if (success) {
            this.updateConfigData();
        }
        return success;
    }

    public async deleteCustomProfile(profileIdToDelete: string) {
        const newProfileList: ITccProfile[] = this.getCustomProfiles().filter(profile => profile.id !== profileIdToDelete);
        if (newProfileList.length === this.getCustomProfiles().length) {
            return false;
        }
        const success = await this.pkexecWriteCustomProfilesAsync(newProfileList);
        if (success) {
            this.updateConfigData();
        }
        return success;
    }

    public pkexecWriteCustomProfiles(customProfiles: ITccProfile[]) {
        const tmpProfilesPath = '/tmp/tmptccprofiles';
        this.config.writeProfiles(customProfiles, tmpProfilesPath);
        let tccdExec: string;
        if (environment.production) {
            tccdExec = TccPaths.TCCD_EXEC_FILE;
        } else {
            tccdExec = this.electron.process.cwd() + '/dist/tuxedo-control-center/data/service/tccd';
        }
        const result = this.electron.ipcRenderer.sendSync(
            'exec-cmd-sync', 'pkexec ' + tccdExec + ' --new_profiles ' + tmpProfilesPath
        );
        return result.error === undefined;
    }

    public writeCurrentEditingProfile(): boolean {
        if (this.editProfileChanges()) {
            const changedCustomProfiles: ITccProfile[] = this.config.copyConfig<ITccProfile[]>(this.customProfiles);
            changedCustomProfiles[this.currentProfileEditIndex] = this.getCurrentEditingProfile();

            const result = this.pkexecWriteCustomProfiles(changedCustomProfiles);
            if (result) { this.updateConfigData(); }

            return result;
        } else {
            return false;
        }
    }

    private async pkexecWriteCustomProfilesAsync(customProfiles: ITccProfile[]): Promise<boolean> {
        return new Promise<boolean>(resolve => {
            const tmpProfilesPath = '/tmp/tmptccprofiles';
            this.config.writeProfiles(customProfiles, tmpProfilesPath);
            let tccdExec: string;
            if (environment.production) {
                tccdExec = TccPaths.TCCD_EXEC_FILE;
            } else {
                tccdExec = this.electron.process.cwd() + '/dist/tuxedo-control-center/data/service/tccd';
            }
            this.utils.execFile('pkexec ' + tccdExec + ' --new_profiles ' + tmpProfilesPath).then(data => {
                resolve(true);
            }).catch(error => {
                resolve(false);
            });
        });
    }

    public async writeProfile(currentProfileId: string, profile: ITccProfile, states?: string[]): Promise<boolean> {
        return new Promise<boolean>(resolve => {
            const profileIndex = this.customProfiles.findIndex(p => p.id === currentProfileId);
            profile.id = currentProfileId;

            // Copy custom profiles and if provided profile is one of them, overwrite with
            // provided profile
            const customProfilesCopy = this.config.copyConfig<ITccProfile[]>(this.customProfiles);
            const willOverwriteProfile =
                // Is custom profile
                profileIndex !== -1;

            if (willOverwriteProfile) {
                customProfilesCopy[profileIndex] = profile;
            }

            // Copy config and if states are provided, assign the chosen profile to these states
            const newSettings: ITccSettings = this.config.copyConfig<ITccSettings>(this.getSettings());
            if (states !== undefined) {
                for (const stateId of states) {
                    newSettings.stateMap[stateId] = profile.id;
                }
            }

            this.pkexecWriteConfigAsync(newSettings, customProfilesCopy).then(success => {
                if (success) {
                    this.updateConfigData();
                }
                resolve(success);
            });
        });
    }

    public async saveSettings(): Promise<boolean> {
        return new Promise<boolean>(resolve => {
            const customProfilesCopy = this.config.copyConfig<ITccProfile[]>(this.customProfiles);
            const newSettings: ITccSettings = this.config.copyConfig<ITccSettings>(this.getSettings());

            this.pkexecWriteConfigAsync(newSettings, customProfilesCopy).then(success => {
                if (success) {
                    this.updateConfigData();
                }
                resolve(success);
            });
        });
    }

    private async pkexecWriteConfigAsync(settings: ITccSettings, customProfiles: ITccProfile[]): Promise<boolean> {
        return new Promise<boolean>(resolve => {
            const tmpProfilesPath = '/tmp/tmptccprofiles';
            const tmpSettingsPath = '/tmp/tmptccsettings';
            this.config.writeProfiles(customProfiles, tmpProfilesPath);
            this.config.writeSettings(settings, tmpSettingsPath);
            let tccdExec: string;
            if (environment.production) {
                tccdExec = TccPaths.TCCD_EXEC_FILE;
            } else {
                tccdExec = this.electron.process.cwd() + '/dist/tuxedo-control-center/data/service/tccd';
            }
            this.utils.execFile(
                'pkexec ' + tccdExec + ' --new_profiles ' + tmpProfilesPath + ' --new_settings ' + tmpSettingsPath
            ).then(data => {
                resolve(true);
            }).catch(error => {
                resolve(false);
            });
        });
    }

    /**
     * Retrieves the currently chosen profile for edit
     *
     * @returns undefined if no profile is set, the profile otherwise
     */
    public getCurrentEditingProfile(): ITccProfile {
        return this.currentProfileEdit;
    }

    public getProfileByName(searchedProfileName: string): ITccProfile {
        const foundProfile: ITccProfile = this.getAllProfiles().find(profile => profile.name === searchedProfileName);
        if (foundProfile !== undefined) {
            return this.config.copyConfig<ITccProfile>(foundProfile);
        } else {
            return undefined;
        }
    }

    public getProfileById(searchedProfileId: string): ITccProfile {
        const foundProfile: ITccProfile = this.getAllProfiles().find(profile => profile.id === searchedProfileId);
        if (foundProfile !== undefined) {
            return this.config.copyConfig<ITccProfile>(foundProfile);
        } else {
            return undefined;
        }
    }

    public getCustomProfileByName(searchedProfileName: string): ITccProfile {
        const foundProfile: ITccProfile = this.getCustomProfiles().find(profile => profile.name === searchedProfileName);
        if (foundProfile !== undefined) {
            return this.config.copyConfig<ITccProfile>(foundProfile);
        } else {
            return undefined;
        }
    }

    public getCustomProfileById(searchedProfileId: string): ITccProfile {
        const foundProfile: ITccProfile = this.getCustomProfiles().find(profile => profile.id === searchedProfileId);
        if (foundProfile !== undefined) {
            return this.config.copyConfig<ITccProfile>(foundProfile);
        } else {
            return undefined;
        }
    }

    /**
     * Checks if the current edit profile has changes compared to the currently saved
     *
     * @returns true if there are changes, false if there are no changes or no profile
     *          is chosen for edit
     */
    public editProfileChanges(): boolean {
        if (this.currentProfileEdit === undefined) { return false; }
        const currentSavedProfile: ITccProfile = this.customProfiles[this.currentProfileEditIndex];
        // Compare the two profiles
        return JSON.stringify(this.currentProfileEdit) !== JSON.stringify(currentSavedProfile);
    }

    /**
     * Set the current profile to edit. Effectively makes a new copy of the chosen profile
     * for edit and compare with current profile values. Overwrites any current changes.
     *
     * @param customProfileId Profile ID used to look up the profile
     * @returns false if the ID doesn't exist among the custom profiles, true if successfully set
     */
    public setCurrentEditingProfile(customProfileId: string): boolean {
        if (customProfileId === undefined) {
            this.currentProfileEditIndex = -1;
            this.currentProfileEdit = undefined;
            this.editingProfileSubject.next(undefined);
            this.editingProfile.next(undefined);
        }
        const index = this.currentProfileEditIndex = this.customProfiles.findIndex(e => e.id === customProfileId);
        if (index === -1) {
            return false;
        } else {
            this.currentProfileEditIndex = index;
            this.currentProfileEdit = this.config.copyConfig<ITccProfile>(this.customProfiles[index]);
            this.editingProfileSubject.next(this.currentProfileEdit);
            this.editingProfile.next(this.currentProfileEdit);
            return true;
        }
    }

    public getFanProfiles(): ITccFanProfile[] {
        return this.config.getDefaultFanProfiles();
    }

    public getDefaultProfileName(descriptor: string): string {
        const info = this.defaultProfileInfos.get(descriptor);
        if (info !== undefined) {
            return info.name;
        } else {
            return undefined;
        }
    }

    public getDefaultProfileDescription(descriptor: string): string {
        const info = this.defaultProfileInfos.get(descriptor);
        if (info !== undefined) {
            return info.description;
        } else {
            return undefined;
        }
    }
}
