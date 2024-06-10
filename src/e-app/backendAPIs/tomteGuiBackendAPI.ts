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
########################################################
############## tomte GUI Backend #######################
########################################################
*/

import  { TomteAPIFunctions, ITomteModule, ITomteInformation } from '../../common/models/ITomteAPI';
import { execCmd, execFile } from './ipcBackendAPI'

async function resetToDefaults() {
    return new Promise<boolean>(async (resolve, reject) => {
        let command1 = "pkexec tuxedo-tomte AUTOMATIC";
        let command2 = "pkexec tuxedo-tomte unblock all";
        let command3 = "pkexec tuxedo-tomte reconfigure all";
        let res1;
        let res2;
        let res3;
        try
        {   
            res1 = await execFile(command1);
            res2 = await execFile(command2);
            res3 = await execFile(command3);
            resolve(true);
        }
        catch
        {
            console.error("One of the reset commands failed, here is their output: Function 1 Command: "
            + command1 + " Results: " + res1 +
            " Function 2 Command: " + command2 + " Results: " + res2 +
            " Function 3 Command: " + command3 + " Results: " + res3
            );
            resolve(false);
        }
    });
}

async function getModuleDescription(moduleName: string, langId: string) {
    return new Promise<string>(async (resolve, reject) => {
    let command = "LANGUAGE=" + langId + " tuxedo-tomte description " + moduleName;
    try
    {
        let results = await execCmd(command);
        resolve(results);
    }
    catch (err)
    {
        resolve("");
    }
    });
}

async function removeModule(moduleName: string) {
    let command = "yes | pkexec tuxedo-tomte remove " + moduleName;
    return new Promise<void>((resolve, reject) => {
        execCmd(command).then(() => {
            resolve();
        }).catch(() => {
            reject();
        })
    });
}

async function installModule(moduleName: string) {
    let command = "pkexec tuxedo-tomte configure " + moduleName;
    return new Promise<void>((resolve, reject) => {
        execCmd(command).then(() => {
            resolve();
        }).catch(() => {
            reject();
        })
    });
}

async function unBlockModule(moduleName: string) {
    let command = "pkexec tuxedo-tomte unblock " + moduleName;
    return new Promise<void>((resolve, reject) => {
        execCmd(command).then(() => {
            resolve();
        }).catch(() => {
            reject();
        })
    });
}

async function blockModule(moduleName: string) {
    let command = "pkexec tuxedo-tomte block " + moduleName;
    return new Promise<void>((resolve, reject) => {
        execCmd(command).then(() => {
            resolve();
        }).catch(() => {
            reject();
        })
    });
}

async function setMode(mode: string) {
    let command = "pkexec tuxedo-tomte " + mode;
    return new Promise<void>((resolve, reject) => {
        execCmd(command).then(() => {
            resolve();
        }).catch(() => {
            reject();
        })
    });
}


function parseTomteListJson(rawTomteListOutput: string | undefined)
    {
        let tomteInformation: ITomteInformation = {
            modules: [],
            tomteMode: "",
            jsonError: true,
            rebootRequired: false,

        };
        if (!rawTomteListOutput)
        {
            return;
        }
        try
        {
            let givenobject = JSON.parse(rawTomteListOutput);
            tomteInformation.jsonError = false;

        // now let's get the mode, modules etc out of it
        tomteInformation.tomteMode = givenobject.mode;
        tomteInformation.modules = [];
        tomteInformation.rebootRequired = givenobject.restart === "yes";
        for (let i = 0; i < givenobject.modules.length; i++)
        {
            let module = givenobject.modules[i];
            tomteInformation.modules.push({moduleName: module.name, version: module.version, installed: module.installed === "yes", blocked: module.blocked === "yes", prerequisite: module.required});
        }
        }
        catch (e)
        {
            console.error("Error Parsing tomte-list: not valid json");
            tomteInformation.jsonError = true;
        }
        finally {
            return tomteInformation;
        }
    }

async function getTomteInformation() {
    return new Promise<ITomteInformation>(async (resolve, reject) => {
            let command = "tuxedo-tomte listjson"
            let results: string;
            results = await execCmd(command + "");
            results = results.replace(/^[^\{]*\{/, "{"); // delete everything up to the first occurance of {
            resolve(parseTomteListJson(results));
    });
}

export const tomteHandlers = new Map<string, (...args: any[]) => any>()
    .set(TomteAPIFunctions.resetToDefaults, async () => { 
        return new Promise<boolean>((resolve, reject) => {
            resolve(resetToDefaults());
        });
    })


    .set(TomteAPIFunctions.getModuleDescription, async (moduleName, langId) => { 
        return new Promise<string>((resolve, reject) => {
            resolve(getModuleDescription(moduleName, langId));
        });
    })

    .set(TomteAPIFunctions.getTomteInformation, async () => { 
        return new Promise<ITomteInformation>((resolve, reject) => {
            resolve(getTomteInformation());
        });
    })

    .set(TomteAPIFunctions.removeModule, async (moduleName: string) => { 
        return new Promise<boolean>((resolve, reject) => {
            removeModule(moduleName).then(() => {
                resolve(true);
            }).catch(() => {
                resolve(false);
            })
        });
    })


    .set(TomteAPIFunctions.installModule, async (moduleName: string) => { 
        return new Promise<boolean>((resolve, reject) => {
            installModule(moduleName).then(() => {
                resolve(true);
            }).catch(() => {
                resolve(false);
            })
        });
    })

    .set(TomteAPIFunctions.unBlockModue, async (moduleName: string) => { 
        return new Promise<boolean>((resolve, reject) => {
            unBlockModule(moduleName).then(() => {
                resolve(true);
            }).catch(() => {
                resolve(false);
            })
        });
    })

    .set(TomteAPIFunctions.blockModule, async (moduleName: string) => { 
        return new Promise<boolean>((resolve, reject) => {
            blockModule(moduleName).then(() => {
                resolve(true);
            }).catch(() => {
                resolve(false);
            })
        });
    })

    .set(TomteAPIFunctions.setMode, async (mode: string) => { 
        return new Promise<boolean>((resolve, reject) => {
            setMode(mode).then(() => {
                resolve(true);
            }).catch(() => {
                resolve(false);
            })
        });
    })

