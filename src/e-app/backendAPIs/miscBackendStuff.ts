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

import { ipcMain, IpcMainEvent, IpcMainInvokeEvent } from 'electron';

// todo: rename or remove
ipcMain.on('log-stuff', (event: IpcMainEvent,stuff: any): void =>
{
    console.log("logging stuff:");
    console.log(stuff);
});

// ######## Gnome Brightness Workaround Functions ########


import { Observable, Subject } from 'rxjs';
import { DBusDisplayBrightnessGnome } from '../../common/classes/DBusDisplayBrightnessGnome';

let sessionBus: any;
const dbus: any = require('dbus-next');

let observeDisplayBrightness: Observable<number>;
let displayBrightnessSubject: Subject<number>;
let currentDisplayBrightness: number;
let displayBrightnessNotSupported: boolean = false;

let displayBrightnessGnome: DBusDisplayBrightnessGnome;

let dbusDriverNames: string[] = [];

displayBrightnessSubject = new Subject<number>();
observeDisplayBrightness = displayBrightnessSubject.asObservable();

try {
    sessionBus = dbus.sessionBus();
} catch (err: unknown) {
    console.error("miscBackendStuff: dbus.sessionBus failed =>", err)
    sessionBus = undefined;
}


initDusDisplayBrightness().then((): void => {
    const driversList: string[] = [];
    if (displayBrightnessNotSupported === false) {
    driversList.push(displayBrightnessGnome.getDescriptiveString());
    }
    dbusDriverNames = driversList;
});

export async function displayBrightnessGnomeCleanup(): Promise<void> {
    displayBrightnessGnome.cleanUp();
}

async function initDusDisplayBrightness(): Promise<void> {
    return new Promise<void>(async (resolve: (value: void | PromiseLike<void>) => void, reject: (reason?: unknown) => void): Promise<void> => {
    if (sessionBus === undefined) {
    displayBrightnessNotSupported = true;
    } else {
    displayBrightnessGnome = new DBusDisplayBrightnessGnome(sessionBus);
    if (!await displayBrightnessGnome.isAvailable()) {
        displayBrightnessNotSupported = true;
        return;
    }

    try {
        const result: number = await displayBrightnessGnome.getBrightness();
        currentDisplayBrightness = result;
        displayBrightnessSubject.next(currentDisplayBrightness);
    } catch (err: unknown) {
        console.error("miscBackendStuff: initDusDisplayBrightness failed =>", err)
        displayBrightnessNotSupported = true;
        return;
    }

    displayBrightnessGnome.setOnPropertiesChanged(
        (value: number): void => {
        currentDisplayBrightness = value;
        displayBrightnessSubject.next(currentDisplayBrightness);
        }
    );
    }
    resolve();
});
}

async function setDisplayBrightness(valuePercent: number): Promise<void> {
return displayBrightnessGnome.setBrightness(valuePercent).catch((err: unknown): void => {console.error("miscBackendStuff: setDisplayBrightness failed =>", err)});
}

ipcMain.handle('set-display-brightness-gnome', (event: IpcMainInvokeEvent, valuePercent: number): Promise<void> => {
    return new Promise<void>((resolve: (value: void | PromiseLike<void>) => void, reject: (reason?: unknown) => void): void => {
        resolve(setDisplayBrightness(valuePercent));
    });
});


ipcMain.on('get-display-brightness-not-supported-sync', (event: IpcMainEvent): void => {
    event.returnValue = displayBrightnessNotSupported;
});