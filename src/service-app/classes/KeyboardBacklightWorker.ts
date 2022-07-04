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

import * as fs from 'fs';

import { DaemonWorker } from './DaemonWorker';
import { TuxedoControlCenterDaemon } from './TuxedoControlCenterDaemon';
import { KeyboardBacklightColorModes, KeyboardBacklightCapabilitiesInterface } from '../../common/models/TccSettings';
import { fileOK } from '../../common/classes/Utils';

export class KeyboardBacklightWorker extends DaemonWorker {
    private clevoBrightnessPath = "/sys/devices/platform/tuxedo_keyboard/brightness";
    private clevoColorLeftPath = "/sys/devices/platform/tuxedo_keyboard/color_left";
    private clevoColorCenterPath = "/sys/devices/platform/tuxedo_keyboard/color_center";
    private clevoColorRightPath = "/sys/devices/platform/tuxedo_keyboard/color_right";
    private clevoColorExtraPath = "/sys/devices/platform/tuxedo_keyboard/color_extra";
    private keyboardBacklightCapabilities: KeyboardBacklightCapabilitiesInterface = {
        modes: [KeyboardBacklightColorModes.static],
        zones: 0,
        maxBrightness: 0,
        maxRed: 255,
        maxGreen: 255,
        maxBlue: 255
    };

    constructor(tccd: TuxedoControlCenterDaemon) {
        super(100000, tccd);
        if (fileOK(this.clevoBrightnessPath)) {
            this.keyboardBacklightCapabilities.maxBrightness = 100;
        }
        if (fileOK(this.clevoColorCenterPath)) {
            this.keyboardBacklightCapabilities.zones++;
            if (fileOK(this.clevoColorLeftPath)) {
                this.keyboardBacklightCapabilities.zones++;
                if (fileOK(this.clevoColorRightPath)) {
                    this.keyboardBacklightCapabilities.zones++;
                    if (fileOK(this.clevoColorExtraPath)) {
                        this.keyboardBacklightCapabilities.zones++;
                    }
                }
            }
        }
        this.tccd.dbusData.keyboardBacklightCapabilitiesJSON = JSON.stringify(this.keyboardBacklightCapabilities);
    }

    private rgbaIntToRGBString (input: number): string {
        return input.toString(16).padStart(8, '0').substring(0,6);
    }

    public onStart(): void {
        if (fileOK(this.clevoBrightnessPath)) {
            fs.appendFileSync(this.clevoBrightnessPath, this.tccd.settings.keyboardBacklightBrightness.toString());
        }
        if (this.tccd.settings.keyboardBacklightColor.length == this.keyboardBacklightCapabilities.zones) {
            if (fileOK(this.clevoColorCenterPath)) {
                fs.appendFileSync(this.clevoColorCenterPath, this.rgbaIntToRGBString(this.tccd.settings.keyboardBacklightColor[0]));
                if (fileOK(this.clevoColorLeftPath)) {
                    fs.appendFileSync(this.clevoColorLeftPath, this.rgbaIntToRGBString(this.tccd.settings.keyboardBacklightColor[1]));
                    if (fileOK(this.clevoColorRightPath)) {
                        fs.appendFileSync(this.clevoColorRightPath, this.rgbaIntToRGBString(this.tccd.settings.keyboardBacklightColor[2]));
                        if (fileOK(this.clevoColorExtraPath)) {
                            fs.appendFileSync(this.clevoColorExtraPath, this.rgbaIntToRGBString(this.tccd.settings.keyboardBacklightColor[3]));
                        }
                    }
                }
            }
        }
    }

    public onWork(): void {
        //noop
    }

    public onExit(): void {
        //noop
    }
}
