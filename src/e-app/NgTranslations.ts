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

import * as path from 'path';
import * as fs from 'fs';
import * as xliff from 'xliff';
import { DefaultProfileIDs, type IProfileTextMappings, LegacyDefaultProfileIDs } from '../common/models/DefaultProfiles';

/**
 * Loading of angular generated translation files. Workaround
 * to be able to read translatable strings (in render process)
 * from main process.
 *
 * Ex:
 * const tr = new NgTranslations();
 * try {
 *    await tr.loadLanguage('de');
 *    console.log('translation example: ' + tr.idToString('profileDescHighPerformance'));
 * } catch (err: unknown) {
 *    console.log('Failed loading translation => ' + err);
 *    const fallbackLangId = 'en';
 *    console.log('fallback to \'' + fallbackLangId + '\'');
 *    try {
 *        await tr.loadLanguage('en');
 *    } catch (err: unknown) {
 *        console.log('Failed loading fallback translation => ' + err);
 *    }
 * }
 */
export class NgTranslations {
    private translationMapOriginal: Map<string, string>;
    private translationMap: Map<string, string>;

    public idToString(id: string): string {
        if (this.translationMap === undefined) {
            throw new Error('No translation loaded');
        }
        if (this.translationMapOriginal === undefined) {
            throw new Error('No original loaded');
        }

        let translation: string = undefined;
        const chosenLangLookup: string = this.translationMap.get(id);
        const originalLangLookup: string = this.translationMapOriginal.get(id);

        if (chosenLangLookup !== undefined) {
            translation = chosenLangLookup;
        } else if (originalLangLookup !== undefined) {
            translation = originalLangLookup;
        }

        return translation;
    }

    public async loadLanguage(langId?: string): Promise<void> {
        const fileName: string = `lang.${langId}.xlf`;
        if (langId !== undefined) {
            this.translationMap = await this.loadFile(fileName);
        }
        this.translationMapOriginal = await this.loadFile('lang.xlf', 'source');
    }

    private loadFile(fileName: string, target?: string): Promise<Map<string, string>> {
        return new Promise<Map<string, string>>(async (resolve: (value: Map<string, string> | PromiseLike<Map<string, string>>) => void, reject: (reason?: unknown) => void): Promise<void> => {
            const xlfPath: string = path.join(__dirname, '..', '..', 'ng-app', 'en-US', 'assets', 'locale', fileName);
            fs.readFile(xlfPath, (err: unknown, xmlBuffer: Buffer): void => {
                if (err) {
                    reject(`NgTranslations: loadFile readFile failed => ${err}`);
                } else {
                    xliff.xliff12ToJs(xmlBuffer.toString(), (err: unknown, jsXlf: any): void => {
                        if (err) {
                            reject(`NgTranslations: loadFile xliff12ToJs failed => ${err}`);
                        } else {
                            try {
                                resolve(this.parseJS(jsXlf, target));
                            } catch (err: unknown) {
                                reject(`NgTranslations: loadFile parseJS failed => ${err}`);
                            }
                        }
                    });
                }
            });
        });
    }

    private parseJS(jsXlfObj: any, property?: string): Map<string, string> {
        const langMap = new Map<string, string>();
        const entries: any = jsXlfObj['resources']['ng2.template'];
        if (property === undefined) {
            property = 'target';
        }
        for (const id in entries) {
            langMap.set(id, entries[id][property]);
        }
        return langMap;
    }
}

export const profileIdToI18nId: Map<string, IProfileTextMappings> = new Map<string, IProfileTextMappings>()
    .set(DefaultProfileIDs.MaxEnergySave, { name: 'profileNamePowersaveExtreme', description: 'profileDescPowersaveExtreme' })
    .set(DefaultProfileIDs.Quiet, { name: 'profileNameQuiet', description: 'profileDescQuiet' })
    .set(DefaultProfileIDs.Office, { name: 'profileNameOffice', description: 'profileDescOffice' })
    .set(DefaultProfileIDs.HighPerformance, { name: 'profileNameHighPerformance', description: 'profileDescHighPerformance' })
    .set(LegacyDefaultProfileIDs.Default, { name: 'profileNameLegacyDefault', description: 'profileDescLegacyDefault' })
    .set(LegacyDefaultProfileIDs.CoolAndBreezy, { name: 'profileNameLegacyCoolAndBreezy', description: 'profileDescLegacyCoolAndBreezy' })
    .set(LegacyDefaultProfileIDs.PowersaveExtreme, { name: 'profileNameLegacyPowersaveExtreme', description: 'profileDescLegacyPowersaveExtreme' });
;
