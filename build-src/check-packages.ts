/*!
 * Copyright (c) 2026 TUXEDO Computers GmbH <tux@tuxedocomputers.com>
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

import * as fsp from 'node:fs/promises';
import * as path from 'path';
import { spawnCmdAsync } from 'src/common/classes/Utils';

function printResult(topic: string, success: boolean, indent = 35) {
    let formattedTopic = topic + ':';
    formattedTopic = formattedTopic.padEnd(indent, ' ');
    console.log(formattedTopic + (success ? '\u2713 success' : '\u2620 fail'));
}

const filesToCheck: string[][] = [
    ['/usr/share/metainfo/com.tuxedocomputers.tcc-gui.metainfo.xml', '0644'],
    ['/etc/xdg/autostart/tuxedo-control-center-tray.desktop', '0644'],
    ['/usr/share/polkit-1/actions/com.tuxedocomputers.tccd-service.policy', '0644'],
    ['/usr/share/polkit-1/actions/com.tuxedocomputers.tomte-access.policy', '0644'],
    ['/usr/share/dbus-1/system.d/com.tuxedocomputers.tccd-dbus.conf', '0644'],
    ['/usr/lib/udev/rules.d/99-webcam.rules', '0644'],
    ['/usr/lib/systemd/system/tccd.service', '0644'],
    ['/usr/lib/systemd/system/tccd-sleep.service', '0644'],
];

async function checkPackages(): Promise<boolean> {
    let debFilename = '';
    let rpmFilename = '';

    try {
        const files = await fsp.readdir(path.join('dist', 'packages'));
        for (const file of files) {
            if (file.includes('.deb') && debFilename === '') {
                debFilename = path.join('dist', 'packages', file);
            } else if (file.includes('.rpm') && rpmFilename === '') {
                rpmFilename = path.join('dist', 'packages', file);
            }
        }
    } catch (err: unknown) {
        console.log('no package directory');
        return false;
    }

    const argCheckDeb = process.argv.includes('deb');
    const argCheckRpm = process.argv.includes('rpm');
    const argCheckAll = process.argv.includes('all');

    const testsResult: boolean[] = [];

    if (argCheckDeb || argCheckAll) {
        testsResult.push(await checkDeb(debFilename));
    }

    if (argCheckRpm || argCheckAll) {
        testsResult.push(await checkRpm(rpmFilename));
    }

    return testsResult.every((e) => e === true);
}

async function checkDeb(debFileName: string): Promise<boolean> {
    const debPkgExist = debFileName !== '';

    printResult('deb package exist', debPkgExist);
    if (!debPkgExist) {
        return false;
    }

    const contents = parseDebFilesOutput(await spawnCmdAsync('dpkg-deb', ['-c', debFileName], {}));
    const filesToCheckDeb = filesToCheck.map((e) => [e[0], convertModeToString(e[1])]);
    const debFilesCorrect = checkContainsFiles(contents, filesToCheckDeb);

    printResult('deb package files check', debFilesCorrect);

    return debFilesCorrect;
}

async function checkRpm(rpmFileName: string): Promise<boolean> {
    const rpmPkgExist = rpmFileName !== '';

    printResult('rpm package exist', rpmPkgExist);
    if (!rpmPkgExist) {
        return false;
    }

    const contents = parseRpmFilesOutput(await spawnCmdAsync('rpm', ['-ql', '--dump', rpmFileName], {}));

    const rpmFilesCorrect = checkContainsFiles(contents, filesToCheck);
    printResult('rpm package files check', rpmFilesCorrect);

    return rpmFilesCorrect;
}

function checkContainsFiles(inputs: string[][], files: string[][]): boolean {
    let containsFiles = true;
    for (const entry of files) {
        let fileCheck = false;
        for (const input of inputs) {
            if (input[0].includes(entry[0]) && entry[1] === input[1]) {
                fileCheck = true;
            }
        }
        if (!fileCheck) {
            containsFiles = false;
            printResult(entry[0], false, 80);
        }
    }
    return containsFiles;
}

function parseDebFilesOutput(input: string): string[][] {
    return input
        .split('\n')
        .map((line) => {
            const e = line.split(/ +/);
            return [e[5], e[0]?.slice(-9)];
        })
        .filter((e) => typeof e[0] === 'string' && typeof e[1] === 'string');
}

function parseRpmFilesOutput(input: string): string[][] {
    return input
        .split('\n')
        .map((line) => {
            const e = line.split(/ +/);
            return [e[0], e[4]?.slice(-4)];
        })
        .filter((e) => typeof e[0] === 'string' && typeof e[1] === 'string');
}

function convertModeToString(modePermission: string) {
    let stringPermission = '';
    for (let i = 1; i < 4; ++i) {
        const currentNumber = parseInt(modePermission[i]);
        if (currentNumber & 4) {
            stringPermission += 'r';
        } else {
            stringPermission += '-';
        }

        if (currentNumber & 2) {
            stringPermission += 'w';
        } else {
            stringPermission += '-';
        }

        if (currentNumber & 1) {
            stringPermission += 'x';
        } else {
            stringPermission += '-';
        }
    }
    return stringPermission;
}

checkPackages()
    .then((success) => {
        if (success) {
            process.exit(0);
        } else {
            process.exit(1);
        }
    })
    .catch((err) => {
        console.error(`unexpected error => ${err}`);
        process.exit(2);
    });
