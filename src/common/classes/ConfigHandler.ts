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
import * as fs from 'fs';
import * as path from 'path';
import { ITccSettings, defaultSettings, deviceCustomSettings } from '../models/TccSettings';
import { generateProfileId, ITccProfile } from '../models/TccProfile';
import { defaultProfiles } from '../models/profiles/LegacyProfiles';
import { ITccAutosave, defaultAutosave } from '../models/TccAutosave';
import { ITccFanProfile, defaultFanProfiles } from '../models/TccFanTable';
import { defaultCustomProfile, deviceCustomProfiles, deviceProfiles, TUXEDODevice } from '../models/DefaultProfiles';
import { WebcamPreset } from '../models/TccWebcamSettings';

export class ConfigHandler {
    public settingsFileMod: number;
    public profileFileMod: number;
    public webcamFileMod: number;
    public v4l2NamesFileMod: number;
    public autosaveFileMod: number;
    public fantablesFileMod: number;

    private loadedCustomProfiles: ITccProfile[];
    private loadedSettings: ITccSettings;

    // tslint:disable-next-line: variable-name
    constructor(private _pathSettings: string, private _pathProfiles: string, private _pathWebcam: string, private _pathV4l2Names: string, private _pathAutosave: string, private _pathFantables) {
        this.settingsFileMod = 0o644;
        this.profileFileMod = 0o644;
        this.webcamFileMod = 0o644;
        this.v4l2NamesFileMod = 0o644;
        this.autosaveFileMod = 0o644;
        this.fantablesFileMod = 0o644;
    }

    get pathSettings() { return this._pathSettings; }
    set pathSettings(filename: string) { this._pathSettings = filename; }
    get pathProfiles() { return this._pathProfiles; }
    set pathProfiles(filename: string) { this._pathProfiles = filename; }
    get pathWebcam() { return this._pathWebcam; }
    set pathWebcam(filename: string) { this._pathWebcam = filename; }
    get pathV4l2Names() { return this._pathV4l2Names; }
    set pathV4l2Names(filename: string) { this._pathV4l2Names = filename; }
    get pathAutosave() { return this._pathAutosave; }
    set pathAutosave(filename: string) { this._pathAutosave = filename; }
    get pathFanTables() { return this._pathFantables; }
    set pathFanTables(filename: string) { this._pathFantables = filename; }

    readSettings(filePath: string = this.pathSettings): ITccSettings {
        return this.readConfig<ITccSettings>(filePath);
    }

    async readSettingsAsync(filePath: string = this.pathSettings): Promise<ITccSettings> {
        return await this.readConfigAsync<ITccSettings>(filePath);
    }

    readWebcamSettings(filePath: string = this.pathWebcam): WebcamPreset[] {
        return this.readConfig<WebcamPreset[]>(filePath);
    }

    readV4l2Names(filePath: string = this._pathV4l2Names): string[][] {
        return this.readConfig<string[][]>(filePath);
    }

    writeSettings(settings: ITccSettings, filePath: string = this.pathSettings) {
        this.writeConfig<ITccSettings>(settings, filePath, {
            mode: this.settingsFileMod,
        });
    }

    writeWebcamSettings(settings: WebcamPreset[], filePath: string = this.pathSettings) {
        this.writeConfig<WebcamPreset[]>(settings, filePath, {
            mode: this.settingsFileMod,
        });
    }

    async writeSettingsAsync(settings: ITccSettings, filePath: string = this.pathSettings) {
        await this.writeConfigAsync<ITccSettings>(settings, filePath, { mode: this.settingsFileMod });
    }

    readProfiles(filePath: string = this.pathProfiles): ITccProfile[] {
        let idUpdated = false;
        const profiles = this.readConfig<ITccProfile[]>(filePath).map(profile => {
            if (profile.id === undefined) {
                profile.id = generateProfileId();
                console.log(`(readProfiles) Generated id (${profile.id}) for ${profile.name}`);
                idUpdated = true;
            }
            return profile;
        });
        if (idUpdated) {
            this.writeProfiles(profiles);
            console.log(`Saved updated profiles`);
        }
        return profiles;
    }

    writeProfiles(profiles: ITccProfile[], filePath: string = this.pathProfiles) {
        this.writeConfig<ITccProfile[]>(profiles, filePath, { mode: this.profileFileMod });
    }

    readAutosave(filePath: string = this.pathAutosave): ITccAutosave {
        return this.readConfig<ITccAutosave>(filePath);
    }

    writeAutosave(autosave: ITccAutosave, filePath: string = this.pathAutosave) {
        this.writeConfig<ITccAutosave>(autosave, filePath, { mode: this.autosaveFileMod });
    }

    readFanTables(filePath: string = this.pathFanTables): ITccFanProfile[] {
        return this.readConfig<ITccFanProfile[]>(filePath);
    }

    writeFanTables(fanTables: ITccFanProfile[], filePath: string = this.pathFanTables) {
        this.writeConfig<ITccFanProfile[]>(fanTables, filePath, { mode: this.fantablesFileMod });
    }

    public readConfig<T>(filename: string): T {
        let config: T;
        try {
            const fileData = fs.readFileSync(filename);
            // FIXME for some reason this actually doesn't enforce the type
            config = JSON.parse(fileData.toString());
        } catch (err) {
            throw err;
        }
        return config;
    }

    public async readConfigAsync<T>(filename: string): Promise<T> {
        let config: T;
        try {
            const fileData = await fs.promises.readFile(filename);
            config = JSON.parse(fileData.toString());
        } catch (err) {
            throw err;
        }
        return config;
    }

    public writeConfig<T>(config: T, filePath: string, writeFileOptions): void {
        const fileData = JSON.stringify(config);

        try {
            if (!fs.existsSync(path.dirname(filePath))) {
                fs.mkdirSync(path.dirname(filePath), { mode: 0o755, recursive: true });
            }
            fs.writeFileSync(filePath, fileData, writeFileOptions);
        } catch (err) {
            throw err;
        }
    }

    public async writeConfigAsync<T>(config: T, filePath: string, writeFileOptions): Promise<void> {
        const fileData = JSON.stringify(config);
        try {
            let dirStat = await fs.promises.stat(path.dirname(filePath));
            if (!dirStat.isDirectory()) {
                await fs.promises.mkdir(path.dirname(filePath), { mode: 0o755, recursive: true });
            }
            await fs.promises.writeFile(filePath, fileData, writeFileOptions);
        } catch (err) {
            throw err;
        }
    }

    public copyConfig<T>(config: T): T {
        return JSON.parse(JSON.stringify(config));
    }

    public getDefaultProfiles(device?: TUXEDODevice): ITccProfile[] {
        let deviceDefaultProfiles = deviceProfiles.get(device);
        if (deviceDefaultProfiles === undefined) {
            deviceDefaultProfiles = defaultProfiles;
        }
        return this.copyConfig<ITccProfile[]>(deviceDefaultProfiles);
    }

    public getDefaultCustomProfile(): ITccProfile {
        return this.copyConfig<ITccProfile>(defaultCustomProfile);
    }

    public getDefaultCustomProfiles(device: TUXEDODevice): ITccProfile[] {

        let defaultCustomProfiles: ITccProfile[] = deviceCustomProfiles.get(device);
        if (defaultCustomProfiles === undefined) {
            defaultCustomProfiles = [ this.getDefaultCustomProfile() ];
        }
        return this.copyConfig<ITccProfile[]>(defaultCustomProfiles);
    }

    public getDefaultSettings(device: TUXEDODevice): ITccSettings {
        let findDefaultSettings = deviceCustomSettings.get(device);
        if (findDefaultSettings === undefined) {
            findDefaultSettings = defaultSettings;
        }
        return this.copyConfig<ITccSettings>(findDefaultSettings);
    }

    public getDefaultAutosave(): ITccAutosave {
        return this.copyConfig<ITccAutosave>(defaultAutosave);
    }

    public getCustomProfilesNoThrow(device: TUXEDODevice): ITccProfile[] {
        try {
            return this.readProfiles();
        } catch (err) {
            return this.getDefaultCustomProfiles(device);
        }
    }

    public getAllProfilesNoThrow(device: TUXEDODevice): ITccProfile[] {
        return this.getDefaultProfiles().concat(this.getCustomProfilesNoThrow(device));
    }

    public getSettingsNoThrow(device: TUXEDODevice): ITccSettings {
        try {
            return this.readSettings();
        } catch (err) {
            return this.getDefaultSettings(device);
        }
    }

    public getDefaultFanProfiles(): ITccFanProfile[] {
        return this.copyConfig<ITccFanProfile[]>(defaultFanProfiles);
    }
}
