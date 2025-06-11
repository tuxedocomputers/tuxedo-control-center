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

const fs: typeof import("fs") = require("fs");
const child_process: any = require("child_process");


export function getDirectories(source: string): string[] {
    try {
        return fs
            .readdirSync(source, { withFileTypes: true })
            .filter((dirent: any): boolean => dirent.isDirectory())
            .map((dirent: any): string => dirent.name);
    } catch (err: unknown) {
        console.error("Utils: getDirectories failed =>", err)
        return [];
    }
}

export function getFiles(source: string): string[] {
    try {
        return fs
            .readdirSync(source, { withFileTypes: true })
            .filter((dirent: any): boolean => dirent.isFile())
            .map((dirent: any): string => dirent.name);
    } catch (err: unknown) {
        console.error("Utils: getFiles failed =>", err)
        return [];
    }
}

export function getSymbolicLinks(source: string): string[] {
    try {
        return fs
            .readdirSync(source, { withFileTypes: true })
            .filter((dirent: any): boolean => dirent.isSymbolicLink())
            .map((dirent: any): string => dirent.name);
    } catch (err: unknown) {
        console.error("Utils: getSymbolicLinks failed =>", err)
        return [];
    }
}

export function findClosestValue(value: number, array: number[]): number {
    if (array === undefined) {
        return value;
    }

    let closest: number;
    let closestDiff: number;
    for (const arrayNumber of array) {
        const diff: number = Math.abs(value - arrayNumber);
        if (closestDiff === undefined || diff < closestDiff) {
            closest = arrayNumber;
            closestDiff = diff;
        }
    }
    return closest;
}

// todo: check if fileOK/fileOKAsync can be put into init to avoid periodic file access
// if errors appear after file was indeed ok but afterwards isn't, it needs error handling instead of checking status every time
export function fileOK(path: string): boolean {
    try {
        const exists: boolean = fs.existsSync(path)

        if (exists) {
            fs.accessSync(
                path,
                fs.constants.F_OK | fs.constants.R_OK | fs.constants.W_OK
            );
            return true;
        }
        return false
    } catch (err: unknown) {
        console.error("Utils: fileOK failed =>", err)
        return false;
    }
}

// async file access implementation requires an error to be thrown, thus no error logging for this special case
export async function fileOKAsync(path: string): Promise<boolean> {
    try {
        const exists: boolean = await fs.promises.stat(path)
            .then((): boolean => true)
            .catch((): boolean => false);

        if (exists) {
            return await fs.promises.access(path, fs.constants.F_OK | fs.constants.R_OK | fs.constants.W_OK)
                .then((): boolean => true)
                .catch((): boolean => false)
        }
        return false
    } catch (err: unknown) {
        console.error("Utils: fileOKAsync failed =>", err)
        return false;
    }
}

export function delay(ms: number): Promise<void> {
    return new Promise<void>((resolve: () => void): NodeJS.Timeout => setTimeout(resolve, ms));
}

export async function execCommandAsync(command: string, logging?: boolean): Promise<string> {
    return new Promise((resolve: (value: string | PromiseLike<string>) => void, reject: (reason?: unknown) => void): void => {
        child_process.exec(command, (error: any, stdout: string, stderr: string): void => {
            if (error) {
                if (logging ?? true) {
                    console.error("Utils: execCommandAsync failed =>", error);
                };
                resolve("");
            } else {
                resolve(stdout.trim());
            }
        });
    });
}

export function execCommandSync(command: string): string {
    try {
        return child_process.execSync(command).toString();
    } catch (err: unknown) {
        console.error("Utils: execCommandSync failed =>", err);
        return undefined;
    }
}

export function countLines(input: string): number {
    return input.split("\n").filter((str: string): boolean => str !== "")?.length;
}
