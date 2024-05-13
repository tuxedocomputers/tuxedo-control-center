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

import { ipcMain } from 'electron';

ipcMain.on('log-stuff', (event,stuff) =>
{
    console.log("logging stuff:");
    console.log(stuff);
});

// ######## Gnome Brightness Workaround Functions ########


import { Observable, Subject } from 'rxjs';
import { DBusDisplayBrightnessGnome } from '../../common/classes/DBusDisplayBrightnessGnome';

let sessionBus: any;
const dbus = require('dbus-next');

let observeDisplayBrightness: Observable<number>;
let displayBrightnessSubject: Subject<number>;
let currentDisplayBrightness: number;
let displayBrightnessNotSupported = false;

let displayBrightnessGnome: DBusDisplayBrightnessGnome;

let dbusDriverNames: string[] = [];

displayBrightnessSubject = new Subject<number>();
observeDisplayBrightness = displayBrightnessSubject.asObservable();

try {
    sessionBus = dbus.sessionBus();
} catch (err) {
    console.log('dbus.sessionBus() error: ', err);
    sessionBus = undefined;
}


initDusDisplayBrightness().then(() => {
    const driversList: string[] = [];
    if (displayBrightnessNotSupported === false) {
    driversList.push(displayBrightnessGnome.getDescriptiveString());
    }
    dbusDriverNames = driversList;
});

export async function displayBrightnessGnomeCleanup() {
    displayBrightnessGnome.cleanUp();
}

async function initDusDisplayBrightness(): Promise<void> {
return new Promise<void>(async resolve => {
    if (sessionBus === undefined) {
    displayBrightnessNotSupported = true;
    } else {
    displayBrightnessGnome = new DBusDisplayBrightnessGnome(sessionBus);
    if (!await displayBrightnessGnome.isAvailable()) {
        displayBrightnessNotSupported = true;
        return;
    }

    try {
        const result = await displayBrightnessGnome.getBrightness();
        currentDisplayBrightness = result;
        displayBrightnessSubject.next(currentDisplayBrightness);
    } catch (err) {
        displayBrightnessNotSupported = true;
        return;
    }

    displayBrightnessGnome.setOnPropertiesChanged(
        (value) => {
        currentDisplayBrightness = value;
        displayBrightnessSubject.next(currentDisplayBrightness);
        }
    );
    }
    resolve();
});
}

async function setDisplayBrightness(valuePercent: number): Promise<void> {
return displayBrightnessGnome.setBrightness(valuePercent).catch(() => {});
}

ipcMain.handle('set-display-brightness-gnome', async (event, valuePercent) => {
    return new Promise<void>((resolve, reject) => {
        resolve(setDisplayBrightness(valuePercent));
    });
});


ipcMain.on('get-display-brightness-not-supported-sync', (event) => {
    event.returnValue = displayBrightnessNotSupported;
});