/*!
 * Copyright (c) 2019-2023 TUXEDO Computers GmbH <tux@tuxedocomputers.com>
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
import { promises as fsp} from 'fs';
import { ISysFsProperty } from '../models/IDeviceProperty';

/**
 * Base (abstract) IO class for communicating with devices in /sys
 *
 * Typespecific uses should extend this with the type they want
 * to interface with and implement
 *
 *     protected abstract convertStringToType(value: string): T;
 *     protected abstract convertTypeToString(value: T): string;
 *
 * specifically for their type.
 *
 * The implemented types can then be used i.e as properties of
 * a class controlling/reading a device.
 */
export abstract class SysFsPropertyIO<T> implements ISysFsProperty {

    constructor(readonly readPath: string, readonly writePath: string = readPath) {}

    protected abstract convertStringToType(value: string): T;
    protected abstract convertTypeToString(value: T): string;

    /**
     * Reads value from device path and tries to convert it with
     * convertStringToType. Throws error if file operation fails.
     *
     * @returns The value of the current type
     */
    public readValue(): T {
        try {
            const readValue: string = fs.readFileSync(this.readPath, { flag: 'r' }).toString();
            return this.convertStringToType(readValue);
        } catch (err) {
            throw Error('Could not read value from path: ' + this.readPath + ' => ' + err);
        }
    }

    /**
     * Async version of readValue
     */
    public async readValueA(): Promise<T> {
        try {
            const readValue: string = (await fsp.readFile(this.readPath, { flag: 'r' })).toString();
            return this.convertStringToType(readValue);
        } catch (err) {
            throw Error('Could not read value from path: ' + this.readPath + ' => ' + err);
        }
    }

    /**
     * Reads value from device path and tries to convert it with
     * convertStringToType. Does not throw on error.
     *
     * @returns undefined if any part fails, the value in the type otherwise
     */
    public readValueNT(): T {
        try {
            const readValue: string = fs.readFileSync(this.readPath, { flag: 'r' }).toString();
            return this.convertStringToType(readValue);
        } catch (err) {
            return undefined;
        }
    }

    /**
     * Async version of readValueNT
     */
    public async readValueNTA(): Promise<T> {
        try {
            return await this.readValueA();
        } catch (err) {
            return undefined;
        }
    }

    /**
     * Attempts to write to device path. Converts the given value with
     * convertTypeToString first. Throws error if file operation fails.
     *
     * @param value Value in the appropriate type to write
     */
    public writeValue(value: T) {
        const stringValue = this.convertTypeToString(value);
        try {
            if (!fs.existsSync(this.writePath)) {
                throw Error('Could not write value, no file found: ' + this.writePath);
            } else {
                fs.writeFileSync(this.writePath, stringValue, { flag: 'w' });
            }
        } catch (err) {
            throw Error('Could not write value \'' + stringValue + '\' to path: ' + this.writePath + ' => ' + err);
        }
    }

    /**
     * Async version of writeValue
     */
    public async writeValueA(value: T) {
        const stringValue = this.convertTypeToString(value);
        try {
            return await fsp.writeFile(this.writePath, stringValue, { flag: 'w' });
        } catch (err) {
            throw Error('Could not write value \'' + stringValue + '\' to path: ' + this.writePath + ' => ' + err);
        }
    }

    /**
     * Checks if read/write paths exist
     */
    public isAvailable(): boolean {
        try {
            if (fs.existsSync(this.readPath) && fs.existsSync(this.writePath)) {
                fs.readFileSync(this.readPath);
                return true;
            } else {
                return false;
            }
        } catch (err) {
            return false;
        }
    }

    /**
     * Check if property is writable
     */
    public isWritable(): boolean {
        try {
            fs.accessSync(this.writePath, fs.constants.W_OK);
            return true;
        } catch (err) {
            return false;
        }
    }

    /**
     * Check if property is readable
     */
    public isReadable(): boolean {
        try {
            fs.accessSync(this.readPath, fs.constants.R_OK);
            return true;
        } catch (err) {
            return false;
        }
    }

    /**
     * Set a callback on changes to value
     */
    public setFSWatchListener(listener: (event: "rename" | "change", filename: string) => any): Array<fs.FSWatcher> {
        if (this.readPath == this.writePath) {
            return [fs.watch(this.readPath, listener)];
        }
        else {
            return [fs.watch(this.readPath, listener), fs.watch(this.readPath, listener)];
        }
    }
}
