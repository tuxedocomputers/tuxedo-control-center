import * as path from 'path';
import * as fs from 'fs';

export interface IUserConfig {
    langId: string;
};

export class UserConfig {
    public data: IUserConfig;

    constructor(private configPath: string) {
        if (configPath === undefined) { throw Error('No config path defined'); }

        this.validateValues();
    }

    async writeConfig(): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            fs.writeFile(path.join(this.configPath, 'user.conf'), JSON.stringify(this.data), (err) => {
                if (err) {
                    reject(err)
                } else {
                    resolve();
                }
            });
        });
    }

    async readConfig(): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            fs.readFile(path.join(this.configPath, 'user.conf'), (err, data) => {
                if (err) {
                    reject(err);
                } else {
                    this.data = JSON.parse(data.toString());
                    this.validateValues();
                    resolve();
                }
            });
        });
    }

    private validateValues(): void {
        if (this.data === undefined) {
            this.data = JSON.parse('{}');
        }

        if (this.data.langId === undefined) {
            this.data.langId = 'en';
        }
    }
}