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

import { userConfig, updateTrayProfiles, watchOption, translation } from './initMain';
import { tccWindow, aquarisWindow, webcamWindow } from './browserWindows';
import * as path from 'path';
import { nativeTheme } from 'electron';


export async function changeLanguage(newLangId: string) {
    if (newLangId !== await userConfig.get('langId')) {
        await userConfig.set('langId', newLangId);
        await loadTranslation(newLangId);
        await updateTrayProfiles();
        if (tccWindow) {
            const indexPath = path.join(__dirname, '..', '..', '..', 'ng-app', newLangId, 'index.html');
            await tccWindow.loadFile(indexPath);
        }
    }
}

// Handle nativeTheme updated event, whether system triggered or from tcc
nativeTheme.on('updated', () => {
    if (tccWindow) {
        tccWindow.webContents.send('update-brightness-mode');
    }
    if (aquarisWindow) {
        aquarisWindow.webContents.send('update-brightness-mode');
    }
    if (webcamWindow) {
        webcamWindow.webContents.send('update-brightness-mode');
    }
});

type BrightnessModeString = 'light' | 'dark' | 'system';
export async function setBrightnessMode(mode: BrightnessModeString) {
    // Save wish to user config
    await userConfig.set('brightnessMode', mode);
    // Update electron theme source
    nativeTheme.themeSource = mode;
}

export async function getBrightnessMode(): Promise<BrightnessModeString> {
    let mode = await userConfig.get('brightnessMode') as BrightnessModeString | undefined;
    switch (mode) {
        case 'light':
        case 'dark':
            break;
        default:
            mode = 'system';
    }
    return mode;
}

export async function loadTranslation(langId) {

    // Watch mode Workaround: Waiting for translation when starting in watch mode
    let canLoadTranslation = false;
    while (watchOption && !canLoadTranslation) {
        try {
            await translation.loadLanguage(langId);
            canLoadTranslation = true;
        } catch (err: unknown) {
            console.error("translationAndTheme: loadTranslation failed =>", err)
            await new Promise(resolve => setTimeout(resolve, 3000));
        }
    }
    // End watch mode workaround

    try {
        await translation.loadLanguage(langId);
    } catch (err: unknown) {
        console.log('Failed loading translation => ' + err);
        const fallbackLangId = 'en';
        console.log('fallback to \'' + fallbackLangId + '\'');
        try {
            await translation.loadLanguage(fallbackLangId);
        } catch (err: unknown) {
            console.error("translationAndTheme: loadLanguage failed =>", err)
        }
    }
}