import { ipcMain, app, dialog, BrowserWindow } from 'electron';

export function registerLegacyHandlers() {
    ipcMain.on('get-cwd', (event) => {
        event.returnValue = process.cwd();
    });

    ipcMain.on('get-app-version', (event) => {
        event.returnValue = app.getVersion();
    });

    ipcMain.on('get-process-versions', (event) => {
        event.returnValue = process.versions;
    });

    ipcMain.handle('dialog-show-message-box', async (event, options) => {
        const win = BrowserWindow.fromWebContents(event.sender) || BrowserWindow.getFocusedWindow();
        return await dialog.showMessageBox(win, options);
    });

    ipcMain.on('window-close', (event) => {
        const win = BrowserWindow.fromWebContents(event.sender);
        if (win) win.close();
    });

    ipcMain.on('window-minimize', (event) => {
        const win = BrowserWindow.fromWebContents(event.sender);
        if (win) win.minimize();
    });

    ipcMain.on('window-maximize', (event) => {
        const win = BrowserWindow.fromWebContents(event.sender);
        if (win) {
             if (win.isMaximized()) win.unmaximize();
             else win.maximize();
        }
    });
}
