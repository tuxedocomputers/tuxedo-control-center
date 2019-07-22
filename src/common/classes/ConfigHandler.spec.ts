import 'jasmine';
const mock = require('mock-fs');
import * as fs from 'fs';
import * as path from 'path';

import { ConfigHandler } from './ConfigHandler';
import { TccSettings } from '../models/TccSettings';
import { TccProfile } from '../models/TccProfile';
import { TccPaths } from './TccPaths';

describe('', () => {
    beforeEach(() => {
        mock({
            '/etc': {}
        });
    });

    afterEach(() => {
        mock.restore();
    });

    it('should start without configs or folder', () => {
        expect(fs.existsSync(path.dirname(TccPaths.SETTINGS_FILE))).toBe(false);
        expect(fs.existsSync(TccPaths.SETTINGS_FILE)).toBe(false);
        expect(fs.existsSync(TccPaths.PROFILES_FILE)).toBe(false);
    });

    it('should write and read settings', () => {
        const config = new ConfigHandler(TccPaths.SETTINGS_FILE, TccPaths.PROFILES_FILE);
        const settings = new TccSettings();
        settings.activeProfileName = 'p1';
        let result = true;
        try {
            config.writeSettings(settings);
        } catch (err) {
            result = false;
        }
        expect(result).toBe(true);

        let readSettings: TccSettings;
        result = true;
        try {
            readSettings = config.readSettings();
        } catch (err) {
            result = false;
        }
        expect(result).toBe(true);
        expect(readSettings.activeProfileName).toEqual('p1');
    });
});

mock.restore();
