import * as fs from 'fs';
import * as os from 'os';
import { SIGINT, SIGTERM } from 'constants';
import { SingleProcess } from './SingleProcess';

const PATHS = {
    PID_FILE: '/var/run/tccd.pid',
    CONFIG_FILE: '/etc/tcc/settings',
    PROFILES_FILE: '/etc/tcc/profiles',
};

export class TuxedoControlCenterDaemon extends SingleProcess {

    constructor() {
        super(PATHS.PID_FILE);
    }

    async main() {

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

        console.log('node: ' + process.version + ' arch:' + os.arch() + ' args: ' + process.argv.join());
        this.logLine('node: ' + process.version + ' arch:' + os.arch() + ' args: ' + process.argv.join());

        // Setup signal catching/handling
        process.on('SIGINT', () => {
            this.logLine('SIGINT');
            process.exit(SIGINT);
        });

        process.on('SIGTERM', () => {
            this.logLine('SIGTERM');
            process.exit(SIGTERM);
        });

        // TODO: Config logic
        // If new config is specified, replace standard config with new config
        // Read current config and apply settings accordingly

        // Do some work..
        while (true) {
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
    }

    catchError(err: Error) {
        console.log(err.name + ': ' + err.message);
        process.exit();
    }

    /**
     * Temporary test log function
     *
     * @param text Text to log
     */
    logLine(text: string) {
        try {
            const date: Date = new Date();
            fs.appendFileSync('/tmp/tcc/test.log', date.toISOString() + ': ' + text + '\n');
        } catch (err) {
            console.log('Can\'t write log');
        }
    }
}
