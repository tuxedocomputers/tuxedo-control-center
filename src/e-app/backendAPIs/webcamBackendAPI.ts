/*!
 * Copyright (c) 2019-2022 TUXEDO Computers GmbH <tux@tuxedocomputers.com>
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

/*
##################################################################
################# Webcam Backend for TCC API #####################
##################################################################
*/


import { WebcamPreset } from '../../common/models/TccWebcamSettings';
import { clearWebcamWindow, tccWindow, webcamWindow, createWebcamPreview } from './browserWindows';
import { userConfig } from "./initMain";
import { ipcMain } from 'electron';
import { ConfigHandler } from '../../common/classes/ConfigHandler';
import { TccPaths } from '../../common/classes/TccPaths';
import * as child_process from 'child_process';
import { environmentIsProduction, cwd, execFile, execCmd } from './ipcBackendAPI';
import { WebcamAPIFunctions } from '../../common/models/IWebcamAPI';


let webcamConfigHandler: ConfigHandler = new ConfigHandler(
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

export const webcamHandlers = new Map<string, (...args: any[]) => any>()
    .set(WebcamAPIFunctions.settingWebcamWithLoading, async (arg) => { 
        if (webcamWindow != null) {
            webcamWindow.webContents.send("setting-webcam-with-loading", arg);
        }
    })

    .set(WebcamAPIFunctions.createWebcamPreview, async (arg) => { 
        if (webcamWindow) {
            if (webcamWindow.isMinimized()) {
                webcamWindow.restore();
            }
            webcamWindow.focus();
        } else {
            userConfig.get("langId").then((langId) => {
                createWebcamPreview(langId, arg);
            });
        }
    })

    .set(WebcamAPIFunctions.closeWebcamPreview, async () => { 
        if (webcamWindow) {
            webcamWindow.close();
            clearWebcamWindow();
        }
    })

    .set(WebcamAPIFunctions.applyControls, async () => { 
        tccWindow.webContents.send("apply-controls");
    })

    .set(WebcamAPIFunctions.videoEnded, async () => { 
        tccWindow.webContents.send("video-ended");
    })

    .set(WebcamAPIFunctions.readv4l2Values, async (path) => { 
        return new Promise<string[][]>((resolve, reject) => {
            let res;
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
        // TODO hacky second function, to be removed when functionality is moved to main.ts
    .set(WebcamAPIFunctions.readv4l2ValuesCwd, async (path) => { 
        return new Promise<string[][]>((resolve, reject) => {
            let res;
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

    .set(WebcamAPIFunctions.readWebcamSettings, async () => { 
        return new Promise<WebcamPreset[]>((resolve, reject) => {
            resolve(webcamConfigHandler.readWebcamSettings());
        });
    })

    .set(WebcamAPIFunctions.getSelectedWebcamSettings, async (selectedWebcamPath) => { 
        return new Promise<string>(async resolve => {
            resolve(await execCmd("python3 " + getWebcamCtrlPythonPath() + ` -d ${selectedWebcamPath} -j`))
        });
    })

    .set(WebcamAPIFunctions.executeWebcamCtrls, async (devicePath,parameter,value) => { 
        return new Promise<string>(async resolve => {
            resolve(await execCmd("python3 " + getWebcamCtrlPythonPath() +
            ` -d ${devicePath} -c ${parameter}=${value}`))
        });
    })

    .set(WebcamAPIFunctions.executeFilteredWebcamCtrls, async (devicePath, filteredControls) => { 
        return new Promise<string>(async resolve => {
            resolve(await execCmd(
                `python3 ${getWebcamCtrlPythonPath()} -d ${devicePath} -c ${filteredControls}`
                ))
        });
    })

    .set(WebcamAPIFunctions.getWebcamPaths, async () => { 
        return new Promise(async resolve => {
            let result = await execFile("python3 " + getWebcamCtrlPythonPath() + " -i");
            resolve(result.data);
            });
    })

    .set(WebcamAPIFunctions.writeConfig, async (webcamSettings: WebcamPreset[]) => { 
        return new Promise<boolean>(resolve => {
            const tmpWebcamPath = '/tmp/tmptccwebcam';
            webcamConfigHandler.writeWebcamSettings(webcamSettings, tmpWebcamPath);
            let tccdExec: string;
            if (environmentIsProduction) {
                tccdExec = TccPaths.TCCD_EXEC_FILE;
            } else {
                tccdExec = cwd + '/dist/tuxedo-control-center/data/service/tccd';
            }
            child_process.exec(
                'pkexec ' + tccdExec + ' --new_webcam ' + tmpWebcamPath,
            (err, stdout, stderr) => {
                if (err) {
                    resolve(false);
                } else {
                    resolve(true);
                }
            });
        });
    })


  