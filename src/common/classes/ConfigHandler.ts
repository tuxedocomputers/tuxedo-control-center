/*!
 * Copyright (c) 2019-2025 TUXEDO Computers GmbH <tux@tuxedocomputers.com>
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

import * as fs from 'node:fs';
import * as path from 'node:path';
import { type ITccSettings, defaultSettings, deviceCustomSettings } from '../models/TccSettings';
import { generateProfileId, type ITccProfile } from '../models/TccProfile';
import { defaultProfiles } from '../models/profiles/LegacyProfiles';
import { type ITccAutosave, defaultAutosave } from '../models/TccAutosave';
import { type ITccFanProfile, defaultFanProfiles } from '../models/TccFanTable';
import {
    defaultCustomProfile,
    deviceCustomProfiles,
    deviceProfiles,
    type TUXEDODevice,
} from '../models/DefaultProfiles';
import type { WebcamPreset } from '../models/TccWebcamSettings';

export class ConfigHandler {
    public settingsFileMod: number;
    public profileFileMod: number;
    public webcamFileMod: number;
    public v4l2NamesFileMod: number;
    public autosaveFileMod: number;
    public fantablesFileMod: number;

    // tslint:disable-next-line: variable-name
    constructor(
        private _pathSettings: string,
        private _pathProfiles: string,
        private _pathWebcam: string,
        private _pathV4l2Names: string,
        private _pathAutosave: string,
        private _pathFantables: string,
    ) {
        this.settingsFileMod = 0o644;
        this.profileFileMod = 0o644;
        this.webcamFileMod = 0o644;
        this.v4l2NamesFileMod = 0o644;
        this.autosaveFileMod = 0o644;
        this.fantablesFileMod = 0o644;
    }

    public get pathSettings(): string {
        return this._pathSettings;
    }
    public set pathSettings(filename: string) {
        this._pathSettings = filename;
    }
    public get pathProfiles(): string {
        return this._pathProfiles;
    }
    public set pathProfiles(filename: string) {
        this._pathProfiles = filename;
    }
    public get pathWebcam(): string {
        return this._pathWebcam;
    }
    public set pathWebcam(filename: string) {
        this._pathWebcam = filename;
    }
    public get pathV4l2Names(): string {
        return this._pathV4l2Names;
    }
    public set pathV4l2Names(filename: string) {
        this._pathV4l2Names = filename;
    }
    public get pathAutosave(): string {
        return this._pathAutosave;
    }
    public set pathAutosave(filename: string) {
        this._pathAutosave = filename;
    }
    public get pathFanTables(): string {
        return this._pathFantables;
    }
    public set pathFanTables(filename: string) {
        this._pathFantables = filename;
    }

    public readSettings(filePath: string = this.pathSettings): ITccSettings {
        return this.readConfig<ITccSettings>(filePath);
    }

    public async readSettingsAsync(filePath: string = this.pathSettings): Promise<ITccSettings> {
        return await this.readConfigAsync<ITccSettings>(filePath);
    }

    public readWebcamSettings(filePath: string = this.pathWebcam): WebcamPreset[] {
        return this.readConfig<WebcamPreset[]>(filePath);
    }

    public readV4l2Names(filePath: string = this._pathV4l2Names): string[][] {
        return this.readConfig<string[][]>(filePath);
    }

    public writeSettings(settings: ITccSettings, filePath: string = this.pathSettings): void {
        this.writeConfig<ITccSettings>(settings, filePath, {
            mode: this.settingsFileMod,
        });
    }

    public writeWebcamSettings(settings: WebcamPreset[], filePath: string = this.pathSettings): void {
        this.writeConfig<WebcamPreset[]>(settings, filePath, {
            mode: this.settingsFileMod,
        });
    }

    public async writeSettingsAsync(settings: ITccSettings, filePath: string = this.pathSettings): Promise<void> {
        await this.writeConfigAsync<ITccSettings>(settings, filePath, { mode: this.settingsFileMod });
    }

    private recursivelyFillObject(obj: object, defaultObj: object): boolean {
        let objModified: boolean = false;
        for (const key in defaultObj) {
            if (defaultObj[key] !== undefined && obj[key] === undefined) {
                obj[key] = defaultObj[key];
                objModified = true;
            }
            if (typeof defaultObj[key] === 'object') {
                if (this.recursivelyFillObject(obj[key], defaultObj[key])) {
                    objModified = true;
                }
            }
        }
        return objModified;
    }
    public readProfiles(device: TUXEDODevice, filePath: string = this.pathProfiles): ITccProfile[] {
        let idUpdated: boolean = false;
        const profiles: ITccProfile[] = this.readConfig<ITccProfile[]>(filePath).map(
            (profile: ITccProfile): ITccProfile => {
                if (profile.id === undefined) {
                    profile.id = generateProfileId();
                    console.log(`(readProfiles) Generated id (${profile.id}) for ${profile.name}`);
                    idUpdated = true;
                }
                return profile;
            },
        );

        let valueFilledFromDefault: boolean = false;
        const defaultCustomProfiles: ITccProfile[] = this.getDefaultCustomProfiles(device);
        const defaultCustomProfilesIDs: string[] = defaultCustomProfiles.map((profile) => {
            return profile.id;
        });

        profiles.forEach((profile: ITccProfile): void => {
            let defaultCustomProfile: ITccProfile = defaultCustomProfiles[0];
            defaultCustomProfilesIDs.forEach((defaultCustomProfileID: string, index: number): void => {
                if (profile.id === defaultCustomProfileID) {
                    defaultCustomProfile = defaultCustomProfiles[index];
                }
            });

            if (this.recursivelyFillObject(profile, defaultCustomProfile)) {
                valueFilledFromDefault = true;
            }
        });

        if (idUpdated || valueFilledFromDefault) {
            this.writeProfiles(profiles);
            console.log(`Saved updated profiles`);
        }

        return profiles;
    }

    public writeProfiles(profiles: ITccProfile[], filePath: string = this.pathProfiles): void {
        this.writeConfig<ITccProfile[]>(profiles, filePath, { mode: this.profileFileMod });
    }

    public readAutosave(filePath: string = this.pathAutosave): ITccAutosave {
        return this.readConfig<ITccAutosave>(filePath);
    }

    public writeAutosave(autosave: ITccAutosave, filePath: string = this.pathAutosave): void {
        this.writeConfig<ITccAutosave>(autosave, filePath, { mode: this.autosaveFileMod });
    }

    public readFanTables(filePath: string = this.pathFanTables): ITccFanProfile[] {
        return this.readConfig<ITccFanProfile[]>(filePath);
    }

    public writeFanTables(fanTables: ITccFanProfile[], filePath: string = this.pathFanTables): void {
        this.writeConfig<ITccFanProfile[]>(fanTables, filePath, { mode: this.fantablesFileMod });
    }

    public readConfig<T>(filename: string): T {
        let config: T;
        try {
            const fileData: Buffer = fs.readFileSync(filename);
            // FIXME for some reason this actually doesn't enforce the type
            config = JSON.parse(fileData.toString());
        } catch (err: unknown) {
            console.error(`ConfigHandler: readConfig failed to read ${filename} => ${err}`);
            throw err;
        }
        return config;
    }

    public async readConfigAsync<T>(filename: string): Promise<T> {
        let config: T;
        try {
            const fileData: Buffer = await fs.promises.readFile(filename);
            config = JSON.parse(fileData.toString());
        } catch (err: unknown) {
            console.error(`ConfigHandler: readConfigAsync failed to read ${filename} => ${err}`);
            throw err;
        }
        return config;
    }

    public writeConfig<T>(config: T, filePath: string, writeFileOptions: fs.WriteFileOptions): void {
        const fileData: string = JSON.stringify(config);

        try {
            if (!fs.existsSync(path.dirname(filePath))) {
                fs.mkdirSync(path.dirname(filePath), { mode: 0o755, recursive: true });
            }
            fs.writeFileSync(filePath, fileData, writeFileOptions);
        } catch (err: unknown) {
            console.error(`ConfigHandler: writeConfig failed => ${err}`);
            throw err;
        }
    }

    public async writeConfigAsync<T>(
        config: T,
        filePath: string,
        writeFileOptions: fs.WriteFileOptions,
    ): Promise<void> {
        const fileData: string = JSON.stringify(config);
        try {
            const dirStat: fs.Stats = await fs.promises.stat(path.dirname(filePath));
            if (!dirStat.isDirectory()) {
                await fs.promises.mkdir(path.dirname(filePath), { mode: 0o755, recursive: true });
            }
            await fs.promises.writeFile(filePath, fileData, writeFileOptions);
        } catch (err: unknown) {
            console.error(`ConfigHandler: writeConfigAsync failed => ${err}`);
            throw err;
        }
    }

    public copyConfig<T>(config: T): T {
        return JSON.parse(JSON.stringify(config));
    }

    public getDefaultProfiles(device?: TUXEDODevice): ITccProfile[] {
        let deviceDefaultProfiles: ITccProfile[] = deviceProfiles.get(device);
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
            defaultCustomProfiles = [this.getDefaultCustomProfile()];
        }
        return this.copyConfig<ITccProfile[]>(defaultCustomProfiles);
    }

    public getDefaultSettings(device: TUXEDODevice): ITccSettings {
        let findDefaultSettings: ITccSettings = deviceCustomSettings.get(device);
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
            return this.readProfiles(device);
        } catch (err: unknown) {
            console.error(`ConfigHandler: getCustomProfilesNoThrow failed => ${err}`);
            return this.getDefaultCustomProfiles(device);
        }
    }

    public getAllProfilesNoThrow(device: TUXEDODevice): ITccProfile[] {
        return this.getDefaultProfiles().concat(this.getCustomProfilesNoThrow(device));
    }

    public getSettingsNoThrow(device: TUXEDODevice): ITccSettings {
        try {
            return this.readSettings();
        } catch (err: unknown) {
            console.error(`ConfigHandler: getSettingsNoThrow failed => ${err}`);
            return this.getDefaultSettings(device);
        }
    }

    public getDefaultFanProfiles(): ITccFanProfile[] {
        return this.copyConfig<ITccFanProfile[]>(defaultFanProfiles);
    }
}
