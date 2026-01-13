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

import type { IpcMainEvent, IpcMainInvokeEvent } from 'electron';
import { ipcMain } from 'electron';
import { ConfigHandler } from '../../common/classes/ConfigHandler';
import { TccPaths } from '../../common/classes/TccPaths';
import type { ITccProfile } from '../../common/models/TccProfile';
import type { ITccSettings } from '../../common/models/TccSettings';
import { cwd, environmentIsProduction, execFile, execFileSync } from './utilsAPI';

const config: ConfigHandler = new ConfigHandler(
    TccPaths.SETTINGS_FILE,
    TccPaths.PROFILES_FILE,
    TccPaths.WEBCAM_FILE,
    TccPaths.V4L2_NAMES_FILE,
    TccPaths.AUTOSAVE_FILE,
    TccPaths.FANTABLES_FILE,
);

async function pkexecWriteCustomProfilesAsync(newProfileList: ITccProfile[]): Promise<boolean> {
    const tmpProfilesPath: string = '/tmp/tmptccprofiles';
    config.writeProfiles(newProfileList, tmpProfilesPath);
    let tccdExec: string;
    if (environmentIsProduction) {
        tccdExec = TccPaths.TCCD_EXEC_FILE;
    } else {
        tccdExec = `${cwd}/dist/tuxedo-control-center/data/service/tccd`;
    }

    try {
        await execFile(`pkexec ${tccdExec} --new_profiles ${tmpProfilesPath}`);
        return true;
    } catch (err: unknown) {
        console.error(`configAPI: pkexecWriteCustomProfilesAsync failed => ${err}`);
        return false;
    }
}

function pkexecWriteCustomProfiles(profiles: ITccProfile[]): boolean {
    const tmpProfilesPath = '/tmp/tmptccprofiles';
    config.writeProfiles(profiles, tmpProfilesPath);
    let tccdExec: string;
    if (environmentIsProduction) {
        tccdExec = TccPaths.TCCD_EXEC_FILE;
    } else {
        tccdExec = `${cwd}/dist/tuxedo-control-center/data/service/tccd`;
    }
    // https://stackoverflow.com/questions/57484453/how-to-get-err-stderr-from-execsync
    try {
        execFileSync(`pkexec ${tccdExec} --new_profiles ${tmpProfilesPath}`);
        return true;
    } catch (err: unknown) {
        console.error(`configAPI: pkexecWriteCustomProfiles failed => ${err}`);
        return false;
    }
}

async function pkexecWriteConfigAsync(settings: ITccSettings, profiles: ITccProfile[]): Promise<boolean> {
    return new Promise<boolean>(
        async (
            resolve: (value: boolean | PromiseLike<boolean>) => void,
            reject: (reason?: unknown) => void,
        ): Promise<void> => {
            const tmpProfilesPath = '/tmp/tmptccprofiles';
            const tmpSettingsPath = '/tmp/tmptccsettings';
            config.writeProfiles(profiles, tmpProfilesPath);
            config.writeSettings(settings, tmpSettingsPath);
            let tccdExec: string;
            if (environmentIsProduction) {
                tccdExec = TccPaths.TCCD_EXEC_FILE;
            } else {
                tccdExec = cwd + '/dist/tuxedo-control-center/data/service/tccd';
            }

            await execFile(
                'pkexec ' + tccdExec + ' --new_profiles ' + tmpProfilesPath + ' --new_settings ' + tmpSettingsPath,
            )
                .then((data: { data: string; error: unknown }): void => {
                    if (data.error) {
                        resolve(false);
                    } else {
                        resolve(true);
                    }
                })
                .catch((err: unknown): void => {
                    console.error('configAPI: pkexecWriteConfigAsync failed =>', err);
                    resolve(false);
                });
        },
    );
}

ipcMain.on(
    'config-set-active-profile',
    (event: IpcMainEvent, profileId: string, stateId: string, settings: ITccSettings): void => {
        // Copy existing current settings and set id of new profile
        const newSettings: ITccSettings = config.copyConfig<ITccSettings>(settings);

        newSettings.stateMap[stateId] = profileId;
        const tmpSettingsPath = '/tmp/tmptccsettings';
        config.writeSettings(newSettings, tmpSettingsPath);
        let tccdExec: string;

        if (environmentIsProduction) {
            tccdExec = TccPaths.TCCD_EXEC_FILE;
        } else {
            tccdExec = `${cwd}/dist/tuxedo-control-center/data/service/tccd`;
        }
        // todo: error handling
        execFile(`pkexec ${tccdExec} --new_settings ${tmpSettingsPath}`);
    },
);

ipcMain.on('config-pkexec-write-custom-profiles', (event: IpcMainEvent, customProfiles: ITccProfile[]): void => {
    event.returnValue = pkexecWriteCustomProfiles(customProfiles);
});

ipcMain.handle(
    'config-pkexec-write-custom-profiles-async',
    (event: IpcMainInvokeEvent, customProfiles: ITccProfile[]): Promise<boolean> => {
        return pkexecWriteCustomProfilesAsync(customProfiles);
    },
);

ipcMain.handle(
    'config-pkexec-write-config-async',
    (event: IpcMainInvokeEvent, settings: ITccSettings, customProfiles: ITccProfile[]): Promise<boolean> => {
        return pkexecWriteConfigAsync(settings, customProfiles);
    },
);

ipcMain.on('config-get-default-fan-profiles', (event: IpcMainEvent): void => {
    event.returnValue = config.getDefaultFanProfiles();
});
