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

export class UserConfig {
    private data: object;
    private inProgress: boolean = false;

    constructor(private configFile: string) {
        if (configFile === undefined) {
            throw Error('No config path defined');
        }

        this.validateValues();
    }

    private async setInProgress(): Promise<void> {
        while (this.inProgress)
            await new Promise<void>((resolve: () => void): NodeJS.Timeout => setTimeout(resolve, 10));
        this.inProgress = true;
    }

    private async setProgressDone(): Promise<void> {
        this.inProgress = false;
    }

    public async set(property: string, value: string): Promise<void> {
        await this.setInProgress();
        try {
            await this.readConfig();
        } catch (err: unknown) {
            console.error(`UserConfig: set failed => ${err}`);

            // todo: error handling
            if ((err as NodeJS.ErrnoException)?.code === 'ENOENT') {
                console.log(`Config file (${this.configFile}) does not exist and will be created.`);
            } else {
                await this.setProgressDone();
                throw err;
            }
        }
        this.data[property] = value;
        await this.writeConfig();
        await this.setProgressDone();
    }

    public async get(property: string): Promise<string> {
        await this.setInProgress();
        try {
            await this.readConfig();
        } catch (err: unknown) {
            console.error(`UserConfig: get failed => ${err}`);

            // todo: error handling
            if ((err as NodeJS.ErrnoException)?.code !== 'ENOENT') {
                await this.setProgressDone();
                throw err;
            }
        }
        await this.setProgressDone();
        return this.data[property];
    }

    private async writeConfig(): Promise<void> {
        return new Promise<void>(
            (resolve: (value: void | PromiseLike<void>) => void, reject: (reason?: unknown) => void): void => {
                fs.writeFile(this.configFile, JSON.stringify(this.data), (err: unknown): void => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve();
                    }
                });
            },
        );
    }

    private async readConfig(): Promise<void> {
        return new Promise<void>(
            (resolve: (value: void | PromiseLike<void>) => void, reject: (reason?: unknown) => void): void => {
                fs.readFile(this.configFile, (err: unknown, data: Buffer): void => {
                    if (err) {
                        reject(err);
                    }

                    try {
                        this.data = JSON.parse(data.toString());
                        this.validateValues();
                        resolve();
                    } catch (err: unknown) {
                        console.error(`UserConfig: readConfig failed => ${err}`);
                        this.data = {};
                    }
                });
            },
        );
    }

    private validateValues(): void {
        if (this.data === undefined) {
            this.data = JSON.parse('{}');
        }
    }
}
