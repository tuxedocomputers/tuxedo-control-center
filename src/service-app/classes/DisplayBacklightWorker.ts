/*!
 * Copyright (c) 2019-2022 TUXEDO Computers GmbH <tux@tuxedocomputers.com>
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
import { DaemonWorker } from './DaemonWorker';
import { DisplayBacklightController } from '../../common/classes/DisplayBacklightController';

import { TuxedoControlCenterDaemon } from './TuxedoControlCenterDaemon';

export class DisplayBacklightWorker extends DaemonWorker {

    private controllers: DisplayBacklightController[];
    private basePath = '/sys/class/backlight';
    private useAutosave = false;

    constructor(tccd: TuxedoControlCenterDaemon) {
        super(3000, tccd);
    }

    /**
     * Looks for and updates the list of available sysfs backlight drivers
     */
    private findDrivers(): void {
        const displayDrivers = DisplayBacklightController.getDeviceList(this.basePath);
        this.controllers = [];
        displayDrivers.forEach((driverName) => {
            this.controllers.push(new DisplayBacklightController(this.basePath, driverName));
        });
    }

    public onStart(): void {

        // Figure out which brightness percentage to set
        const currentProfile = this.activeProfile;
        let brightnessPercent;
        if (!currentProfile.display.useBrightness || currentProfile.display.brightness === undefined) {
            if (this.tccd.autosave.displayBrightness === undefined) {
                brightnessPercent = 100;
            } else {
                brightnessPercent = this.tccd.autosave.displayBrightness;
            }
        } else {
            brightnessPercent = currentProfile.display.brightness;
        }

        // Write brightness percentage to driver(s)
        if (this.useAutosave || currentProfile.display.useBrightness) {
            this.writeBrightness(brightnessPercent);

            // Recheck workaround for late loaded drivers and drivers that are not ready although
            // already presenting an interface
            setTimeout(() => { this.writeBrightness(brightnessPercent, true) }, 2000);
        }
    }

    public onWork(): void {
        this.findDrivers(); // Drivers are reenumerated before use since they can change on the fly

        // Possibly save brightness regularly
        for (const controller of this.controllers) {
            let value: number;
            let maxBrightness: number;

            try {
                value = controller.brightness.readValue();
                maxBrightness = controller.maxBrightness.readValue();
                if (!Number.isNaN(value) && value !== 0) {
                    this.tccd.autosave.displayBrightness = Math.round((value * 100) / maxBrightness);
                }
            } catch (err) {
                this.tccd.logLine('DisplayBacklightWorker => ' + err);
            }
        }
    }

    public onExit(): void {
        this.findDrivers(); // Drivers are reenumerated before use since they can change on the fly

        this.controllers.forEach((controller) => {
            let value: number;
            let maxBrightness: number;
            try {
                value = controller.brightness.readValue();
                maxBrightness = controller.maxBrightness.readValue();
            } catch (err) {
                this.tccd.logLine('DisplayBacklightWorker: Failed to read display brightness on exit from '
                    + controller.driver + ' => ' + err);
            }
            if (value !== undefined) {
                if (value === 0) {
                    this.tccd.logLine('DisplayBacklightWorker: Refused to save display brightness 0 from ' + controller.driver);
                } else {
                    this.tccd.autosave.displayBrightness = Math.round((value * 100) / maxBrightness);
                    this.tccd.logLine('DisplayBacklightWorker: Save display brightness '
                        + this.tccd.autosave.displayBrightness + '% (' + value + ') on exit');
                }
            }
        });
    }

    private writeBrightness(brightnessPercent: number, recheck?: boolean): void {
        this.findDrivers();
        // Try all possible drivers to be on the safe side, fail silently if they do not work
        for (const controller of this.controllers) {
            let brightnessRaw: number;
            try {
                const maxBrightness = controller.maxBrightness.readValue();
                const currentBrightnessRaw = controller.brightness.readValue();
                brightnessRaw = Math.round((brightnessPercent * maxBrightness) / 100);

                if (recheck && (currentBrightnessRaw !== brightnessRaw)) {
                    this.tccd.logLine('DisplayBacklightWorker: Brightness not as expected for '
                        + controller.driver + ', applying value again..');
                }
                if (!recheck) {
                    this.tccd.logLine('Set display brightness to '
                        + brightnessPercent + '% (' + brightnessRaw + ') on ' + controller.driver);
                }
                
                controller.brightness.writeValue(brightnessRaw);

            } catch (err) {
                this.tccd.logLine('Failed to set display brightness to '
                    + brightnessPercent + '% (' + brightnessRaw + ') on ' + controller.driver);
            }
        }
    }
}
