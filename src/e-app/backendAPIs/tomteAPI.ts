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

import type { ITomteInformation } from '../../common/models/ITomteAPI';
import { TomteAPIFunctions } from '../../common/models/ITomteAPI';
import { execCmd, execFile } from './utilsAPI';

// todo: refactor
async function resetToDefaults(): Promise<boolean> {
    const command1: string = 'pkexec tuxedo-tomte AUTOMATIC';
    const command2: string = 'pkexec tuxedo-tomte unblock all';
    const command3: string = 'pkexec tuxedo-tomte reconfigure all';

    try {
        await execFile(command1);
        await execFile(command2);
        await execFile(command3);
        return true;
    } catch (err: unknown) {
        console.error(`tomteAPI: resetToDefaults failed => ${err}`);
        return false;
    }
}

async function getModuleDescription(moduleName: string, langId: string): Promise<string> {
    const command: string = `LANGUAGE=${langId} tuxedo-tomte description ${moduleName}`;
    try {
        const results: string = await execCmd(command);
        return results;
    } catch (err: unknown) {
        console.error(`tomteAPI: getModuleDescription failed => ${err}`);
        throw err;
    }
}

async function removeModule(moduleName: string): Promise<void> {
    const command: string = 'yes | pkexec tuxedo-tomte remove ' + moduleName;

    await execCmd(command)
        .then((): void => {
            return;
        })
        .catch((err: unknown): void => {
            console.error(`tomteAPI: removeModule failed => ${err}`);
            throw err;
        });
}

async function installModule(moduleName: string): Promise<void> {
    const command: string = 'pkexec tuxedo-tomte configure ' + moduleName;

    await execCmd(command)
        .then((): void => {
            return;
        })
        .catch((err: unknown): void => {
            console.error(`tomteAPI: installModule failed => ${err}`);
            throw err;
        });
}

async function unBlockModule(moduleName: string): Promise<void> {
    const command: string = 'pkexec tuxedo-tomte unblock ' + moduleName;

    await execCmd(command)
        .then((): void => {
            return;
        })
        .catch((err: unknown): void => {
            console.error(`tomteAPI: unBlockModule failed => ${err}`);
            throw err;
        });
}

async function blockModule(moduleName: string): Promise<void> {
    const command: string = `pkexec tuxedo-tomte block ${moduleName}`;

    await execCmd(command)
        .then((): void => {
            return;
        })
        .catch((err: unknown): void => {
            console.error(`tomteAPI: blockModule failed => ${err}`);
            throw err;
        });
}

async function setMode(mode: string): Promise<void> {
    const command: string = `pkexec tuxedo-tomte ${mode}`;

    await execCmd(command)
        .then((): void => {
            return;
        })
        .catch((err: unknown): void => {
            console.error(`tomteAPI: setMode failed => ${err}`);
            throw err;
        });
}

function parseTomteListJson(rawTomteListOutput: string | undefined): ITomteInformation {
    const tomteInformation: ITomteInformation = {
        modules: [],
        tomteMode: '',
        jsonError: true,
        rebootRequired: false,
    };
    if (!rawTomteListOutput) {
        return;
    }
    try {
        const givenobject: any = JSON.parse(rawTomteListOutput);
        tomteInformation.jsonError = false;

        // now let's get the mode, modules etc out of it
        tomteInformation.tomteMode = givenobject.mode;
        tomteInformation.modules = [];
        tomteInformation.rebootRequired = givenobject.restart === 'yes';
        for (let i: number = 0; i < givenobject.modules?.length; i++) {
            const module: any = givenobject.modules[i];
            tomteInformation.modules.push({
                moduleName: module.name,
                version: module.version,
                installed: module.installed === 'yes',
                blocked: module.blocked === 'yes',
                prerequisite: module.required,
            });
        }
    } catch (err: unknown) {
        console.error(`tomteAPI: parseTomteListJson failed => ${err}`);
        tomteInformation.jsonError = true;
    } finally {
        return tomteInformation;
    }
}

async function getTomteInformation(): Promise<ITomteInformation> {
    const command: string = 'tuxedo-tomte listjson';
    let results: string;
    try {
        results = await execCmd(`${command}`);
        results = results.replace(/^[^\{]*\{/, '{'); // delete everything up to the first occurance of {
    } catch {
        results = '';
    } finally {
        const tomteInformation: ITomteInformation = parseTomteListJson(results);
        return tomteInformation;
    }
}
export const tomteHandlers: Map<string, (...args: any[]) => any> = new Map<string, (...args: any[]) => any>()
    .set(TomteAPIFunctions.resetToDefaults, (): Promise<boolean> => {
        return new Promise<boolean>(
            (resolve: (value: boolean | PromiseLike<boolean>) => void, _reject: (reason?: unknown) => void): void => {
                resolve(resetToDefaults());
            },
        );
    })

    .set(TomteAPIFunctions.getModuleDescription, (moduleName: string, langId: string): Promise<string> => {
        return new Promise<string>(
            (resolve: (value: string | PromiseLike<string>) => void, _reject: (reason?: unknown) => void): void => {
                resolve(getModuleDescription(moduleName, langId));
            },
        );
    })

    .set(TomteAPIFunctions.getTomteInformation, (): Promise<ITomteInformation> => {
        return new Promise<ITomteInformation>(
            (
                resolve: (value: ITomteInformation | PromiseLike<ITomteInformation>) => void,
                _reject: (reason?: unknown) => void,
            ): void => {
                resolve(getTomteInformation());
            },
        );
    })

    .set(TomteAPIFunctions.removeModule, (moduleName: string): Promise<boolean> => {
        return new Promise<boolean>(
            (resolve: (value: boolean | PromiseLike<boolean>) => void, _reject: (reason?: unknown) => void): void => {
                removeModule(moduleName)
                    .then((): void => {
                        resolve(true);
                    })
                    .catch((err: unknown): void => {
                        console.error(`tomteAPI: removeModule failed => ${err}`);
                        resolve(false);
                    });
            },
        );
    })

    .set(TomteAPIFunctions.installModule, (moduleName: string): Promise<boolean> => {
        return new Promise<boolean>(
            (resolve: (value: boolean | PromiseLike<boolean>) => void, _reject: (reason?: unknown) => void): void => {
                installModule(moduleName)
                    .then((): void => {
                        resolve(true);
                    })
                    .catch((err: unknown): void => {
                        console.error(`tomteAPI: installModule failed => ${err}`);
                        resolve(false);
                    });
            },
        );
    })

    .set(TomteAPIFunctions.unBlockModue, (moduleName: string): Promise<boolean> => {
        return new Promise<boolean>(
            (resolve: (value: boolean | PromiseLike<boolean>) => void, _reject: (reason?: unknown) => void): void => {
                unBlockModule(moduleName)
                    .then((): void => {
                        resolve(true);
                    })
                    .catch((err: unknown): void => {
                        console.error(`tomteAPI: unBlockModule failed => ${err}`);
                        resolve(false);
                    });
            },
        );
    })

    .set(TomteAPIFunctions.blockModule, (moduleName: string): Promise<boolean> => {
        return new Promise<boolean>(
            (resolve: (value: boolean | PromiseLike<boolean>) => void, _reject: (reason?: unknown) => void): void => {
                blockModule(moduleName)
                    .then((): void => {
                        resolve(true);
                    })
                    .catch((err: unknown): void => {
                        console.error(`tomteAPI: blockModule failed => ${err}`);
                        resolve(false);
                    });
            },
        );
    })

    .set(TomteAPIFunctions.setMode, (mode: string): Promise<boolean> => {
        return new Promise<boolean>(
            (resolve: (value: boolean | PromiseLike<boolean>) => void, _reject: (reason?: unknown) => void): void => {
                setMode(mode)
                    .then((): void => {
                        resolve(true);
                    })
                    .catch((err: unknown): void => {
                        console.error(`tomteAPI: setMode failed => ${err}`);
                        resolve(false);
                    });
            },
        );
    });
