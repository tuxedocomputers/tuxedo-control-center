/*!
 * Copyright (c) 2019-2026 TUXEDO Computers GmbH <tux@tuxedocomputers.com>
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

import * as fs from 'node:fs';
import { delay, execCommandAsync } from '../../common/classes/Utils';
import { TUXEDODevice } from '../../common/models/DefaultProfiles';
import { DaemonWorker } from './DaemonWorker';
import type { TuxedoControlCenterDaemon } from './TuxedoControlCenterDaemon';

const fsp: typeof import('fs').promises = require('node:fs').promises;

export class PrimeWorker extends DaemonWorker {
    private tuxedoDevice: TUXEDODevice;
    private isDisplayConnectedToNvidia: boolean;
    private primeAvailable: boolean;

    constructor(tccd: TuxedoControlCenterDaemon) {
        super(10000, 'PrimeWorker', tccd);
        this.tuxedoDevice = this.tccd.identifyDevice();
    }

    public async onStart(): Promise<void> {
        // not instantly setting prime status in onStart() because requires_offloading only gets updated after some delay
        // checking it directly in onStart() will result in getting a wrong state
        await delay(2000);

        if (this.tuxedoDevice === TUXEDODevice.IBM15A10) {
            this.isDisplayConnectedToNvidia = await this.getDisplayConnectedToNvidia();
        }

        this.primeAvailable = await this.checkPrimeAvailable();

        this.setPrimeStatus();
    }

    public async onWork(): Promise<void> {
        // checking in case someone changes state externally, otherwise could be removed to avoid periodic checking
        this.setPrimeStatus();
    }

    public async onExit(): Promise<void> {}

    private async setPrimeStatus(): Promise<void> {
        const primeSupported: boolean = await this.checkPrimeSupported();

        if (this.primeAvailable && primeSupported) {
            this.tccd.dbusData.primeState = JSON.stringify(await this.checkPrimeStatus());
        } else {
            this.tccd.dbusData.primeState = JSON.stringify('-1');
        }
    }

    // only supporting gpu switch on systems which can use prime-select since primary focus is Tuxdeo OS and Ubuntu
    // other operating systems may handle this differently and thus can't easily be supported
    private async checkPrimeSupported(): Promise<boolean> {
        if (this.tuxedoDevice === TUXEDODevice.IBM15A10) {
            return !this.isDisplayConnectedToNvidia;
        }

        const offloadingStatus: boolean = fs.existsSync('/var/lib/ubuntu-drivers-common/requires_offloading') === true;

        return offloadingStatus;
    }

    // official prime-select has no dGPU mode in wayland
    private async isTuxPrime(): Promise<boolean> {
        // biome-ignore lint: ${Version} is not a typescript variable here
        const primeSelectVersion: string = (await execCommandAsync("dpkg-query -W -f='${Version}\n' nvidia-prime"))
            .toString()
            .trim();

        return primeSelectVersion.includes('tux');
    }

    private async getDisplayConnectedToNvidia(): Promise<boolean> {
        try {
            const drmPath: string = '/sys/class/drm/';
            const drmDirs: string[] = await fsp.readdir(drmPath);
            const edpDirs: string[] = drmDirs.filter((dir: string) => dir.includes('eDP'));

            for (const edpDir of edpDirs) {
                const edpPath: string = `${drmPath}/${edpDir}`;
                const vendorPath: string = `${edpPath}/device/device/vendor`;
                const statusPath: string = `${edpPath}/status`;

                try {
                    const vendorId: string = (await fsp.readFile(vendorPath, 'utf-8')).trim();
                    const status: string = (await fsp.readFile(statusPath, 'utf-8')).trim();

                    if (vendorId.toLowerCase() === '0x10de' && status === 'connected') {
                        return true;
                    }
                } catch (err: unknown) {
                    console.error(`PrimeWorker: getDisplayConnectedToNvidia failed => ${err}`);
                }
            }

            return false;
        } catch (err: unknown) {
            console.error(`PrimeWorker: getDisplayConnectedToNvidia failed => ${err}`);
            return false;
        }
    }

    private async checkPrimeAvailable(): Promise<boolean> {
        const primeAvailable: boolean = !!(await execCommandAsync('which prime-select')).toString().trim();

        if (primeAvailable) {
            const isTuxPrime: boolean = await this.isTuxPrime();

            if (isTuxPrime) {
                return true;
            }
        }

        return false;
    }

    private async checkPrimeStatus(): Promise<string> {
        return this.transformPrimeStatus(await execCommandAsync('prime-select query'));
    }

    private transformPrimeStatus(status: string): string {
        switch (status) {
            case 'nvidia':
                return 'dGPU';
            case 'intel':
                return 'iGPU';
            case 'on-demand':
                return 'on-demand';
            default:
                return 'off';
        }
    }
}
