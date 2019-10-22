import * as fs from 'fs';
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
}
