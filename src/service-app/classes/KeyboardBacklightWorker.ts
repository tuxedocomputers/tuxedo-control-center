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
    private clevoLedsWhiteOnly = "/sys/devices/platform/tuxedo_keyboard/leds/white:kbd_backlight";
    private clevoLedsRGBZone0 = "/sys/devices/platform/tuxedo_keyboard/leds/rgb:kbd_backlight";
    private clevoLedsRGBZone1 = "/sys/devices/platform/tuxedo_keyboard/leds/rgb:kbd_backlight_1";
    private clevoLedsRGBZone2 = "/sys/devices/platform/tuxedo_keyboard/leds/rgb:kbd_backlight_2";
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

        if (fileOK(this.clevoLedsWhiteOnly + "/max_brightness")) {
            this.keyboardBacklightCapabilities.maxBrightness = Number(fs.readFileSync(this.clevoLedsWhiteOnly + "/max_brightness"));
            this.keyboardBacklightCapabilities.zones = 1;
            this.keyboardBacklightCapabilities.maxRed = 0;
            this.keyboardBacklightCapabilities.maxGreen = 0;
            this.keyboardBacklightCapabilities.maxBlue = 0;
        }
        else {
            if (fileOK(this.clevoLedsRGBZone0 + "/max_brightness")) {
                this.keyboardBacklightCapabilities.maxBrightness = Number(fs.readFileSync(this.clevoLedsRGBZone0 + "/max_brightness"));
                this.keyboardBacklightCapabilities.zones++;
                if (fileOK(this.clevoLedsRGBZone1 + "/max_brightness")) {
                    this.keyboardBacklightCapabilities.zones++;
                }
                if (fileOK(this.clevoLedsRGBZone2 + "/max_brightness")) {
                    this.keyboardBacklightCapabilities.zones++;
                }
            }
        }
        this.tccd.dbusData.keyboardBacklightCapabilitiesJSON = JSON.stringify(this.keyboardBacklightCapabilities);
    }

    // Converts Int Value: 0xRRGGBBAA to string value "RRR GGG BBB" (in decimal)
    private rgbaIntToRGBDecString (input: number): string {
        let red = (input >> 24) & 0xff;
        let green = (input >> 16) & 0xff;
        let blue = (input >> 8) & 0xff;
        return red.toString(10) + " " + green.toString(10) + " " + blue.toString(10);
    }

    public onStart(): void {
        let brightness: Number = this.tccd.settings.keyboardBacklightBrightness;
        if (brightness === undefined) {
            brightness = Math.floor(this.keyboardBacklightCapabilities.maxBrightness * 0.5);
        }

        if (fileOK(this.clevoLedsWhiteOnly + "/brightness")) {
            fs.appendFileSync(this.clevoLedsWhiteOnly + "/brightness", brightness.toString());
        }
        if (fileOK(this.clevoLedsRGBZone0 + "/brightness")) {
            fs.appendFileSync(this.clevoLedsRGBZone0 + "/brightness", brightness.toString());
        }
        if (fileOK(this.clevoLedsRGBZone1 + "/brightness")) {
            fs.appendFileSync(this.clevoLedsRGBZone1 + "/brightness", brightness.toString());
        }
        if (fileOK(this.clevoLedsRGBZone2 + "/brightness")) {
            fs.appendFileSync(this.clevoLedsRGBZone2 + "/brightness", brightness.toString());
        }

        if (this.tccd.settings.keyboardBacklightColor.length == this.keyboardBacklightCapabilities.zones) {
            if (fileOK(this.clevoLedsRGBZone0 + "/multi_intensity")) {
                fs.appendFileSync(this.clevoLedsRGBZone0 + "/multi_intensity", this.rgbaIntToRGBDecString(this.tccd.settings.keyboardBacklightColor[0]));
            }
            if (fileOK(this.clevoLedsRGBZone1 + "/multi_intensity")) {
                fs.appendFileSync(this.clevoLedsRGBZone1 + "/multi_intensity", this.rgbaIntToRGBDecString(this.tccd.settings.keyboardBacklightColor[1]));
            }
            if (fileOK(this.clevoLedsRGBZone2 + "/multi_intensity")) {
                fs.appendFileSync(this.clevoLedsRGBZone2 + "/multi_intensity", this.rgbaIntToRGBDecString(this.tccd.settings.keyboardBacklightColor[2]));
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
