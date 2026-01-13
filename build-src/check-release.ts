/*!
 * Copyright (c) 2019-2026 TUXEDO Computers GmbH <tux@tuxedocomputers.com>
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

import * as child_process from 'node:child_process';
import * as fsp from 'node:fs/promises';
import * as util from 'util';

const exec = util.promisify(child_process.exec);

function printResult(topic: string, success: boolean) {
    let formattedTopic = topic + ':';
    formattedTopic = formattedTopic.padEnd(35, ' ');
    console.log(formattedTopic + (success ? '\u2713 success' : '\u2620 fail'));
}

async function checkRelease(versionToCheck?: string): Promise<boolean> {
    let releaseVersion = '';

    // Get release version from package.json and compare with package.json used to start apps
    try {
        const mainPackageJSON = JSON.parse((await fsp.readFile('package.json')).toString());
        const startPackageJSON = JSON.parse((await fsp.readFile('src/package.json')).toString());

        if (versionToCheck) {
            releaseVersion = versionToCheck;
        } else {
            releaseVersion = mainPackageJSON.version;
        }
        console.log('Checking release v' + releaseVersion);
        console.log('');

        printResult('Version in package.json', releaseVersion === mainPackageJSON.version);
        printResult('Version in src/package.json', releaseVersion === startPackageJSON.version);
    } catch (err) {
        console.log('Failed to process package.json => ' + err);
        return false;
    }

    // Check last changelog version entry
    try {
        const changelog = (await fsp.readFile('CHANGELOG.md')).toString();
        const result = changelog.match(/\[(.*?)\]/);
        printResult('Version in changelog', releaseVersion === result[1]);
    } catch (err) {
        console.log('Failed to process changelog => ' + err);
        return false;
    }

    // Check for presence and content of a git tag
    let tagCheck = true;
    try {
        const searchedTagName = `v${releaseVersion}`;
        const result = await exec(`git tag -l "${searchedTagName}" -n1`);
        const match = result.stdout.match(/^(\S*)\s*(.*)/);
        if (match.length >= 3) {
            const tagName = match[1].trim();
            const tagMessage = match[2].trim();

            if (tagName !== searchedTagName) {
                tagCheck = false;
            }

            if (tagMessage !== `Version ${releaseVersion}`) {
                tagCheck = false;
            }
        } else {
            tagCheck = false;
        }
    } catch (err) {
        console.log('err here => ' + err);
        tagCheck = false;
    }
    printResult('Version in git tag', tagCheck);

    console.log('');

    return true;
}

checkRelease().then((success) => {
    if (success) {
        process.exit(0);
    } else {
        process.exit(1);
    }
});
