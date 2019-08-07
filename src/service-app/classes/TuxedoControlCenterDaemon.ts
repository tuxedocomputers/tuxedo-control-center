import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as child_process from 'child_process';
import { SIGINT, SIGTERM } from 'constants';
import { SingleProcess } from './SingleProcess';
import { TccPaths } from '../../common/classes/TccPaths';
import { ConfigHandler } from '../../common/classes/ConfigHandler';
import { ITccSettings, defaultSettings } from '../../common/models/TccSettings';
import { ITccProfile, defaultProfiles } from '../../common/models/TccProfile';
import { DaemonWorker } from './DaemonWorker';
import { DisplayBacklightWorker } from './DisplayBacklightWorker';
import { CpuWorker } from './CpuWorker';
import { ITccAutosave, defaultAutosave } from '../../common/models/TccAutosave';

export class TuxedoControlCenterDaemon extends SingleProcess {

    static readonly CMD_RESTART_SERVICE = 'systemctl restart tccd.service';
    static readonly CMD_START_SERVICE = 'systemctl start tccd.service';
    static readonly CMD_STOP_SERVICE = 'systemctl stop tccd.service';

    private config: ConfigHandler;

    public settings: ITccSettings;
    public profiles: ITccProfile[];
    public autosave: ITccAutosave;

    private workers: DaemonWorker[] = [];

    constructor() {
        super(TccPaths.PID_FILE);
        this.config = new ConfigHandler(TccPaths.SETTINGS_FILE, TccPaths.PROFILES_FILE, TccPaths.AUTOSAVE_FILE);
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
            // Start daemon as this process
            if (!await this.start()) {
                throw Error('Couldn\'t start daemon. It is probably already running');
            } else {
                this.logLine('Starting daemon..');
            }
        } else if (process.argv.includes('--stop')) {
            // Signal running process to stop
            this.logLine('Stopping daemon..');
            if (await this.stop()) {
                this.logLine('Daemon is stopped');
                process.exit(0);
            } else {
                throw Error('Failed to stop daemon');
            }
        } else if (process.argv.includes('--new_settings') || process.argv.includes('--new_profiles')) {
            // If new config is specified, replace standard config with new config
            const settingsSaved = this.saveNewConfig<ITccSettings>('--new_settings', this.config.pathSettings, this.config.settingsFileMod);
            const profilesSaved = this.saveNewConfig<ITccProfile[]>('--new_profiles', this.config.pathProfiles, this.config.profileFileMod);
            // If something changed, restart running service
            if (settingsSaved || profilesSaved) {
                child_process.exec(TuxedoControlCenterDaemon.CMD_RESTART_SERVICE);
            }
            process.exit(0);
        } else {
            throw Error('No argument specified');
        }

        // Setup signal catching/handling
        // SIGINT is the normal exit signal that the service gets from itself
        process.on('SIGINT', () => {
            this.logLine('SIGINT - Exiting');
            this.onExit();
            process.exit(0);
        });

        // Also stop on SIGTERM
        process.on('SIGTERM', () => {
            this.logLine('SIGTERM - Exiting');
            this.onExit();
            process.exit(SIGTERM);
        });

        try {
            this.settings = this.config.readSettings();
        } catch (err) {
            this.logLine('Failed to read settings: ' + this.config.pathSettings);
            this.settings = JSON.parse(JSON.stringify(defaultSettings));
            try {
                this.config.writeSettings(this.settings);
                this.logLine('Wrote default settings: ' + this.config.pathSettings);
            } catch (err) {
                this.logLine('Failed to write default settings: ' + this.config.pathSettings);
            }
        }

        try {
            this.profiles = this.config.readProfiles();
        } catch (err) {
            this.profiles = [];
            this.logLine('Failed to read profiles: ' + this.config.pathProfiles);
            try {
                this.config.writeProfiles([]);
                this.logLine('Wrote default profiles: ' + this.config.pathProfiles);
            } catch (err) {
                this.logLine('Failed to write default profiles: ' + this.config.pathProfiles);
            }
        }

        try {
            this.autosave = this.config.readAutosave();
        } catch (err) {
            this.logLine('Failed to read autosave: ' + this.config.pathAutosave);
            // It probably doesn't exist yet so create a structure for saving
            this.autosave = defaultAutosave;
        }

        this.logLine('Daemon started');

        this.workers.push(new DisplayBacklightWorker(this));
        this.workers.push(new CpuWorker(this));

        this.workers.forEach((worker) => {
            // Start event for each worker
            try {
                worker.onStart();
            } catch (err) {
                this.logLine(err);
            }

            // Continuous work for each worker with individual interval
            worker.timer = setInterval(() => {
                try {
                    worker.onWork();
                } catch (err) {
                    this.logLine(err);
                }
            }, worker.timeout);
        });

    }

    catchError(err: Error) {
        const errorLine = err.name + ': ' + err.message;
        this.logLine(errorLine);
        this.onExit();
        process.exit();
    }

    onExit() {
        this.workers.forEach((worker) => {
            clearInterval(worker.timer);
        });
        this.workers.forEach((worker) => {
            // On exit events for each worker before exiting and saving settings
            try {
                worker.onExit();
            } catch (err) {
                this.logLine(err);
            }
        });
        this.config.writeAutosave(this.autosave);
    }

    getAllProfiles() {
        return defaultProfiles.concat(this.profiles);
    }

    getCurrentProfile() {
        return this.getAllProfiles().find((profile) => profile.name === this.settings.activeProfileName);
    }

    /**
     * Save config path from argument to the specified target location, basically copying the config.
     *
     * @param optionString      Command line option string that preced the source path
     * @param targetConfigPath  Path to copy config to
     * @param writeFileMode     Access rights for target file
     *
     * @returns True if file is correctly parsed and written, false otherwise
     */
    private saveNewConfig<T>(optionString: string, targetConfigPath: string, writeFileMode: number) {
        const newConfigPath = this.getPathArgument(optionString);
        if (newConfigPath !== '') {
            try {
                const newConfig: T = this.config.readConfig<T>(newConfigPath);
                try {
                    this.config.writeConfig<T>(newConfig, targetConfigPath, { mode: writeFileMode });
                } catch (err) {
                    this.logLine('Error on write option ' + optionString);
                    return false;
                }
            } catch (err) {
                this.logLine('Error on read option ' + optionString + ' with path: ' + newConfigPath);
                return false;
            }
            return true;
        } else {
            return false;
        }
    }

    /**
     * Parse the command line arguments looking for a string and fetching the next argument
     *
     * @param optionString  Command line option string that preced the argument with
     *                      the sought data
     * @returns The argument following the argument matching optionString
     */
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
    public logLine(text: string) {
        console.log(text);
        try {
            const logPath = '/tmp/tcc/test.log';
            if (!fs.existsSync(path.dirname(logPath))) {
                fs.mkdirSync(path.dirname(logPath), { recursive: true });
            }
            const date: Date = new Date();
            const lineInfo: string = date.toLocaleDateString() + ' ' + date.toLocaleTimeString() + ' (' + process.pid + '): ';
            const strLogLine = lineInfo + text + '\n';
            fs.appendFileSync(logPath, strLogLine, { mode: 0o644 });
        } catch (err) {
            console.log('Can\'t write log');
        }
    }
}
