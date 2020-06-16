import { app, BrowserWindow, ipcMain, Tray, Menu, globalShortcut } from 'electron';
import * as path from 'path';
import * as child_process from 'child_process';

let tccWindow: Electron.BrowserWindow;
let tray: Electron.Tray;

const watchOption = process.argv.includes('--watch');
const trayOnlyOption = process.argv.includes('--tray');

// Ensure that only one instance of the application is running
const applicationLock = app.requestSingleInstanceLock();
if (!applicationLock) {
    quitCurrentTccSession();
}

if (watchOption) {
    require('electron-reload')(path.join(__dirname, '..', 'ng-app'));
}

app.on('second-instance', (event, cmdLine, workingDir) => {
    // If triggered by a second instance, find/show/start GUI
    activateTccGui();
});

app.whenReady().then( () => {
    globalShortcut.register('F24', () => {
        activateTccGui();
    });
    createTccTray();
    if (!trayOnlyOption) {
        activateTccGui();
    }
});

app.on('will-quit', (event) => {
    // Prevent default quit action
    event.preventDefault();

    // Close window but do not quit application unless tray is gone
    if (tccWindow) {
        tccWindow.close();
        tccWindow = null;
    }
    if (!tray || tray.isDestroyed()) {
        app.exit(0);
    }
});

app.on('window-all-closed', () => {
    if (!tray || tray.isDestroyed()) {
        quitCurrentTccSession();
    }
});

function activateTccGui() {
    if (tccWindow) {
        if (tccWindow.isMinimized()) { tccWindow.restore(); }
        tccWindow.focus();
    } else {
        createTccWindow();
    }
}

function createTccTray() {
    tray = new Tray(path.join(__dirname, '../data/dist-data/tuxedo-control-center_256.png'));
    const contextMenu = Menu.buildFromTemplate([
        { label: 'TUXEDO Control Center', type: 'normal', click: () => { activateTccGui(); } },
        { type: 'separator' },
        { label: 'Exit', type: 'normal', click: () => { quitCurrentTccSession(); } }
    ]);
    tray.setToolTip('TUXEDO Control Center');
    tray.setContextMenu(contextMenu);
}

function createTccWindow() {
    tccWindow = new BrowserWindow({
        title: 'TUXEDO Control Center',
        width: 1040,
        height: 750,
        frame: false,
        resizable: true,
        minWidth: 1040,
        minHeight: 750,
        icon: path.join(__dirname, '../data/dist-data/tuxedo-control-center_256.svg'),
        webPreferences: {
            nodeIntegration: true
        }
    });

    const indexPath = path.join(__dirname, '..', 'ng-app', 'index.html');
    tccWindow.loadFile(indexPath);
    tccWindow.on('closed', () => {
        tccWindow = null;
    });
}

function quitCurrentTccSession() {
    if (tray) {
        tray.destroy();
        tray = null;
    }

    app.quit();
}

ipcMain.on('exec-cmd-sync', (event, arg) => {
    try {
        event.returnValue = { data: child_process.execSync(arg), error: undefined };
    } catch (err) {
        event.returnValue = { data: undefined, error: err };
    }
});

ipcMain.on('exec-cmd-async', (event, arg) => {
    child_process.exec(arg, (err, stdout, stderr) => {
        if (err) {
            event.reply('exec-cmd-result', { data: stderr, error: err });
        } else {
            event.reply('exec-cmd-result', { data: stdout, error: err });
        }
    });
});

ipcMain.on('spawn-external-async', (event, arg) => {
    child_process.spawn(arg, { detached: true, stdio: 'ignore' });
});
