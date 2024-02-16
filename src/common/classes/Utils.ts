/*!
 * Copyright (c) 2019-2020 TUXEDO Computers GmbH <tux@tuxedocomputers.com>
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

import { exec, execSync } from "child_process";
import * as fs from "fs";

export function getDirectories(source: string) {
    try {
        return fs
            .readdirSync(source, { withFileTypes: true })
            .filter((dirent) => dirent.isDirectory())
            .map((dirent) => dirent.name);
    } catch (err) {
        return [];
    }
}

export function getFiles(source) {
    try {
        return fs
            .readdirSync(source, { withFileTypes: true })
            .filter((dirent) => dirent.isFile())
            .map((dirent) => dirent.name);
    } catch (err) {
        return [];
    }
}

export function getSymbolicLinks(source: string) {
    try {
        return fs
            .readdirSync(source, { withFileTypes: true })
            .filter((dirent) => dirent.isSymbolicLink())
            .map((dirent) => dirent.name);
    } catch (err) {
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
        const diff = Math.abs(value - arrayNumber);
        if (closestDiff === undefined || diff < closestDiff) {
            closest = arrayNumber;
            closestDiff = diff;
        }
    }
    return closest;
}

export function fileOK(path: string): boolean {
    try {
        fs.accessSync(
            path,
            fs.constants.F_OK | fs.constants.R_OK | fs.constants.W_OK
        );
        return true;
    } catch (err) {
        return false;
    }
}

export async function fileOKAsync(path: string): Promise<boolean> {
    try {
        await fs.promises.access(
            path,
            fs.constants.F_OK | fs.constants.R_OK | fs.constants.W_OK
        );
        return true;
    } catch (err) {
        return false;
    }
}

export function delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

// seperate exec cmd functionality because tccd can not access electron
export async function execCommandAsync(command: string): Promise<string> {
    return new Promise((resolve, reject) => {
        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error("Async Exec CMD failed: ", error);
                resolve("");
            } else {
                resolve(stdout.trim());
            }
        });
    });
}

export function execCommandSync(command: string): string {
    try {
        return execSync(command).toString();
    } catch (err) {
        console.error("Sync Exec CMD failed: ", err);
        return undefined;
    }
}

export function countLines(input: string): number {
    return input.split("\n").filter((str) => str !== "").length;
}
