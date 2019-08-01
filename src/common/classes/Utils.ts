import * as fs from 'fs';

export function getDirectories(source: string) {
    try {
        return fs.readdirSync(source, { withFileTypes: true })
            .filter(dirent => dirent.isDirectory())
            .map(dirent => dirent.name);
    } catch (err) {
        return [];
    }
}

export function getFiles(source) {
    try {
        return fs.readdirSync(source, { withFileTypes: true })
            .filter(dirent => dirent.isFile())
            .map(dirent => dirent.name);
    } catch (err) {
        return [];
    }
}
