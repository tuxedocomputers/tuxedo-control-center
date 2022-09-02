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
import { KeyboardBacklightColorModes, KeyboardBacklightCapabilitiesInterface, KeyboardBacklightStateInterface } from '../../common/models/TccSettings';
import { fileOK } from '../../common/classes/Utils';

export class KeyboardBacklightWorker extends DaemonWorker {
    private clevoLedsWhiteOnly: string = "/sys/devices/platform/tuxedo_keyboard/leds/white:kbd_backlight";
    private clevoLedsRGBZones: Array<string> = ["/sys/devices/platform/tuxedo_keyboard/leds/rgb:kbd_backlight",
                                                "/sys/devices/platform/tuxedo_keyboard/leds/rgb:kbd_backlight_1",
                                                "/sys/devices/platform/tuxedo_keyboard/leds/rgb:kbd_backlight_2"];
    private keyboardBacklightCapabilities: KeyboardBacklightCapabilitiesInterface = {} as KeyboardBacklightCapabilitiesInterface;
    private keyboardBacklightStates: Array<KeyboardBacklightStateInterface> = [];

    constructor(tccd: TuxedoControlCenterDaemon) {
        super(1500, tccd);
    }

    // Converts Int Value: 0xRRGGBBAA to string value "RRR GGG BBB" (in decimal)
    private rgbaIntToRGBDecString (input: number): string {
        let red = (input >> 24) & 0xff;
        let green = (input >> 16) & 0xff;
        let blue = (input >> 8) & 0xff;
        return red.toString(10) + " " + green.toString(10) + " " + blue.toString(10);
    }

    private updateSettingFromValue (keyboardBacklightStatesNew: Array<KeyboardBacklightStateInterface>): void {
        this.tccd.settings.keyboardBacklightColorMode = keyboardBacklightStatesNew[0].mode;
        this.tccd.settings.keyboardBacklightBrightness = keyboardBacklightStatesNew[0].brightness;
        this.tccd.settings.keyboardBacklightColor = [];
        for (let i: number = 0; i < this.clevoLedsRGBZones.length ; ++i) {
            this.tccd.settings.keyboardBacklightColor[i] = (keyboardBacklightStatesNew[i].red << 24) +
                                                            (keyboardBacklightStatesNew[i].green << 16) +
                                                            (keyboardBacklightStatesNew[i].blue << 8);
        }
        this.tccd.config.writeSettings(this.tccd.settings);
    }

    private updateKeyboardBacklightCapabilitiesFromSysFS(): void {
        this.keyboardBacklightCapabilities = {} as KeyboardBacklightCapabilitiesInterface;

        this.keyboardBacklightCapabilities.modes = [KeyboardBacklightColorModes.static];

        if (fileOK(this.clevoLedsWhiteOnly + "/max_brightness")) {
            this.keyboardBacklightCapabilities.maxBrightness = Number(fs.readFileSync(this.clevoLedsWhiteOnly + "/max_brightness"));
            this.keyboardBacklightCapabilities.zones = 1;
        }
        else {
            if (fileOK(this.clevoLedsRGBZones[0] + "/max_brightness")) {
                this.keyboardBacklightCapabilities.maxBrightness = Number(fs.readFileSync(this.clevoLedsRGBZones[0] + "/max_brightness"));
                this.keyboardBacklightCapabilities.maxRed = 0xff;
                this.keyboardBacklightCapabilities.maxGreen = 0xff;
                this.keyboardBacklightCapabilities.maxBlue = 0xff;
                this.keyboardBacklightCapabilities.zones++;
                if (fileOK(this.clevoLedsRGBZones[1] + "/max_brightness")) {
                    this.keyboardBacklightCapabilities.zones++;
                }
                if (fileOK(this.clevoLedsRGBZones[2] + "/max_brightness")) {
                    this.keyboardBacklightCapabilities.zones++;
                }
            }
        }
        this.tccd.dbusData.keyboardBacklightCapabilitiesJSON = JSON.stringify(this.keyboardBacklightCapabilities);
    }

    private updateKeyboardBacklightStatesFromSysFS(): void {
        this.keyboardBacklightStates = [];

        if (fileOK(this.clevoLedsWhiteOnly + "/brightness")) {
            this.keyboardBacklightStates.push({} as KeyboardBacklightStateInterface);
            this.keyboardBacklightStates[0].mode = KeyboardBacklightColorModes.static;
            this.keyboardBacklightStates[0].brightness = Number(fs.readFileSync(this.clevoLedsWhiteOnly + "/brightness"));
        }
        else {
            for (let i: number = 0; i < this.clevoLedsRGBZones.length ; ++i) {
                if (fileOK(this.clevoLedsRGBZones[i] + "/brightness")) {
                    this.keyboardBacklightStates.push({} as KeyboardBacklightStateInterface);

                    this.keyboardBacklightStates[i].mode = KeyboardBacklightColorModes.static;

                    this.keyboardBacklightStates[i].brightness = Number(fs.readFileSync(this.clevoLedsRGBZones[i] + "/brightness"));

                    if (fileOK(this.clevoLedsRGBZones[i] + "/multi_intensity")) {
                        let colors = fs.readFileSync(this.clevoLedsRGBZones[i] + "/multi_intensity").toString().split(' ').map(Number);
                        this.keyboardBacklightStates[i].red = colors[0];
                        this.keyboardBacklightStates[i].green = colors[1];
                        this.keyboardBacklightStates[i].blue = colors[2];
                    }
                }
            }
        }
        this.tccd.dbusData.keyboardBacklightStatesJSON = JSON.stringify(this.keyboardBacklightStates);
    }

    private writeSysFSFromSetting(): void {
        let brightness: Number = this.tccd.settings.keyboardBacklightBrightness;
        if (brightness === undefined) {
            brightness = Math.floor(this.keyboardBacklightCapabilities.maxBrightness * 0.5);
        }

        if (fileOK(this.clevoLedsWhiteOnly + "/brightness")) {
            fs.appendFileSync(this.clevoLedsWhiteOnly + "/brightness", brightness.toString());
        }

        for (let i: number = 0; i < this.clevoLedsRGBZones.length ; ++i) {
            if (fileOK(this.clevoLedsRGBZones[i] + "/brightness")) {
                fs.appendFileSync(this.clevoLedsRGBZones[i] + "/brightness", brightness.toString());
            }
        }

        if (this.tccd.settings.keyboardBacklightColor !== undefined) {
            if (this.tccd.settings.keyboardBacklightColor.length == this.keyboardBacklightCapabilities.zones) {
                for (let i: number = 0; i < this.clevoLedsRGBZones.length ; ++i) {
                    if (fileOK(this.clevoLedsRGBZones[i] + "/multi_intensity")) {
                        fs.appendFileSync(this.clevoLedsRGBZones[i] + "/multi_intensity", this.rgbaIntToRGBDecString(this.tccd.settings.keyboardBacklightColor[i]));
                    }
                }
            }
        }
        else {
            for (let i: number = 0; i < this.clevoLedsRGBZones.length ; ++i) {
                if (fileOK(this.clevoLedsRGBZones[i] + "/multi_intensity")) {
                    fs.appendFileSync(this.clevoLedsRGBZones[i] + "/multi_intensity", "255 255 255");
                }
            }
        }
    }

    public onStart(): void {
        this.updateKeyboardBacklightCapabilitiesFromSysFS();

        this.writeSysFSFromSetting();
        setTimeout(this.onWork.bind(this), 500); // Delay read back a little as the driver waits for the EC to finish applying.

        this.tccd.dbusData.keyboardBacklightStatesNewJSON.subscribe(
            (keyboardBacklightStatesNewJSON) => {
                let keyboardBacklightStatesNew: Array<KeyboardBacklightStateInterface> = JSON.parse(keyboardBacklightStatesNewJSON);
                this.updateSettingFromValue(keyboardBacklightStatesNew);

                this.writeSysFSFromSetting();
                setTimeout(this.onWork.bind(this), 500); // Delay read back a little as the driver waits for the EC to finish applying.
            }
        )
    }

    public onWork(): void {
        this.updateKeyboardBacklightStatesFromSysFS();
        this.updateSettingFromValue(this.keyboardBacklightStates);
    }

    public onExit(): void {
        this.onWork();
    }
}
