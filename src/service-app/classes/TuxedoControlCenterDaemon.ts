import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as child_process from 'child_process';
import { SIGINT, SIGTERM } from 'constants';
import { SingleProcess } from './SingleProcess';
import { TccPaths } from '../../common/classes/TccPaths';
import { ConfigHandler } from '../../common/classes/ConfigHandler';
import { TccSettings } from '../../common/models/TccSettings';
import { TccProfile } from '../../common/models/TccProfile';

export class TuxedoControlCenterDaemon extends SingleProcess {

    private config: ConfigHandler;

    private settings: TccSettings;
    private profiles: TccProfile[];

    constructor() {
        super(TccPaths.PID_FILE);
        this.config = new ConfigHandler(TccPaths.SETTINGS_FILE, TccPaths.PROFILES_FILE);
    }

    async main() {
        if (process.argv.includes('--version')) {
            console.log('node: ' + process.version + ' arch:' + os.arch());
            this.logLine('node: ' + process.version + ' arch:' + os.arch());
            process.exit();
        }

        // Only allow to continue if root
        if (process.geteuid() !== 0) {
            throw Error('Not root, bye');
        }

        if (process.argv.includes('--start')) {
            if (!await this.start()) {
                throw Error('Couldn\'t start daemon. It is probably already running');
            } else {
                this.logLine('Starting daemon..');
            }
        } else if (process.argv.includes('--stop')) {
            this.logLine('Stopping daemon..');
            if (await this.stop()) {
                this.logLine('Daemon is stopped');
                process.exit(0);
            } else {
                throw Error('Failed to stop daemon');
            }
        } else if (process.argv.includes('--new_settings') || process.argv.includes('--new_profiles')) {
            // If new config is specified, replace standard config with new config
            this.saveNewConfig<TccSettings>('--new_settings', this.config.pathSettings, this.config.settingsFileMod);
            this.saveNewConfig<TccProfile[]>('--new_profiles', this.config.pathProfiles, this.config.profileFileMod);
            // Restart service
            child_process.exec('systemctl restart tccd.service');
            process.exit(0);
        } else {
            throw Error('No argument specified');
        }

        // Setup signal catching/handling
        // SIGINT is the normal exit signal that the service gets from itself
        process.on('SIGINT', () => {
            this.logLine('SIGINT - Exiting');
            process.exit(0);
        });

        // Also stop on SIGTERM
        process.on('SIGTERM', () => {
            this.logLine('SIGTERM - Exiting');
            process.exit(SIGTERM);
        });

        // TODO: Make sure there is a default config

        /*try {
            this.settings = this.config.readSettings();
        } catch (err) {
            this.logLine('Failed to read settings');
            throw Error('Failed to read settings');
        }
        try {
            this.profiles = this.config.readProfiles();
        } catch (err) {
            this.logLine('Failed to read profiles');
            throw Error('Failed to read profiles');
        }*/

        // TODO: Apply active profile accordingly

        this.logLine('Daemon started');

        // Do some work..
        while (true) {
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
    }

    catchError(err: Error) {
        const errorLine = err.name + ': ' + err.message;
        this.logLine(errorLine);
        process.exit();
    }

    private saveNewConfig<T>(optionString: string, configPath: string, writeFileMode: number) {
        const newConfigPath = this.getPathArgument(optionString);
        if (newConfigPath !== '') {
            try {
                const newConfig: T = this.config.readConfig<T>(newConfigPath);
                try {
                    this.config.writeConfig<T>(newConfig, configPath, { mode: writeFileMode });
                } catch (err) {
                    this.logLine('Error on write option ' + optionString);
                }
            } catch (err) {
                this.logLine('Error on read option ' + optionString + ' with path: ' + newConfigPath);
                throw err;
            }
        }
    }

    private getPathArgument(optionString: string): string {
        const newConfigIndex = process.argv.indexOf(optionString);
        const lastIndex = (process.argv.length - 1);
        // If option is set and there is an argument after the option
        if (newConfigIndex !== -1 && ((newConfigIndex + 1) <= lastIndex)) {
            const newConfigPath = process.argv[newConfigIndex + 1];
            newConfigPath.replace('\'', '');
            return newConfigPath.trim();
        } else {
            return '';
        }
    }

    /**
     * Temporary test log function
     *
     * @param text Text to log
     */
    logLine(text: string) {
        console.log(text);
        try {
            const logPath = '/tmp/tcc/test.log';
            if (!fs.existsSync(path.dirname(logPath))) {
                fs.mkdirSync(path.dirname(logPath), { mode: 0o755, recursive: true });
            }
            const date: Date = new Date();
            const strLogLine = date.toLocaleDateString() + ' ' + date.toLocaleTimeString() + ': ' + text + '\n';
            fs.appendFileSync(logPath, strLogLine, { mode: 0o644 });
        } catch (err) {
            console.log('Can\'t write log');
        }
    }
}
