import { TccConfig } from '../models/TccConfig';
import { TccProfile } from '../models/TccProfile';

export class ConfigHandler {
    constructor(filenameConfig: string, filenameProfiles: string) {}
    get filenameConfig() { return this.filenameConfig; }
    set filenameConfig(filename: string) { this.filenameConfig = filename; }
    get filenameProfiles() { return this.filenameProfiles; }
    set filenameProfiles(filename: string) { this.filenameProfiles = filename; }

    readConfig(filename: string): TccConfig {return null; }
    writeConfig(filename: string, config: TccConfig): void {}
    readProfiles(filename: string): TccProfile[] { return null; }
    writeProfiles(filename: string, profile: TccProfile) {}
}