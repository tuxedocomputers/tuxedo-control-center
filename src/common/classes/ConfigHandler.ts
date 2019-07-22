import * as fs from 'fs';
import * as path from 'path';
import { TccSettings } from '../models/TccSettings';
import { TccProfile } from '../models/TccProfile';

export class ConfigHandler {
    private settingsFileMod: number;
    private profileFileMod: number;

    constructor(private _pathSettings: string, private _pathProfiles: string) {
        this.settingsFileMod = 0o644;
        this.profileFileMod = 0o644;
    }

    get pathSettings() { return this._pathSettings; }
    set pathSettings(filename: string) { this._pathSettings = filename; }
    get pathProfiles() { return this._pathProfiles; }
    set pathProfiles(filename: string) { this._pathProfiles = filename; }

    readSettings() {
        return this.readConfig<TccSettings>(this.pathSettings);
    }

    writeSettings(settings: TccSettings) {
        this.writeConfig<TccSettings>(settings, this.pathSettings, { mode: this.settingsFileMod });
    }

    readProfiles() {
        return this.readConfig<TccProfile[]>(this.pathProfiles);
    }

    writeProfiles(profiles: TccProfile[]) {
        this.writeConfig<TccProfile[]>(profiles, this.pathProfiles, { mode: this.profileFileMod });
    }

    private readConfig<T>(filename: string): T {
        let config: T;
        try {
            const fileData = fs.readFileSync(filename);
            config = JSON.parse(fileData.toString());
        } catch (err) {
            throw err;
        }
        return config;
    }

    private writeConfig<T>(config: T, filePath: string, writeFileOptions): void {
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
