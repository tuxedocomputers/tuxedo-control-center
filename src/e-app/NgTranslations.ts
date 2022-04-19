import * as path from 'path';
import * as fs from 'fs';
import * as xliff from 'xliff';

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
 * } catch (err) {
 *    console.log('Failed loading translation => ' + err);
 *    const fallbackLangId = 'en';
 *    console.log('fallback to \'' + fallbackLangId + '\'');
 *    try {
 *        await tr.loadLanguage('en');
 *    } catch (err) {
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
        const chosenLangLookup = this.translationMap.get(id);
        const originalLangLookup = this.translationMapOriginal.get(id);

        if (chosenLangLookup !== undefined) {
            translation = chosenLangLookup;
        } else if (originalLangLookup !== undefined) {
            translation = originalLangLookup;
        }

        return translation;
    }

    public async loadLanguage(langId?: string) {
        const fileName = 'lang.' + langId + '.xlf';
        if (langId !== undefined) {
            this.translationMap = await this.loadFile(fileName);
        }
        this.translationMapOriginal = await this.loadFile('lang.xlf', 'source');
    }

    private loadFile(fileName: string, target?: string): Promise<Map<string, string>> {
        return new Promise<Map<string, string>>((resolve, reject) => {
            let xlfPath = path.join(__dirname, '..', '..', 'ng-app', 'assets', 'locale', fileName);
            fs.readFile(xlfPath, (err, xmlBuffer) => {
                if (err) {
                    reject(err);
                } else {
                    xliff.xliff12ToJs(xmlBuffer.toString(), (err, jsXlf) => {
                        if (err) {
                            reject(err);
                        } else {
                            try {
                                resolve(this.parseJS(jsXlf, target));
                            } catch (err) {
                                reject(err);
                            }
                        }
                    });
                }
            });
        });
    }

    private parseJS(jsXlfObj: any, property?: string): Map<string, string> {
        const langMap = new Map<string, string>();
        const entries = jsXlfObj['resources']['ng2.template'];
        if (property === undefined) {
            property = 'target';
        }
        for (const id in entries) {
            langMap.set(id, entries[id][property]);
        }
        return langMap;
    }
}
