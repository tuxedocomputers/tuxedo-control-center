/*!
 * Copyright (c) 2019-2020 TUXEDO Computers GmbH <tux@tuxedocomputers.com>
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

import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { ConfigService } from '../config.service';
import { Subscription } from 'rxjs';
import { TccDBusClientService } from '../tcc-dbus-client.service';
import { KeyboardBacklightCapabilitiesInterface, KeyboardBacklightColorModes, KeyboardBacklightStateInterface } from '../../../common/models/TccSettings';

@Component({
    selector: 'app-keyboard-backlight',
    templateUrl: './keyboard-backlight.component.html',
    styleUrls: ['./keyboard-backlight.component.scss'],
    encapsulation: ViewEncapsulation.None
})
export class KeyboardBacklightComponent implements OnInit {
    Object = Object;

    public keyboardBacklightCapabilities: KeyboardBacklightCapabilitiesInterface;
    public keyboardBacklightStates: Array<KeyboardBacklightStateInterface>;
    public chosenBrightness: number;
    public chosenColorHex: Array<string>;
    public selectedZone = 0;
    public brightnessSliderInUsage: boolean = false;
    public brightnessSliderInUsageReset: NodeJS.Timeout = undefined;
    public colorPickerInUsage: Array<boolean> = [false, false, false];
    public colorPickerInUsageReset: Array<NodeJS.Timeout> = [undefined, undefined, undefined];
    public foo: string;

    private keyboardBacklightCapabilitiesSubscription: Subscription = new Subscription();

    public gridParams = {
        cols: 9,
        headerSpan: 3,
        valueSpan: 3,
        inputSpan: 3
    };

    public gridParamsSymmetrical = {
        cols: 9,
        firstSpan: 3,
        secondSpan: 3,
        thirdSpan: 3
    };

    constructor(
        private config: ConfigService,
        private tccdbus: TccDBusClientService
    ) { }


    // Converts Int Value: 0xRRGGBBAA to string value "#RRGGBB"
    private rgbaIntToRGBSharpString (input: number): string {
        return "#" + input.toString(16).padStart(8, '0').substring(0, 6);
    }

    // Converts string Value: "#RRGGBB" to int value 0xRRGGBB00
    private rgbSharpStringToRGBAInt (input: string): number {
        return parseInt(input.substring(1, 7).padEnd(8, '0'), 16);
    }

    private clamp (input: number, min: number, max:number): number {
        return Math.min(Math.max(input, min), max);
    }

    public ngOnInit() {
        this.chosenColorHex = [];
        for (let i = 0; i < this.config.getSettings().keyboardBacklightColor.length; i++) {
            this.chosenColorHex[i] = this.rgbaIntToRGBSharpString(this.config.getSettings().keyboardBacklightColor[i]);
        }
        this.chosenBrightness = this.config.getSettings().keyboardBacklightBrightness;

        this.keyboardBacklightCapabilitiesSubscription.add(this.tccdbus.keyboardBacklightCapabilities.subscribe(
            keyboardBacklightCapabilities => {
                if (keyboardBacklightCapabilities !== undefined) {
                    this.keyboardBacklightCapabilitiesSubscription.unsubscribe();
                    this.keyboardBacklightCapabilities = keyboardBacklightCapabilities;
                    if (this.chosenBrightness === undefined) {
                        this.chosenBrightness = Math.floor(this.keyboardBacklightCapabilities.maxBrightness * 0.5);
                    }
                    else {
                        this.chosenBrightness = this.clamp(this.chosenBrightness, 0, this.keyboardBacklightCapabilities.maxBrightness);
                    }
                    if (this.chosenColorHex.length !== this.keyboardBacklightCapabilities.zones) {
                        this.chosenColorHex = this.chosenColorHex.slice(0, this.keyboardBacklightCapabilities.zones);
                        for (let i = 0; i < this.keyboardBacklightCapabilities.zones; i++) {
                            if (this.chosenColorHex[i] == undefined) {
                                this.chosenColorHex[i] = "#ffffff"
                            }
                        }
                    }
                }
            }
        ));

        this.tccdbus.keyboardBacklightStates.subscribe(
            keyboardBacklightStates => {
                if (
                    keyboardBacklightStates !== undefined &&
                    keyboardBacklightStates.length > 0 &&
                    !this.brightnessSliderInUsage &&
                    !this.colorPickerInUsage[0] &&
                    !this.colorPickerInUsage[1] &&
                    !this.colorPickerInUsage[2] &&
                    !this.colorPickerInUsage[3]
                ) {
                    this.chosenBrightness = keyboardBacklightStates[0].brightness;
                    this.chosenColorHex = []
                    for (let i = 0; i < keyboardBacklightStates.length; ++i) {
                        let rgbaInt = (keyboardBacklightStates[i].red << 24 >>> 0) +
                                      (keyboardBacklightStates[i].green << 16 >>> 0) +
                                      (keyboardBacklightStates[i].blue << 8 >>> 0);
                        this.chosenColorHex.push(this.rgbaIntToRGBSharpString(rgbaInt));
                    }
                }
            }
        );
    }

    private fillKeyboardBacklightStatesFromValues(brightness: number, colorHex: Array<string>): Array<KeyboardBacklightStateInterface> {
        let keyboardBacklightStates: Array<KeyboardBacklightStateInterface> = [];
        if (colorHex === undefined) {
            keyboardBacklightStates.push({
                mode: KeyboardBacklightColorModes.static,
                brightness: brightness,
                red: undefined,
                green: undefined,
                blue: undefined
            });
        }
        else {
            for (let i = 0; i < colorHex.length; ++i) {
                let rgbaInt = this.rgbSharpStringToRGBAInt(colorHex[i]);
                keyboardBacklightStates.push({
                    mode: KeyboardBacklightColorModes.static,
                    brightness: brightness,
                    red: (rgbaInt >>> 24) & 0xff,
                    green: (rgbaInt >>> 16) & 0xff,
                    blue: (rgbaInt >>> 8) & 0xff
                });
            }
        }
        return keyboardBacklightStates;
    }

    public onBrightnessSliderInput(event: any) {
        this.brightnessSliderInUsage = true;
        clearTimeout(this.brightnessSliderInUsageReset);
        this.brightnessSliderInUsageReset = setTimeout(() => {
            this.brightnessSliderInUsage = false;
        }, 10000);
        let colorHex = (this.chosenColorHex === undefined) || (this.chosenColorHex.length == 0) ? undefined : this.chosenColorHex;
        this.chosenBrightness = event.value;
        this.tccdbus.setKeyboardBacklightStates(this.fillKeyboardBacklightStatesFromValues(event.value, colorHex));
    }

    public onBrightnessSliderChange(event: any) {
        clearTimeout(this.brightnessSliderInUsageReset);
        this.brightnessSliderInUsageReset = setTimeout(() => {
            this.brightnessSliderInUsage = false;
        }, 10000);
    }

    public onColorPickerInput(event: any, selectedZone: number) {
        if (event.valid === undefined || event.valid === true) {
            this.colorPickerInUsage[selectedZone] = true;
            clearTimeout(this.colorPickerInUsageReset[selectedZone]);
            this.colorPickerInUsageReset[selectedZone] = setTimeout(() => {
                this.colorPickerInUsage[selectedZone] = false;
            }, 10000);

            let colorHex = this.chosenColorHex;
            if (this. keyboardBacklightCapabilities.zones <= 3) {
                colorHex[selectedZone] = event.color;
            }
            else {
                for (let i = 0; i < colorHex.length; ++i) {
                    colorHex[i] = event.color;
                }
            }
            this.tccdbus.setKeyboardBacklightStates(this.fillKeyboardBacklightStatesFromValues(this.chosenBrightness, colorHex));
        }
    }

    public onColorPickerDragStart(event: any, i: number) {
        if (event.valid === undefined || event.valid === true) {
            this.colorPickerInUsage[i] = true;
            clearTimeout(this.colorPickerInUsageReset[i]);
            this.colorPickerInUsageReset[i] = setTimeout(() => {
                this.colorPickerInUsage[i] = false;
            }, 10000);
        }
    }

    public onColorPickerDragEnd(event: any, i: number) {
        if (event.valid === undefined || event.valid === true) {
            clearTimeout(this.colorPickerInUsageReset[i]);
            this.colorPickerInUsageReset[i] = setTimeout(() => {
                this.colorPickerInUsage[i] = false;
            }, 10000);
        }
    }

    selectedZoneChange(selectedZone: number) {
        this.selectedZone = selectedZone;
    }
    
    private buttonRepeatTimer: NodeJS.Timeout;
    public buttonRepeatDown(action: () => void) {
        if (this.buttonRepeatTimer !== undefined) { clearInterval(this.buttonRepeatTimer); }
        const repeatDelayMS = 200;

        action();
        
        this.buttonRepeatTimer = setInterval(() => {
            action();
        }, repeatDelayMS);
    }

    public buttonRepeatUp() {
        clearInterval(this.buttonRepeatTimer);
    }

    public modifySliderInputFunc(slider, offset: number, min: number, max: number) {
        return () => {
            this.modifySliderInput(slider, offset, min, max);
        }
    }

    public modifySliderInput(slider, offset: number, min: number, max: number) {
            slider.value += offset;
            if (slider.value < min) {
                slider.value = min;
            } else if (slider.value > max) {
                slider.value = max;
            }
            this.onBrightnessSliderInput({value: slider.value});
    }
}
