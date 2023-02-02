import * as builder from 'electron-builder';

/**
 * buildSteps is the List with the builds
 */
const buildSteps: Array<() => Promise<void>> = [];

const distSrc = './dist/tuxedo-control-center';

// For each all command line parameter, and set up the build
process.argv.forEach((parameter, index, array) => {
    if (parameter.startsWith('deb')) {
        buildSteps.push(buildDeb);
    }

    if (parameter.startsWith('rpm')) {
        buildSteps.push(buildSuseRpm);
    }

    /*if (parameter.startsWith('appimage')) {
        buildSteps.push(buildAppImage);
    }*/

    if (parameter.startsWith('all')) {
        buildSteps.push(buildDeb);
        buildSteps.push(buildSuseRpm);
        // buildSteps.push(buildAppImage);
    }
});

/**
 * Function for create the deb Package
 */
async function buildDeb(): Promise<void> {
    const config = {
        appId: 'tuxedocontrolcenter',
        artifactName: '${productName}_${version}.${ext}',
        directories: {
            output: './dist/packages'
        },

        files: [
            distSrc + '/**/*'
        ],
        extraResources: [
            distSrc + '/data/service/tccd',
            distSrc + '/data/service/TuxedoIOAPI.node',
            distSrc + '/data/CHANGELOG.md',
            distSrc + '/data/dist-data/tccd.service',
            distSrc + '/data/dist-data/tccd-sleep.service',
            distSrc + '/data/dist-data/tuxedo-control-center_256.svg',
            distSrc + '/data/dist-data/tuxedo-control-center.desktop',
            distSrc + '/data/dist-data/tuxedo-control-center-tray.desktop',
            distSrc + '/data/dist-data/com.tuxedocomputers.tccd.policy',
            distSrc + '/data/dist-data/com.tuxedocomputers.tccd.conf',
            distSrc + '/data/camera/cameractrls.py',
            distSrc + '/data/dist-data/99-webcam.rules'
        ],
        linux: {
            target: [
                'deb'
            ],
            category: 'System',
            description: 'TUXEDO Control Center Application'
        },
        deb: {
            depends: ['tuxedo-keyboard (>= 3.1.2)', 'libayatana-appindicator3-1'],
            category: 'System',
            fpm: [
                '--after-install=./build-src/after_install.sh',
                '--before-remove=./build-src/before_remove.sh',
                '--conflicts=tuxedofancontrol',
                '--replaces=tuxedofancontrol'
            ]
        }
    };
    console.log('\x1b[36m%s\x1b[0m', 'Create Deb Package');
    console.log('config', config);
    await builder.build({
        targets: builder.Platform.LINUX.createTarget(),
        config
    })
    .then((result) => {
        console.log('BUILD SUCCESS');
        console.log(result);
    })
    .catch((error) => {
        console.log('ERROR at BUILD');
        console.log(error);
    });
}

/**
 * Function for create the Suse RPM Package
 */
async function buildSuseRpm(): Promise<void> {
    const config: builder.Configuration = {
        appId: 'tuxedocontrolcenter',
        artifactName: '${productName}_${version}.${ext}',
        directories: {
            output: './dist/packages'
        },
        files: [
            distSrc + '/**/*'
        ],
        extraResources: [
            distSrc + '/data/service/tccd',
            distSrc + '/data/service/TuxedoIOAPI.node',
            distSrc + '/data/dist-data/tccd.service',
            distSrc + '/data/dist-data/tccd-sleep.service',
            distSrc + '/data/dist-data/tuxedo-control-center_256.svg',
            distSrc + '/data/dist-data/tuxedo-control-center.desktop',
            distSrc + '/data/dist-data/tuxedo-control-center-tray.desktop',
            distSrc + '/data/dist-data/com.tuxedocomputers.tccd.policy',
            distSrc + '/data/dist-data/com.tuxedocomputers.tccd.conf',
            distSrc + '/data/camera/cameractrls.py',
            distSrc + '/data/dist-data/99-webcam.rules'
        ],
        linux: {
            target: [
                'rpm'
            ],
            category: 'System',
            description: 'TUXEDO Control Center Application'
        },
        rpm: {
            depends: [ 'tuxedo-keyboard >= 3.1.2', '(libayatana-appindicator3-1 or libappindicator or libappindicator3-1)' ],
            fpm: [
                '--after-install=./build-src/after_install.sh',
                '--before-remove=./build-src/before_remove.sh',
                '--replaces=tuxedofancontrol <= 0.1.9',
                '--rpm-tag=%define _build_id_links none'
            ]
        }
    };

    console.log('\x1b[36m%s\x1b[0m', 'Create Suse RPM Package');
    console.log('config', config);
    await builder.build({
        targets: builder.Platform.LINUX.createTarget(),
        config
    })
    .then((result) => {
        console.log('BUILD SUCCESS');
        console.log(result);
    })
    .catch((error) => {
        console.log('ERROR at BUILD');
        console.log(error);
    });
}

/**
 * Function for create the AppImage Package
 */
async function buildAppImage(): Promise<void> {
    const config = {
        appId: 'tuxedocontrolcenter',
        artifactName: '${productName}_${version}.${ext}',
        directories: {
            output: './dist/packages'
        },
        files: [
            distSrc + '/**/*'
        ],
        extraResources: [
            distSrc + '/data/service/tccd',
            distSrc + '/data/service/TuxedoIOAPI.node',
            distSrc + '/data/dist-data/tccd.service',
            distSrc + '/data/dist-data/tccd-sleep.service',
            distSrc + '/data/dist-data/tuxedo-control-center_256.png',
            distSrc + '/data/dist-data/tuxedo-control-center_256.svg',
            distSrc + '/data/dist-data/tuxedo-control-center.desktop',
            distSrc + '/data/dist-data/tuxedo-control-center-tray.desktop',
            distSrc + '/data/dist-data/com.tuxedocomputers.tccd.policy',
            distSrc + '/data/dist-data/com.tuxedocomputers.tccd.conf',
            distSrc + '/data/camera/cameractrls.py',
            distSrc + '/data/dist-data/99-webcam.rules'
        ],
        linux: {
            target: [
                'AppImage'
            ],
            category: 'System',
            description: 'TUXEDO Control Center Application'
        }
    };

    console.log('\x1b[36m%s\x1b[0m', 'Create App Image');
    console.log('config', config);
    await builder.build({
        targets: builder.Platform.LINUX.createTarget(),
        config
    })
    .then((result) => {
        console.log('BUILD SUCCESS');
        console.log(result);
    })
    .catch((error) => {
        console.log('ERROR at BUILD');
        console.log(error);
    });
}

/**
 * Execute all Builds in the buildSteps List
 */
async function startBuild() {
    for (const step of buildSteps) {
        await step();
        console.log('\n');
    }
}

startBuild();
