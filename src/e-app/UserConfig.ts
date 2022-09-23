/*!
 * Copyright (c) 2022 TUXEDO Computers GmbH <tux@tuxedocomputers.com>
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

export class UserConfig {
    private data: object;

    constructor(private configFile: string) {
        if (configFile === undefined) { throw Error('No config path defined'); }

        this.validateValues();
    }

    public async set(property: string, value: string) {
        try {
            await this.readConfig();
        } catch (err) {
            if (err.code === 'ENOENT') {
                console.log('Config file (' + this.configFile + ') does not exist. Will be created.');
            } else {
                throw err;
            }
        }
        this.data[property] = value;
        await this.writeConfig();
    }

    public async get(property: string): Promise<string> {
        try {
            await this.readConfig();
        } catch (err) {
            if (err.code !== 'ENOENT') {
                throw err;
            }
        }
        return this.data[property];
    }

    private async writeConfig(): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            fs.writeFile(this.configFile, JSON.stringify(this.data), (err) => {
                if (err) {
                    reject(err)
                } else {
                    resolve();
                }
            });
        });
    }

    private async readConfig(): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            fs.readFile(this.configFile, (err, data) => {
                if (err) {
                    reject(err);
                } else {
                    this.data = JSON.parse(data.toString());
                    this.validateValues();
                    resolve();
                }
            });
        });
    }

    private validateValues(): void {
        if (this.data === undefined) {
            this.data = JSON.parse('{}');
        }
    }
}