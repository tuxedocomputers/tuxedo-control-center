import * as fs from 'fs';
import * as path from 'path';
import { ITccSettings } from '../models/TccSettings';
import { ITccProfile } from '../models/TccProfile';

export class ConfigHandler {
    public settingsFileMod: number;
    public profileFileMod: number;

    // tslint:disable-next-line: variable-name
    constructor(private _pathSettings: string, private _pathProfiles: string) {
        this.settingsFileMod = 0o644;
        this.profileFileMod = 0o644;
    }

    get pathSettings() { return this._pathSettings; }
    set pathSettings(filename: string) { this._pathSettings = filename; }
    get pathProfiles() { return this._pathProfiles; }
    set pathProfiles(filename: string) { this._pathProfiles = filename; }

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
}
