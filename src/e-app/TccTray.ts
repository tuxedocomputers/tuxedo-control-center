/*!
 * Copyright (c) 2019-2025 TUXEDO Computers GmbH <tux@tuxedocomputers.com>
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

    public state: TrayState = new TrayState();
    public events: TrayEvents = new TrayEvents();

    constructor(public trayIcon: Electron.NativeImage | string) {
    }

    public isActive(): boolean {
        return this.tray !== undefined && !this.tray.isDestroyed();
    }

    public destroy(): void {
        this.tray.destroy();
    }

    public async create(): Promise<void> {

        if (!this.tray) {
            this.tray = new Tray(this.trayIcon);
            this.tray.setTitle('TUXEDO Control Center');
            this.tray.setToolTip('TUXEDO Control Center');
        }

        // todo: add type, don't use Object as type
        const profilesSubmenu: Object[] = this.state.profiles.map((profile: TccProfile): { label: string, click: () => void, type: string, checked: boolean} => {
            // Creation of each profile selection submenu item
            return {
                label: profile.name,
                click: (): void => this.events.profileClick(profile?.id),
                type: 'radio',
                checked: profile?.id === this.state?.activeProfile?.id
            };
        });

        // Add profiles submenu "header"
        profilesSubmenu.unshift(
            { label: 'Activate profile temporarily', enabled: false },
            { type: 'separator' }
        );

        const contextMenu: Menu = Menu.buildFromTemplate([
            { label: 'TUXEDO Control Center', type: 'normal', click: (): void => this.events.startTCCClick() },
            { label: 'Aquaris control', type: 'normal', click: (): void => this.events.startAquarisControl(), visible: this.state.hasAquaris },
            {
                label: 'Profiles',
                submenu: profilesSubmenu,
                visible: this.state.profiles?.length > 0
            },
            {
                    label: 'Tray autostart', type: 'checkbox', checked: this.state.isAutostartTrayInstalled,
                    click: (): void => this.events.autostartTrayToggle()
            },
            {
                label: 'Power save blocker',
                type: 'checkbox',
                click: (): void => { this.events.powersaveBlockerClick(); },
                checked: this.state.powersaveBlockerActive
            },
            {
                label: "Fn-Lock",
                type: "checkbox",
                click: (): void => {
                    this.events.fnLockClick(this.state.fnLockStatus);
                },
                checked: this.state.fnLockStatus,
                visible: this.state.fnLockSupported,
            },
            { type: 'separator', visible: this.state.isPrimeSupported && this.state.isX11 },
            {
                label: 'Graphics',
                visible: this.state.isPrimeSupported && this.state.isX11,
                submenu: [
                    {
                        label: 'Select dGPU',
                        type: 'normal',
                        click: (): void => this.events.selectNvidiaClick(),
                        visible: this.state.primeQuery !== 'dGPU',
                    },
                    {
                        label: 'Apply on-demand mode',
                        type: 'normal',
                        click: (): void => this.events.selectOnDemandClick(),
                        visible: this.state.primeQuery !== 'on-demand'
                    },
                    {
                        label: 'Select iGPU',
                        type: 'normal',
                        click: (): void => this.events.selectBuiltInClick(),
                        visible: this.state.primeQuery !== 'iGPU'
                    }
                ],
            },
            { type: 'separator' },
            { label: this.state.tccGUIVersion, type: 'normal', enabled: false },
            { type: 'separator' },
            { label: 'Exit', type: 'normal', click: (): void => this.events.exitClick() }
        ]);
        this.tray.setContextMenu(contextMenu);
    }
}

class TrayState {
    tccGUIVersion: string;
    isAutostartTrayInstalled: boolean;
    isPrimeSupported: boolean;
    isX11: boolean;
    primeQuery: string;
    activeProfile: TccProfile;
    profiles: TccProfile[];
    powersaveBlockerActive: boolean
    fnLockSupported: boolean;
    fnLockStatus: boolean;
    hasAquaris: boolean;
};

class TrayEvents {
    startTCCClick: () => void;
    startAquarisControl: () => void;
    exitClick: () => void;
    autostartTrayToggle: () => void;
    selectNvidiaClick: () => void;
    selectOnDemandClick: () => void;
    selectBuiltInClick: () => void;
    profileClick: (profileId: string) => void;
    powersaveBlockerClick: () => void;
    fnLockClick: (value: boolean) => void;
}
