/*!
 * Copyright (c) 2019-2021 TUXEDO Computers GmbH <tux@tuxedocomputers.com>
 *
 * This file is part of TUXEDO Control Center.
 *
 * TUXEDO Control Center is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * TUXEDO Control Center is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with TUXEDO Control Center.  If not, see <https://www.gnu.org/licenses/>.
 */

import { Menu, Tray } from "electron";
import { TccProfile } from "../common/models/TccProfile";

export class TccTray {

    private tray: Electron.Tray;

    public state = new TrayState();
    public events = new TrayEvents();

    constructor(public trayIcon) {}

    public isActive() {
        return this.tray !== undefined && !this.tray.isDestroyed();
    }

    public destroy() {
        this.tray.destroy();
    }

    public async create() {
        
        if (!this.tray) {
            this.tray = new Tray(this.trayIcon);
            this.tray.setTitle('TUXEDO Control Center');
            this.tray.setToolTip('TUXEDO Control Center');
        }
    
        const profilesSubmenu: Object[] = this.state.profiles.map(profile => {
            // Creation of each profile selection submenu item
            return {
                label: profile.name,
                click: () => this.events.profileClick(profile.name),
                type: 'radio',
                checked: profile.name === this.state.activeProfile.name
            };
        });

        // Add profiles submenu "header"
        profilesSubmenu.unshift(
            { label: 'Activate profile temporarily', enabled: false },
            { type: 'separator' }
        );
    
        const contextMenu = Menu.buildFromTemplate([
            { label: 'TUXEDO Control Center', type: 'normal', click: () => this.events.startTCCClick() },
            {
                label: 'Profiles',
                submenu: profilesSubmenu,
                visible: this.state.profiles.length > 0
            },
            {
                    label: 'Tray autostart', type: 'checkbox', checked: this.state.isAutostartTrayInstalled,
                    click: () => this.events.autostartTrayToggle()
            },
            {
                label: 'Power save blocker',
                type: 'checkbox',
                click: () => { this.events.powersaveBlockerClick(); },
                checked: this.state.powersaveBlockerActive
            },
            { type: 'separator', visible: this.state.isPrimeSupported },
            {
                label: 'Graphics',
                visible: this.state.isPrimeSupported,
                submenu: [
                    {
                        label: 'Select NVIDIA',
                        type: 'normal',
                        click: () => this.events.selectNvidiaClick(),
                        visible: this.state.primeQuery !== 'on'
                    },
                    {
                        label: 'Select built-in',
                        type: 'normal',
                        click: () => this.events.selectBuiltInClick(),
                        visible: this.state.primeQuery !== 'off'
                    }
                ]
            },
            { type: 'separator' },
            { label: this.state.tccGUIVersion, type: 'normal', enabled: false },
            { type: 'separator' },
            { label: 'Exit', type: 'normal', click: () => this.events.exitClick() }
        ]);
        this.tray.setContextMenu(contextMenu);
    }
}

export class TrayState {
    tccGUIVersion: string;
    isAutostartTrayInstalled: boolean;
    isPrimeSupported: boolean;
    primeQuery: string;
    activeProfile: TccProfile;
    profiles: TccProfile[];
    powersaveBlockerActive: boolean
};

export class TrayEvents {
    startTCCClick: () => void;
    exitClick: () => void;
    autostartTrayToggle: () => void;
    selectNvidiaClick: () => void;
    selectBuiltInClick: () => void;
    profileClick: (profileName: string) => void;
    powersaveBlockerClick: () => void;
}
