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
import * as fs from 'fs';
import * as path from 'path';
import { ITccSettings, defaultSettings } from '../models/TccSettings';
import { ITccProfile, defaultProfiles, defaultCustomProfile, defaultCustomProfileXP1508UHD } from '../models/TccProfile';
import { ITccAutosave, defaultAutosave } from '../models/TccAutosave';
import { ITccFanProfile } from '../models/TccFanTable';

export class ConfigHandler {
    public settingsFileMod: number;
    public profileFileMod: number;
    public autosaveFileMod: number;
    public fantablesFileMod: number;

    private fanTables: ITccFanProfile[];

    private loadedCustomProfiles: ITccProfile[];
    private loadedSettings: ITccSettings;

    // tslint:disable-next-line: variable-name
    constructor(private _pathSettings: string, private _pathProfiles: string, private _pathAutosave: string, private _pathFantables) {
        this.settingsFileMod = 0o644;
        this.profileFileMod = 0o644;
        this.autosaveFileMod = 0o644;
        this.fantablesFileMod = 0o644;

        this.fanTables = this.readFanTables();
    }

    get pathSettings() { return this._pathSettings; }
    set pathSettings(filename: string) { this._pathSettings = filename; }
    get pathProfiles() { return this._pathProfiles; }
    set pathProfiles(filename: string) { this._pathProfiles = filename; }
    get pathAutosave() { return this._pathAutosave; }
    set pathAutosave(filename: string) { this._pathAutosave = filename; }
    get pathFanTables() { return this._pathFantables; }
    set pathFanTables(filename: string) { this._pathFantables = filename; }

    readSettings(filePath: string = this.pathSettings): ITccSettings {
        return this.readConfig<ITccSettings>(filePath);
    }

    writeSettings(settings: ITccSettings, filePath: string = this.pathSettings) {
        this.writeConfig<ITccSettings>(settings, filePath, { mode: this.settingsFileMod });
    }

    readProfiles(filePath: string = this.pathProfiles): ITccProfile[] {
        return this.readConfig<ITccProfile[]>(filePath);
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

    private createFanProfile(name: string, rows): ITccFanProfile {
        return {
            name: name,
            tableCPU: rows.map(row => ({"temp": row[0], "speed": row[1]})),
            tableGPU: rows.map(row => ({"temp": row[0], "speed": row[2]}))
        }
    }

    readFanTables(filePath: string = this.pathFanTables): ITccFanProfile[] {
        const lines = fs.readFileSync(filePath, 'utf-8').split('\n');
        let currentProfile = null;
        let currentRows = [];
        let profiles = [];
        const blankLineRegex = /^\s*(#.*)?$/
        const sectionLineRegex = /^\s*\[([^\]]+)\]\s*(#.*)?$/
        const rowLineRegex = /^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(#.*)?$/
        let match
        for(const [i, line] of lines.entries()) {
            if(blankLineRegex.test(line)) {
                continue;
            } else if((match = rowLineRegex.exec(line)) !== null) {
                if(currentProfile === null) {
                    throw Error(`syntax error on line ${i+1} reading fan profiles from "${filePath}"`);
                }
                currentRows.push([parseInt(match[1]), parseInt(match[2]), parseInt(match[3])]);
            } else if((match = sectionLineRegex.exec(line)) !== null) {
                if(currentProfile !== null) {
                    profiles.push(this.createFanProfile(currentProfile, currentRows));
                    currentRows = [];
                }
                currentProfile = match[1];
            } else {
                throw Error(`syntax error on line ${i+1} reading fan profiles from "${filePath}"`);
            }
        }
        if(currentProfile !== null) {
            profiles.push(this.createFanProfile(currentProfile, currentRows));
        }
        return profiles;
    }

    writeFanTables(fanTables: ITccFanProfile[], filePath: string = this.pathFanTables) {
        let lines = [];
        for(var profile of fanTables) {
            lines.push(`[${profile.name}]`)
            if(profile.tableCPU.length !== profile.tableGPU.length) {
                throw Error("invalid fan profile. CPU and GPU table length mismatch");
            }
            for(var i = 0; i < profile.tableCPU.length; i++) {
                let cpu_entry = profile.tableCPU[i];
                let gpu_entry = profile.tableGPU[i];
                if(cpu_entry.temp !== gpu_entry.temp) {
                    throw Error("invalid fan profile. Temperatures don't match");
                }
                lines.push(`${cpu_entry.temp},${cpu_entry.speed},${gpu_entry.speed}`)
            }
            lines.push('');
        }
        this.fanTables = fanTables;
        let data = lines.join('\n');
        this.writeFile(data, filePath, { mode: this.fantablesFileMod });
    }

    public readConfig<T>(filename: string): T {
        let config: T;
        try {
            const fileData = fs.readFileSync(filename);
            config = JSON.parse(fileData.toString());
        } catch (err) {
            throw err;
        }
        return config;
    }

    public writeConfig<T>(config: T, filePath: string, writeFileOptions): void {
        this.writeFile(JSON.stringify(config), filePath, writeFileOptions);
    }

    private writeFile(fileData: string, filePath: string, writeFileOptions): void {
        try {
            if (!fs.existsSync(path.dirname(filePath))) {
                fs.mkdirSync(path.dirname(filePath), { mode: 0o755, recursive: true });
            }
            fs.writeFileSync(filePath, fileData, writeFileOptions);
        } catch (err) {
            throw err;
        }
    }

    public copyConfig<T>(config: T): T {
        return JSON.parse(JSON.stringify(config));
    }

    public getDefaultProfiles(): ITccProfile[] {
        return this.copyConfig<ITccProfile[]>(defaultProfiles);
    }

    public getDefaultCustomProfile(): ITccProfile {
        return this.copyConfig<ITccProfile>(defaultCustomProfile);
    }

    public getDefaultCustomProfiles(): ITccProfile[] {
        return [
            this.getDefaultCustomProfile()
        ];
    }

    public getDefaultSettings(): ITccSettings {
        return this.copyConfig<ITccSettings>(defaultSettings);
    }

    public getDefaultAutosave(): ITccAutosave {
        return this.copyConfig<ITccAutosave>(defaultAutosave);
    }

    public getCustomProfilesNoThrow(): ITccProfile[] {
        try {
            return this.readProfiles();
        } catch (err) {
            return this.getDefaultCustomProfiles();
        }
    }

    public getAllProfilesNoThrow(): ITccProfile[] {
        return this.getDefaultProfiles().concat(this.getCustomProfilesNoThrow());
    }

    public getSettingsNoThrow(): ITccSettings {
        try {
            return this.readSettings();
        } catch (err) {
            return this.getDefaultSettings();
        }
    }

    public getFanProfiles(): ITccFanProfile[] {
        return this.copyConfig<ITccFanProfile[]>(this.fanTables);
    }

}
