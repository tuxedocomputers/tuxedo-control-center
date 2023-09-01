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
import { ITccSettings } from '../../common/models/TccSettings';
import { ITccProfile } from '../../common/models/TccProfile';
import { ITccFanProfile } from '../../common/models/TccFanTable';
import { WebcamPreset } from 'src/common/models/TccWebcamSettings';

@Injectable({
    providedIn: 'root'
})
export class ConfigService implements OnDestroy {

    constructor() {
        this.updateConfigData();
        
    }

    ngOnDestroy(): void {

    }

    public updateConfigData(): void {
        window.config.updateConfigData();
    }

    public getSettings(): ITccSettings {
        return window.config.getSettings();
    }

    get cpuSettingsDisabledMessage(): string {
        return $localize `:@@messageCPUSettingsOff:CPU frequency control deactivated in Settings→Global\u00A0profile\u00A0settings`;
    }

    get fanControlDisabledMessage(): string {
        return $localize `:@@messageFanControlOff:Fan control deactivated in Settings→Global\u00A0profile\u00A0settings`;
    }

    get keyboardBacklightControlDisabledMessage(): string {
        return $localize `:@@messageKeyboardBacklightControlOff:Keyboard backlight control deactivated in Settings→Global\u00A0profile\u00A0settings`;
    }

    public getCustomProfiles(): ITccProfile[] {
        return window.config.getCustomProfiles();
    }

    public getDefaultProfiles(): ITccProfile[] {
        return window.config.getDefaultProfiles();
    }

    public getDefaultValuesProfile(): ITccProfile {
        return window.config.getDefaultValuesProfile();
    }

    public getAllProfiles(): ITccProfile[] {
        return this.getDefaultProfiles().concat(this.getCustomProfiles());
    }

    public setActiveProfile(profileId: string, stateId: string): void {
        window.config.setActiveProfile(profileId, stateId, this.getSettings());
        this.updateConfigData();
    }

    /**
     * Copy profile with specified ID
     *
     * @param sourceProfileId Profile ID to copy, if undefined use default values profile
     * @param newProfileName Name for the copied profile
     * @returns The new profile ID or undefined on error
     */
    public async copyProfile(sourceProfileId: string, newProfileName: string) {
        return window.config.copyProfile(sourceProfileId, newProfileName);
    }

    // appends given profiles to custom profiles but replaces all of those where IDs conflict!
    // generates a new ID for new profiles
    public async importProfiles(newProfiles: ITccProfile[])
    {
        return window.config.importProfiles(newProfiles);
    }

    public async deleteCustomProfile(profileIdToDelete: string) {
        return window.config.deleteCustomProfile(profileIdToDelete);
    }

    public pkexecWriteCustomProfiles(customProfiles: ITccProfile[]) {
        return window.config.pkexecWriteCustomProfiles(customProfiles);
    }

    public writeCurrentEditingProfile(): boolean {
        return window.config.writeCurrentEditingProfile();
    }

    private async pkexecWriteCustomProfilesAsync(customProfiles: ITccProfile[]) {
        return window.config.pkexecWriteCustomProfilesAsync(customProfiles);
    }

    public async writeProfile(currentProfileId: string, profile: ITccProfile, states?: string[]): Promise<boolean> {
        return window.config.writeProfile(currentProfileId, profile, states);
    }

    public async saveSettings(): Promise<boolean> {
        return window.config.saveSettings();
    }

    public async pkexecWriteWebcamConfigAsync(settings: WebcamPreset[]): Promise<boolean> {
        return window.config.pkexecWriteWebcamConfigAsync(settings)
    }

    /**
     * Retrieves the currently chosen profile for edit
     *
     * @returns undefined if no profile is set, the profile otherwise
     */
    public getCurrentEditingProfile(): ITccProfile {
        return window.config.getCurrentEditingProfile();
    }

    public getProfileByName(searchedProfileName: string): ITccProfile {
        return window.config.getProfileByName(searchedProfileName);
    }

    public getProfileById(searchedProfileId: string): ITccProfile {
        return window.config.getProfileById(searchedProfileId);
    }

    public getCustomProfileByName(searchedProfileName: string): ITccProfile {
        return window.config.getCustomProfileByName(searchedProfileName);
    }

    public getCustomProfileById(searchedProfileId: string): ITccProfile {
        return window.config.getCustomProfileById(searchedProfileId);
    }

    /**
     * Checks if the current edit profile has changes compared to the currently saved
     *
     * @returns true if there are changes, false if there are no changes or no profile
     *          is chosen for edit
     */
    public editProfileChanges(): boolean {
        return window.config.editProfileChanges();
    }

    /**
     * Set the current profile to edit. Effectively makes a new copy of the chosen profile
     * for edit and compare with current profile values. Overwrites any current changes.
     *
     * @param customProfileId Profile ID used to look up the profile
     * @returns false if the ID doesn't exist among the custom profiles, true if successfully set
     */
    public setCurrentEditingProfile(customProfileId: string): boolean {
        return window.config.setCurrentEditingProfile(customProfileId);
    }

    public getFanProfiles(): ITccFanProfile[] {
        return window.config.getDefaultFanProfiles();
    }
}
