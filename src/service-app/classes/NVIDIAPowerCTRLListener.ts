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

import { SysFsPropertyInteger } from '../../common/classes/SysFsProperties';
import { execCommandSync } from '../../common/classes/Utils';
import { DaemonListener } from './DaemonListener';
import type { TuxedoControlCenterDaemon } from './TuxedoControlCenterDaemon';

export class NVIDIAPowerCTRLListener extends DaemonListener {
    private ctgpOffsetPath: string = '/sys/devices/platform/tuxedo_nvidia_power_ctrl/ctgp_offset';
    private ctgpOffsetSysfsProp: SysFsPropertyInteger = new SysFsPropertyInteger(this.ctgpOffsetPath);
    private ctgpAvailable: boolean = this.ctgpOffsetSysfsProp.isAvailable() && this.checkNvidiaSmiInstalled();

    constructor(tccd: TuxedoControlCenterDaemon) {
        super(tccd);

        this.init();
    }

    public onActiveProfileChanged(): void {
        if (!this.ctgpAvailable) {
            return;
        }

        this.applyActiveProfile();
    }

    private init(): void {
        if (!this.ctgpAvailable) {
            return;
        }

        this.ctgpOffsetSysfsProp.setFSWatchListener(
            function (event: 'rename' | 'change', _filename: string): void {
                const ctgpOffset: number =
                    this.tccd.activeProfile.nvidiaPowerCTRLProfile !== undefined &&
                    this.tccd.activeProfile.nvidiaPowerCTRLProfile.cTGPOffset !== undefined
                        ? this.tccd.activeProfile.nvidiaPowerCTRLProfile.cTGPOffset
                        : 0;
                if (event === 'change' && this.ctgpOffsetSysfsProp.readValueNT() !== ctgpOffset) {
                    this.ctgpOffsetSysfsProp.writeValue(ctgpOffset);
                }
            }.bind(this),
        );

        this.applyActiveProfile();

        try {
            const defaultPowerLimit: number = this.getDefaultPowerLimit();
            const maxPowerLimit: number = this.getMaxPowerLimit();

            if (defaultPowerLimit && maxPowerLimit) {
                this.tccd.dbusData.nvidiaPowerCTRLAvailable = true;
                this.tccd.dbusData.nvidiaPowerCTRLDefaultPowerLimit = defaultPowerLimit;
                this.tccd.dbusData.nvidiaPowerCTRLMaxPowerLimit = maxPowerLimit;
            } else {
                this.tccd.dbusData.nvidiaPowerCTRLAvailable = false;
                this.tccd.dbusData.nvidiaPowerCTRLDefaultPowerLimit = -1;
                this.tccd.dbusData.nvidiaPowerCTRLMaxPowerLimit = -1;
            }
        } catch (err: unknown) {
            console.error(`NVIDIAPowerCTRLListener: init failed => ${err}`);
        }
    }

    public getDefaultPowerLimit(): number {
        try {
            const defaultPowerLimit: string = execCommandSync(
                'nvidia-smi --format=csv,noheader,nounits --query-gpu=power.default_limit',
            );

            if (defaultPowerLimit) {
                return Number(defaultPowerLimit);
            }

            console.log('NVIDIAPowerCTRLListener: Default nvidia power limit not available');
            return undefined;
        } catch (err: unknown) {
            console.log(`NVIDIAPowerCTRLListener: getDefaultPowerLimit failed => ${err}`);
            return undefined;
        }
    }

    public getMaxPowerLimit(): number {
        try {
            const maxPowerLimit: string = execCommandSync(
                'nvidia-smi --format=csv,noheader,nounits --query-gpu=power.max_limit',
            );

            if (maxPowerLimit) {
                return Number(maxPowerLimit);
            }

            console.log('NVIDIAPowerCTRLListener: Maximum nvidia power limit not available');
            return undefined;
        } catch (err: unknown) {
            console.log(`NVIDIAPowerCTRLListener: getMaxPowerLimit failed => ${err}`);
            return undefined;
        }
    }

    private checkNvidiaSmiInstalled(): boolean {
        try {
            const stdout: string = execCommandSync('which nvidia-smi');
            return stdout?.trim()?.length > 0;
        } catch (err: unknown) {
            console.error(`NVIDIAPowerCTRLListener: checkNvidiaSmiInstalled failed => ${err}`);
            return false;
        }
    }

    private applyActiveProfile(): void {
        const ctgpOffset: number =
            this.tccd?.activeProfile?.nvidiaPowerCTRLProfile !== undefined &&
            this.tccd?.activeProfile?.nvidiaPowerCTRLProfile?.cTGPOffset !== undefined
                ? this.tccd.activeProfile.nvidiaPowerCTRLProfile.cTGPOffset
                : 0;
        this.ctgpOffsetSysfsProp.writeValue(ctgpOffset);
    }
}
