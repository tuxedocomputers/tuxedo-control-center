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

import type { WebcamConstraints, WebcamPreset } from '../../common/models/TccWebcamSettings';
import { clearWebcamWindow, tccWindow, webcamWindow, createWebcamPreview } from './browserWindowsAPI';
import { userConfig } from "./initMain";
import { ConfigHandler } from '../../common/classes/ConfigHandler';
import { TccPaths } from '../../common/classes/TccPaths';
import * as child_process from 'node:child_process';
import { WebcamAPIFunctions } from '../../common/models/IWebcamAPI';
import { cwd, environmentIsProduction, execCmd, execFile } from './utilsAPI';

const webcamConfigHandler: ConfigHandler = new ConfigHandler(
    TccPaths.SETTINGS_FILE,
    TccPaths.PROFILES_FILE,
    TccPaths.WEBCAM_FILE,
    TccPaths.V4L2_NAMES_FILE,
    TccPaths.AUTOSAVE_FILE,
    TccPaths.FANTABLES_FILE
);

function getWebcamCtrlPythonPath(): string {
    let webcamCtrolsPath: string;
    if (environmentIsProduction) {
        webcamCtrolsPath = TccPaths.TCCD_PYTHON_CAMERACTRL_FILE;
    } else {
        webcamCtrolsPath =
            cwd + "/src/cameractrls/cameractrls.py";
    }
    return webcamCtrolsPath;
}

export const webcamHandlers: Map<string, (...args: any[]) => any> = new Map<string, (...args: any[]) => any>()
    .set(WebcamAPIFunctions.settingWebcamWithLoading, async (arg: any): Promise<void> => {
        if (webcamWindow != null) {
            webcamWindow.webContents.send("setting-webcam-with-loading", arg);
        }
    })

    .set(WebcamAPIFunctions.createWebcamPreview, (arg: WebcamConstraints): void => {
        if (webcamWindow) {
            if (webcamWindow.isMinimized()) {
                webcamWindow.restore();
            }
            webcamWindow.focus();
        } else {
            userConfig.get("langId").then((langId: string): void => {
                createWebcamPreview(langId, arg);
            });
        }
    })

    .set(WebcamAPIFunctions.closeWebcamPreview, (): void => {
        if (webcamWindow) {
            webcamWindow.close();
            clearWebcamWindow();
        }
    })

    .set(WebcamAPIFunctions.applyControls, (): void => {
        tccWindow.webContents.send("apply-controls");
    })

    .set(WebcamAPIFunctions.videoEnded, (): void => {
        tccWindow.webContents.send("video-ended");
    })

    .set(WebcamAPIFunctions.readv4l2Values, (path: string): Promise<string[][]> => {
        return new Promise<string[][]>((resolve: (value: string[][] | PromiseLike<string[][]>) => void, reject: (reason?: unknown) => void): void => {
            let res: string[][];
            if (path)
            {
                res = webcamConfigHandler.readV4l2Names(path);
            }
            else
            {
                res = webcamConfigHandler.readV4l2Names();
            }
            resolve(res);
        });
    })

    // todo: simplify readV4l2Names
    .set(WebcamAPIFunctions.readv4l2ValuesCwd, (path: string): Promise<string[][]> => {
        return new Promise<string[][]>((resolve: (value: string[][] | PromiseLike<string[][]>) => void): void => {
            let res: string[][];
            if (path)
            {
                res = webcamConfigHandler.readV4l2Names(cwd + path);
            }
            else
            {
                res = webcamConfigHandler.readV4l2Names();
            }
            resolve(res);
        });
    })

    .set(WebcamAPIFunctions.readWebcamSettings, (): Promise<WebcamPreset[]> => {
        return new Promise<WebcamPreset[]>((resolve: (value: WebcamPreset[] | PromiseLike<WebcamPreset[]>) => void): void => {
            resolve(webcamConfigHandler.readWebcamSettings());
        });
    })

    .set(WebcamAPIFunctions.getSelectedWebcamSettings, (selectedWebcamPath: string): Promise<string> => {
        return new Promise<string>(async (resolve: (value: string | PromiseLike<string>) => void): Promise<void> => {
            resolve(await execCmd("python3 " + getWebcamCtrlPythonPath() + ` -d ${selectedWebcamPath} -j`))
        });
    })

    .set(WebcamAPIFunctions.executeWebcamCtrls, (devicePath: string, parameter: string, value: string): Promise<string> => {
        return new Promise<string>(async (resolve: (value: string | PromiseLike<string>) => void): Promise<void> => {
            resolve(await execCmd("python3 " + getWebcamCtrlPythonPath() +
            ` -d ${devicePath} -c ${parameter}=${value}`))
        });
    })

    .set(WebcamAPIFunctions.executeFilteredWebcamCtrls, async (devicePath: string, filteredControls: string): Promise<string> => {
        return new Promise<string>(async (resolve: (value: string | PromiseLike<string>) => void): Promise<void> => {
            resolve(await execCmd(
                `python3 ${getWebcamCtrlPythonPath()} -d ${devicePath} -c ${filteredControls}`
                ))
        });
    })

    .set(WebcamAPIFunctions.getWebcamPaths, async (): Promise<string> => {
        return new Promise<string>(async (resolve: (value: string | PromiseLike<string>) => void): Promise<void> => {
            const result: { data: string; error: unknown } = await execFile("python3 " + getWebcamCtrlPythonPath() + " -i");
            resolve(result.data);
            });
    })

    .set(WebcamAPIFunctions.writeConfig, (webcamSettings: WebcamPreset[]): Promise<boolean> => {
        return new Promise<boolean>((resolve: (value: boolean | PromiseLike<boolean>) => void): void => {
            const tmpWebcamPath: string = '/tmp/tmptccwebcam';
            webcamConfigHandler.writeWebcamSettings(webcamSettings, tmpWebcamPath);
            let tccdExec: string;
            if (environmentIsProduction) {
                tccdExec = TccPaths.TCCD_EXEC_FILE;
            } else {
                tccdExec = cwd + '/dist/tuxedo-control-center/data/service/tccd';
            }
            child_process.exec(
                'pkexec ' + tccdExec + ' --new_webcam ' + tmpWebcamPath,
            (err: unknown, stdout: string, stderr: string): void => {
                if (err) {
                    resolve(false);
                } else {
                    resolve(true);
                }
            });
        });
    })


