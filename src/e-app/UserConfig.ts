import * as fs from 'fs';

export class UserConfig {
    private data: object;

    constructor(private configFile: string) {
        if (configFile === undefined) { throw Error('No config path defined'); }

        this.validateValues();
    }

    public async set(property: string, value: string) {
        try {
            await this.readConfig();
        } catch (err) {
            if (err.code === 'ENOENT') {
                console.log('Config file (' + this.configFile + ') does not exist. Will be created.');
            } else {
                throw err;
            }
        }
        this.data[property] = value;
        await this.writeConfig();
    }

    public async get(property: string): Promise<string> {
        try {
            await this.readConfig();
        } catch (err) {
            if (err.code !== 'ENOENT') {
                throw err;
            }
        }
        return this.data[property];
    }

    private async writeConfig(): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            fs.writeFile(this.configFile, JSON.stringify(this.data), (err) => {
                if (err) {
                    reject(err)
                } else {
                    resolve();
                }
            });
        });
    }

    private async readConfig(): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            fs.readFile(this.configFile, (err, data) => {
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
    }
}