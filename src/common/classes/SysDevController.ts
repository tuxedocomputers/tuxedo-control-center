import * as fs from 'fs';

export class SysDevController {

    public static getDeviceList(sourceDir: string) {
        try {
            return fs.readdirSync(sourceDir, { withFileTypes: true })
                .map(dirent => dirent.name);
        } catch (err) {
            return [];
        }
    }
}
