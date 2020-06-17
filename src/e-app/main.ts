import { app, BrowserWindow, ipcMain, Tray, Menu, globalShortcut } from 'electron';
import * as path from 'path';
import * as child_process from 'child_process';
import * as fs from 'fs';
import * as os from 'os';

// Tweak to get correct dirname for resource files outside app.asar
const appPath = __dirname.replace('app.asar/', '');

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
    const success = globalShortcut.register('Super+Alt+F6', () => {
        activateTccGui();
    });
    if (!success) { console.log('Failed to register global shortcut'); }

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
        // Actually quit
        globalShortcut.unregisterAll();
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
    const trayInstalled = isAutostartTrayInstalled();
    if (!tray) {
        tray = new Tray(path.join(__dirname, '../data/dist-data/tuxedo-control-center_256.png'));
        tray.setTitle('TUXEDO Control Center');
        tray.setToolTip('TUXEDO Control Center');
    }
    const contextMenu = Menu.buildFromTemplate([
        { label: 'TUXEDO Control Center', type: 'normal', click: () => { activateTccGui(); } },
        {
                label: 'Tray autostart', type: 'checkbox', checked: trayInstalled,
                click: () => trayInstalled ? menuRemoveAutostartTray() : menuInstallAutostartTray()
        },
        { type: 'separator' },
        { label: 'Exit', type: 'normal', click: () => { quitCurrentTccSession(); } }
    ]);
    tray.setContextMenu(contextMenu);
}

function menuInstallAutostartTray() {
    installAutostartTray();
    createTccTray();
}

function menuRemoveAutostartTray() {
    removeAutostartTray();
    createTccTray();
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
        icon: path.join(__dirname, '../data/dist-data/tuxedo-control-center_256.png'),
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

const autostartLocation = path.join(os.homedir(), '.config/autostart');
const autostartDesktopFilename = 'tuxedo-control-center-tray.desktop';

function installAutostartTray(): boolean {
    try {
        fs.copyFileSync(
            path.join(appPath, '../data/dist-data', autostartDesktopFilename),
            path.join(autostartLocation, autostartDesktopFilename)
        );
        return true;
    } catch (err) {
        console.log('Failed to install autostart tray -> ' + err);
        return false;
    }
}

function removeAutostartTray(): boolean {
    try {
        if (fs.existsSync(path.join(autostartLocation, autostartDesktopFilename))) {
            fs.unlinkSync(path.join(autostartLocation, autostartDesktopFilename));
        }
        return true;
    } catch (err) {
        console.log('Failed to remove autostart tray -> ' + err);
        return false;
    }
}

function isAutostartTrayInstalled(): boolean {
    try {
        return fs.existsSync(path.join(autostartLocation, autostartDesktopFilename));
    } catch (err) {
        console.log('Failed to check if autostart tray is installed -> ' + err);
        return false;
    }
}
