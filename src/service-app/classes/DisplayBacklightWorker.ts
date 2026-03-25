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

import { DisplayBacklightController } from '../../common/classes/DisplayBacklightController';
import type { ITccProfile } from '../../common/models/TccProfile';
import { DaemonWorker } from './DaemonWorker';
import type { TuxedoControlCenterDaemon } from './TuxedoControlCenterDaemon';

export class DisplayBacklightWorker extends DaemonWorker {
    private controllers: DisplayBacklightController[];
    private basePath: string = '/sys/class/backlight';

    constructor(tccd: TuxedoControlCenterDaemon) {
        super(3000, 'DisplayBacklightWorker', tccd);
    }

    /**
     * Looks for and updates the list of available sysfs backlight drivers
     */
    private findDrivers(): void {
        const displayDrivers: string[] = DisplayBacklightController.getDeviceList(this.basePath);
        this.controllers = [];
        displayDrivers.forEach((driverName: string): void => {
            this.controllers.push(new DisplayBacklightController(this.basePath, driverName));
        });
    }

    public async onStart(): Promise<void> {
        const currentProfile: ITccProfile = this.activeProfile;

        if (currentProfile.display.useBrightness && currentProfile.display.brightness !== undefined) {
            const brightnessPercent: number = currentProfile.display.brightness;
            this.writeBrightness(brightnessPercent);

            // Recheck workaround for late loaded drivers and drivers that are not ready although
            // already presenting an interface
            setTimeout((): void => {
                this.writeBrightness(brightnessPercent, true);
            }, 2000);
        }
    }

    public async onWork(): Promise<void> {}

    public async onExit(): Promise<void> {}

    private writeBrightness(brightnessPercent: number, recheck?: boolean): void {
        this.findDrivers();
        // Try all possible drivers to be on the safe side, fail silently if they do not work
        for (const controller of this.controllers) {
            let brightnessRaw: number;
            try {
                const maxBrightness: number = controller.maxBrightness.readValue();
                const currentBrightnessRaw: number = controller.brightness.readValue();
                brightnessRaw = Math.round((brightnessPercent * maxBrightness) / 100);

                if (recheck && currentBrightnessRaw !== brightnessRaw) {
                    this.tccd.logLine(
                        `DisplayBacklightWorker: Brightness not as expected for ${controller.driver}, applying value again`,
                    );
                }
                if (!recheck) {
                    this.tccd.logLine(
                        `Set display brightness to ${brightnessPercent}% (${brightnessRaw}) on ${controller.driver}`,
                    );
                }

                controller.brightness.writeValue(brightnessRaw);
            } catch (err: unknown) {
                console.error(
                    `DisplayBacklightWorker: Failed to set display brightness to ${brightnessPercent}% ('${brightnessRaw}') on ${controller.driver} => ${err}`,
                );
            }
        }
    }
}
