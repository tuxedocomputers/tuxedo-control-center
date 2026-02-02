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

import type { MessageBus } from 'dbus-next';
import type { IpcMainEvent, IpcMainInvokeEvent } from 'electron';
import { ipcMain, nativeTheme } from 'electron';
import { Subject } from 'rxjs';
import { DBusDisplayBrightnessGnome } from '../../common/classes/DBusDisplayBrightnessGnome';
import { userConfig } from './initMain';

export type BrightnessModeString = 'light' | 'dark' | 'system';

let sessionBus: MessageBus;
const dbus: typeof import('dbus-next') = require('dbus-next');

const displayBrightnessSubject: Subject<number> = new Subject<number>();
let currentDisplayBrightness: number;
let displayBrightnessNotSupported: boolean = false;

let displayBrightnessGnome: DBusDisplayBrightnessGnome;

try {
    sessionBus = dbus.sessionBus();
} catch (err: unknown) {
    console.error(`brightnessAPI: dbus.sessionBus failed => ${err}`);
    sessionBus = undefined;
}

initDbusDisplayBrightness().then((): void => {
    const driversList: string[] = [];
    if (displayBrightnessNotSupported === false) {
        driversList.push(displayBrightnessGnome.getDescriptiveString());
    }
});

export async function displayBrightnessGnomeCleanup(): Promise<void> {
    displayBrightnessGnome.cleanUp();
}

async function initDbusDisplayBrightness(): Promise<void> {
    if (sessionBus === undefined) {
        displayBrightnessNotSupported = true;
    } else {
        displayBrightnessGnome = new DBusDisplayBrightnessGnome(sessionBus);
        if (!(await displayBrightnessGnome.isAvailable())) {
            displayBrightnessNotSupported = true;
            return;
        }

        try {
            const result: number = await displayBrightnessGnome.getBrightness();
            currentDisplayBrightness = result;
            displayBrightnessSubject.next(currentDisplayBrightness);
        } catch (err: unknown) {
            console.error(`brightnessAPI: initDbusDisplayBrightness failed => ${err}`);
            displayBrightnessNotSupported = true;
            return;
        }

        displayBrightnessGnome.setOnPropertiesChanged((value: number): void => {
            currentDisplayBrightness = value;
            displayBrightnessSubject.next(currentDisplayBrightness);
        });
    }
}

async function setDisplayBrightness(valuePercent: number): Promise<void> {
    return displayBrightnessGnome.setBrightness(valuePercent).catch((err: unknown): void => {
        console.error(`brightnessAPI: setDisplayBrightness failed => ${err}`);
    });
}

ipcMain.handle('set-display-brightness-gnome', (_event: IpcMainInvokeEvent, valuePercent: number): Promise<void> => {
    return new Promise<void>(
        (resolve: (value: void | PromiseLike<void>) => void, _reject: (reason?: unknown) => void): void => {
            resolve(setDisplayBrightness(valuePercent));
        },
    );
});

ipcMain.on('get-display-brightness-not-supported-sync', (event: IpcMainEvent): void => {
    event.returnValue = displayBrightnessNotSupported;
});

ipcMain.handle(
    'set-brightness-mode',
    (_event: IpcMainInvokeEvent, mode: BrightnessModeString): Promise<void> => setBrightnessMode(mode),
);
ipcMain.handle('get-brightness-mode', (): Promise<BrightnessModeString> => getBrightnessMode());
ipcMain.handle('get-should-use-dark-colors', (): boolean => {
    return nativeTheme.shouldUseDarkColors;
});

export async function setBrightnessMode(mode: BrightnessModeString): Promise<void> {
    // Save wish to user config
    await userConfig.set('brightnessMode', mode);
    // Update electron theme source
    nativeTheme.themeSource = mode;
}
export async function getBrightnessMode(): Promise<BrightnessModeString> {
    let mode: BrightnessModeString = (await userConfig.get('brightnessMode')) as BrightnessModeString | undefined;
    switch (mode) {
        case 'light':
        case 'dark':
            break;
        default:
            mode = 'system';
    }
    return mode;
}
