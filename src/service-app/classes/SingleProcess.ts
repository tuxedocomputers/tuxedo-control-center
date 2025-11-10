/*!
 * Copyright (c) 2019-2025 TUXEDO Computers GmbH <tux@tuxedocomputers.com>
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

import * as fs from 'node:fs';
import * as process from 'node:process';

export class SingleProcess {
    constructor(private pidPath: string) {}

    /**
     * Start process
     */
    protected async start(): Promise<boolean> {
        if (this.isRunning()) {
            return false;
        } else {
            const result: boolean = this.writePid(process.pid);
            return result;
        }
    }

    /**
     * Stop process
     */
    protected async stop(): Promise<boolean> {
        const pid: number = this.readPid();

        if (!Number.isNaN(pid)) {
            // If there is a PID in file
            if (this.isRunning()) {
                try {
                    process.kill(pid, 'SIGINT');
                } catch (err: unknown) {
                    console.error(`SingleProcess: stop failed => ${err}`);
                    return false;
                }
            }
        }

        // Stay a while... and listen, if process quits in time
        const nrRetries: number = 50;
        const retryDelay: number = 100;
        let count: number = 0;
        while (this.isRunning() && count < nrRetries) {
            await new Promise((done) => setTimeout(done, retryDelay));
            count += 1;
        }
        if (count >= nrRetries) {
            return false;
        } else {
            return true;
        }
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
        } catch (err: unknown) {
            console.error(`SingleProcess: writePid failed => ${err}`);
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
            const available: boolean = fs.existsSync(this.pidPath);
            if (available) {
                const strPid: Buffer = fs.readFileSync(this.pidPath);
                const intPid: number = Number.parseInt(strPid.toString(), 10);
                return intPid;
            }
            return Number.NaN;
        } catch (err: unknown) {
            console.error(`SingleProcess: readPid failed => ${err}`);
            return Number.NaN;
        }
    }

    /**
     * Remove pid file
     *
     * @returns True if successful, false if not or if the file does not exist
     */
    /*
    private removePid(): boolean {
        try {
            fs.unlinkSync(this.pidPath);
            return true;
        } catch (err: unknown) {
            console.error(`SingleProcess: removePid failed => ${err}`)
            return false;
        }
    }
    */

    /**
     * Check if process is running
     *
     * @returns True if PID file is found and process is running, false otherwise
     */
    private isRunning(): boolean {
        let isRunning: boolean = true;

        const intPid: number = this.readPid();
        if (Number.isNaN(intPid)) {
            isRunning = false;
        } else {
            try {
                return fs.existsSync(`/proc/${intPid}`);
            } catch (err: unknown) {
                console.error(`SingleProcess: isRunning failed => ${err}`);
                isRunning = false;
            }
        }
        return isRunning;
    }
}
