import * as fs from 'fs';

export abstract class SysFsController {

    public static getDeviceList(sourceDir: string): string[] {
        try {
            return fs.readdirSync(sourceDir, { withFileTypes: true })
                .map(dirent => dirent.name);
        } catch (err) {
            return [];
        }
    }

    public static getDeviceListDirent(sourceDir: string): fs.Dirent[] {
        try {
            return fs.readdirSync(sourceDir, { withFileTypes: true });
        } catch (err) {
            return [];
        }
    }
}
