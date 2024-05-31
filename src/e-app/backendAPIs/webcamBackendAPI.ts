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

ipcMain.on("setting-webcam-with-loading", (event, arg) => {
    if (webcamWindow != null) {
        webcamWindow.webContents.send("setting-webcam-with-loading", arg);
    }
});

ipcMain.on("create-webcam-preview", function (evt, arg) {
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
});

ipcMain.on("close-webcam-preview", (event, arg) => {
    if (webcamWindow) {
        webcamWindow.close();
        clearWebcamWindow();
    }
});

ipcMain.on("apply-controls", (event) => {
    tccWindow.webContents.send("apply-controls");
});

ipcMain.on("video-ended", (event) => {
    tccWindow.webContents.send("video-ended");
});





let webcamConfigHandler: ConfigHandler = new ConfigHandler(
            TccPaths.SETTINGS_FILE,
            TccPaths.PROFILES_FILE,
            TccPaths.WEBCAM_FILE,
            TccPaths.V4L2_NAMES_FILE,
            TccPaths.AUTOSAVE_FILE,
            TccPaths.FANTABLES_FILE
        );

        
 // TODO functionality from inside render process should be moved here       
ipcMain.on('webcam-read-v4l2-names', (event, path: string) => {
    if (path)
    {
        event.returnValue = webcamConfigHandler.readV4l2Names(path);
    }
    else
    {
        event.returnValue = webcamConfigHandler.readV4l2Names();
    }
});

// TODO hacky second function, to be removed when functionality is moved to main.ts
ipcMain.on('webcam-read-v4l2-names-cwd', (event, path: string) => {
    if (path)
    {
        event.returnValue = webcamConfigHandler.readV4l2Names(cwd + path);
    }
    else
    {
        event.returnValue = webcamConfigHandler.readV4l2Names();
    }
});


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

ipcMain.on('webcam-read-settings', (event ) => {
    event.returnValue = webcamConfigHandler.readWebcamSettings();
});


ipcMain.handle('webcam-get-selected-webcam-settings', (event, selectedWebcamPath: string) => {
return new Promise<string>(async resolve => {
        resolve(await execCmd("python3 " + getWebcamCtrlPythonPath() + ` -d ${selectedWebcamPath} -j`))
    });
});

ipcMain.handle('webcam-execute-ctrls', (event, devicePath, parameter, value) => {
    return new Promise<string>(async resolve => {
        resolve(await execCmd("python3 " + getWebcamCtrlPythonPath() +
        ` -d ${devicePath} -c ${parameter}=${value}`))
    });
});

ipcMain.handle('webcam-execute-filtered-ctrls', (event, devicePath, filteredControls) => {
return new Promise<string>(async resolve => {
        resolve(await execCmd(
            `python3 ${getWebcamCtrlPythonPath()} -d ${devicePath} -c ${filteredControls}`
            ))
    });
});

ipcMain.handle('webcam-get-webcam-paths', (event) => {
    return new Promise(async resolve => {
        let result = await execFile("python3 " + getWebcamCtrlPythonPath() + " -i");
        resolve(result.data);
        });
});


ipcMain.handle('webcam-pkexec-write-config-async', (event, webcamSettings: WebcamPreset[]) => {
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
});

  