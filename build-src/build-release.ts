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

import * as util from 'util';
import * as child_process from 'child_process';
const execp = util.promisify(child_process.exec);

const tccPackage = require('../package.json');

async function getGitDescribe() {
    return (await execp("git describe")).stdout.trim();
}

async function getCurrentBranch() {
    return (await execp('git branch --show-current')).stdout.trim();
}

async function setVersion(version: string) {
    version.replace('"', '');
    await execp(`npm run ver "${version} --allow-same-version"`);
}

async function main() {

    let automaticVersion = false;
    let isStart = false;
    let isEnd = false;

    process.argv.forEach((parameter, index, array) => {
        if (parameter.includes('autoversion')) {
            automaticVersion = true;
        }
    });

    const previousVersion = tccPackage.version;
    try {

        let filenameAddition = '';
        if (automaticVersion) {
            const gitDescribe = await getGitDescribe();
            const gitBranch = await getCurrentBranch();
            const version = gitDescribe.slice(1);

            const addBranchNameToFilename = version.includes('-') &&
                                            gitBranch !== '';

            if (addBranchNameToFilename) {
                filenameAddition = `_${gitBranch}`;
            }

            console.log(`Set build version: '${version}'`);
            await setVersion(version);
        }

        console.log('Run production build');
        console.log((await execp("npm run build-prod")).stdout);
        console.log('Run electron-builder');
        console.log((await execp(`npm run electron-builder "fnameadd=${filenameAddition}"`)).stdout);

    } catch (err) {
        console.log('Error on build => ' + err);
        process.exit(1);
    } finally {
        if (automaticVersion) {
            console.log(`Restore version: '${previousVersion}' `);
            await setVersion(previousVersion);
        }
    }
}

main().then(() => {
    process.exit(0);
}).catch(err => {
    console.log("error => " + err);
    process.exit(1);
})