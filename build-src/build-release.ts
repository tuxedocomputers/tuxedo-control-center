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
            let gitDescribe = await getGitDescribe();
            let gitBranch = await getCurrentBranch();
            let version = gitDescribe.slice(1);

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