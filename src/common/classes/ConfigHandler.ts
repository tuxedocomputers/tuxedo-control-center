import * as fs from 'fs';
import * as path from 'path';
import { ITccSettings, defaultSettings } from '../models/TccSettings';
import { ITccProfile, defaultProfiles, defaultCustomProfile } from '../models/TccProfile';
import { ITccAutosave, defaultAutosave } from '../models/TccAutosave';
import { ITccFanTable, defaultFanTable } from '../models/TccFanTable';

export class ConfigHandler {
    public settingsFileMod: number;
    public profileFileMod: number;
    public autosaveFileMod: number;
    public fantablesFileMod: number;

    private loadedCustomProfiles: ITccProfile[];
    private loadedSettings: ITccSettings;

    // tslint:disable-next-line: variable-name
    constructor(private _pathSettings: string, private _pathProfiles: string, private _pathAutosave: string, private _pathFantables) {
        this.settingsFileMod = 0o644;
        this.profileFileMod = 0o644;
        this.autosaveFileMod = 0o644;
        this.fantablesFileMod = 0o644;
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

    readFanTables(filePath: string = this.pathFanTables): ITccFanTable[] {
        return this.readConfig<ITccFanTable[]>(filePath);
    }

    writeFanTables(fanTables: ITccFanTable[], filePath: string = this.pathFanTables) {
        this.writeConfig<ITccFanTable[]>(fanTables, filePath, { mode: this.fantablesFileMod });
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

    public getDefaultFanTable(): ITccFanTable {
        return this.copyConfig<ITccFanTable>(defaultFanTable);
    }
}
