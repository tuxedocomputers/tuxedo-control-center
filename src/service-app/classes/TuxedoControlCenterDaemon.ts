import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { SIGINT, SIGTERM } from 'constants';
import { SingleProcess } from './SingleProcess';
import { TccPaths } from '../../common/classes/TccPaths';
import { ConfigHandler } from '../../common/classes/ConfigHandler';
import { TccSettings } from '../../common/models/TccSettings';
import { TccProfile } from '../../common/models/TccProfile';

export class TuxedoControlCenterDaemon extends SingleProcess {

    private config = new ConfigHandler(TccPaths.SETTINGS_FILE, TccPaths.PROFILES_FILE);

    private settings: TccSettings;
    private profiles: TccProfile[];

    constructor() {
        super(TccPaths.PID_FILE);
    }

    async main() {
        if (process.argv.includes('--version')) {
            console.log('node: ' + process.version + ' arch:' + os.arch());
            this.logLine('node: ' + process.version + ' arch:' + os.arch());
            process.exit();
        }

        // Only allow start if root
        if (process.geteuid() !== 0) {
            throw Error('Not root, bye');
        }

        if (process.argv.includes('--start')) {
            if (!await this.start()) {
                throw Error('Couldn\'t start daemon. It is probably already running');
            }
        } else if (process.argv.includes('--stop')) {
            if (await this.stop()) {
                console.log('Daemon is stopped');
            } else {
                throw Error('Failed to stop');
            }
            process.exit();
        } else if (process.argv.includes('--reload')) {
            if (!await this.reload()) {
                throw Error('Failed reload');
            }
        } else {
            throw Error('No argument specified');
        }

        // Setup signal catching/handling
        process.on('SIGINT', () => {
            this.logLine('SIGINT');
            process.exit(SIGINT);
        });

        process.on('SIGTERM', () => {
            this.logLine('SIGTERM');
            process.exit(SIGTERM);
        });

        // If new config is specified, replace standard config with new config
        this.saveNewConfig<TccSettings>('--new_settings', this.config.readSettings, this.config.writeSettings);
        this.saveNewConfig<TccProfile[]>('--new_profiles', this.config.readProfiles, this.config.writeProfiles);

        // TODO:
        // Read current config and apply settings accordingly
        try {
            this.settings = this.config.readSettings();
        } catch (err) {

        }

        // Do some work..
        while (true) {
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
    }

    catchError(err: Error) {
        console.log(err.name + ': ' + err.message);
        process.exit();
    }

    private saveNewConfig<T>(optionString: string, readConfig: (filePath: string) => T, writeConfig: (config: T) => void) {
        const newConfigIndex = process.argv.indexOf(optionString);
        const lastIndex = (process.argv.length - 1);
        // If option is set and there is an argument after the option
        if (newConfigIndex !== -1 && ((newConfigIndex + 1) <= lastIndex)) {
            const newConfigPath = process.argv[newConfigIndex + 1];
            try {
                const newSettings: T = readConfig(newConfigPath);
                try {
                    writeConfig(newSettings);
                } catch (err) {
                    this.logLine('Error on write option ' + optionString);
                }
            } catch (err) {
                this.logLine('Error on read option ' + optionString + ' with path: ' + newConfigPath);
            }
        }
    }

    /**
     * Temporary test log function
     *
     * @param text Text to log
     */
    logLine(text: string) {
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
