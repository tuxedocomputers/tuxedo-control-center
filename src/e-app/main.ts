import { app, BrowserWindow } from 'electron';
import * as os from 'os';

let win: Electron.BrowserWindow;

function createWindow() {
    win = new BrowserWindow({
        title: 'TUXEDO Control Center',
        frame: false,
        resizable: false,
        webPreferences: {
            nodeIntegration: true
        },
    });
    win.loadFile('./ng-app/index.html');
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
