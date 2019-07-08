/**
 * Start point of TUXEDO Control Center service - initial basic concept
 */
import * as process from 'process';
import * as os from 'os';
import * as fs from 'fs';
import { SIGINT, SIGTERM } from 'constants';

// Only allow start if root
if (process.geteuid() !== 0) {
    console.log('Not root, bye');
    process.exit();
}

// Check if there is an existing PID that is running
// If so and reload is specified => gently kill existing and continue (i.e assume its place)
// If so and reload is not specified => exit
// Else this is the current process => continue

// If new config is specified replace standard config with new config

// Load standard config

// Setup signal catching/handling
process.on('SIGINT', () => {
    logLine('SIGINT');
    process.exit(SIGINT);
});

process.on('SIGTERM', () => {
    logLine('SIGTERM');
    process.exit(SIGTERM);
});

console.log('node: ' + process.version + ' arch:' + os.arch() + ' args: ' + process.argv.join());
logLine('node: ' + process.version + ' arch:' + os.arch() + ' args: ' + process.argv.join());

// Initiate normal work operation
setInterval(() => {
    // "Work loop"
}, 5000);

function logLine(text: string) {
    try {
        const date: Date = new Date();
        fs.appendFileSync('/tmp/tcc/test.log', date.toISOString() + ': ' + text + '\n');
    } catch (err) {
        console.log('Can\'t write log');
    }

}

