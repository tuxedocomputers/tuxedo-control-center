import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import * as child_process from 'child_process';

let win: Electron.BrowserWindow;

const watch = process.argv.includes('--watch');

if (watch) {
    require('electron-reload')(path.join(__dirname, '..'));
}

function createWindow() {
    win = new BrowserWindow({
        title: 'TUXEDO Control Center',
        frame: false,
        resizable: false,
        icon: path.join(__dirname, '../data/dist-data/tuxedo-control-center_256.png'),
        webPreferences: {
            nodeIntegration: true
        },
    });

    const indexPath = path.join(__dirname, '..', 'ng-app', 'index.html');
    win.loadFile(indexPath);
    win.on('closed', () => {
        win = null;
    });
}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (win === null) {
        createWindow();
    }
});

ipcMain.on('sudo-exec', (event, arg) => {
    try {
        event.returnValue = child_process.execSync(arg);
    } catch (err) {
        event.returnValue = err;
    }
});
