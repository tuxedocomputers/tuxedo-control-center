/*!
 * Copyright (c) 2019 TUXEDO Computers GmbH <tux@tuxedocomputers.com>
 *
 * This file is part of TUXEDO Control Center.
 *
 * TUXEDO Control Center is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * TUXEDO Control Center is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with TUXEDO Control Center.  If not, see <https://www.gnu.org/licenses/>.
 */
import * as fs from 'fs';
import * as process from 'process';

export class SingleProcess {

    constructor(private pidPath: string) { }

    /**
     * Start process
     */
    protected async start(): Promise<boolean> {
        return new Promise<boolean>(resolve => {
            if (this.isRunning()) {
                resolve(false);
            } else {
                const result = this.writePid(process.pid);
                resolve(result);
            }
        });
    }

    /**
     * Stop process
     */
    protected async stop(): Promise<boolean> {
        return new Promise<boolean>(async resolve => {
            const pid = this.readPid();

            if (!isNaN(pid)) { // If there is a PID in file
                if (this.isRunning()) {
                    try {
                        process.kill(pid, 'SIGINT');
                    } catch (err) {
                        resolve(false);
                    }
                }
            }

            // Stay a while... and listen, if process quits in time
            const nrRetries = 50;
            const retryDelay = 100;
            let count = 0;
            while (this.isRunning() && count < nrRetries) { await new Promise(done => setTimeout(done, retryDelay)); count += 1; }
            if (count >= nrRetries) {
                resolve(false);
            } else {
                resolve(true);
            }
        });
    }

    /**
     * Write pid file
     *
     * @param pid Process ID number
     *
     * @returns True if write was successful, false otherwise
     */
    private writePid(pid: number): boolean {
        try {
            fs.writeFileSync(this.pidPath, pid.toString());
            return true;
        } catch (err) {
            return false;
        }
    }

    /**
     * Read pid file
     *
     * @returns Process ID number if found, NaN if not
     */
    protected readPid(): number {
        try {
            const strPid = fs.readFileSync(this.pidPath);
            const intPid = parseInt(strPid.toString(), 10);
            return intPid;
        } catch (err) {
            return Number.NaN;
        }
    }

    /**
     * Remove pid file
     *
     * @returns True if successful, false if not or if the file does not exist
     */
    private removePid(): boolean {
        try {
            fs.unlinkSync(this.pidPath);
            return true;
        } catch (err) {
            return false;
        }
    }

    /**
     * Check if process is running
     *
     * @returns True if PID file is found and process is running, false otherwise
     */
    private isRunning(): boolean {
        let isRunning = true;

        const intPid = this.readPid();
        if (isNaN(intPid)) {
            isRunning = false;
        } else {
            // There is a number in the file, now check if it's really in use
            try {
                process.kill(intPid, 0);
            } catch (err) {
                isRunning = false;
            }
        }
        return isRunning;
    }
}
