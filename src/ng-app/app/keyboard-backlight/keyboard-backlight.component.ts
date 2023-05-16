/*!
 * Copyright (c) 2019-2023 TUXEDO Computers GmbH <tux@tuxedocomputers.com>
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
import { TccDBusClientService } from '../tcc-dbus-client.service';
import { KeyboardBacklightCapabilitiesInterface, KeyboardBacklightColorModes, KeyboardBacklightStateInterface } from '../../../common/models/TccSettings';
import { filter, take } from 'rxjs/operators';

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
    public selectedZones: Array<number>;

    public brightnessSliderInUsage: boolean = false;
    public brightnessSliderInUsageReset: NodeJS.Timeout = undefined;
    public colorPickerInUsage: Array<boolean> = [false, false, false];
    public colorPickerInUsageReset: Array<NodeJS.Timeout> = [undefined, undefined, undefined];
    public foo: string;

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

    public ngOnInit() {
        this.setChosenValues();
        this.subscribeKeyboardBacklightCapabilities();
        this.subscribeKeyboardBacklightStates();
    }

    // Converts Int Value: 0xRRGGBBAA to string value "#RRGGBB"
    private rgbaIntToRGBSharpString (input: number): string {
        return "#" + input.toString(16).padStart(8, '0').substring(0, 6);
    }

    // Converts Int Value: 0xRRGGBB to string value "#RRGGBB"
    private rgbIntToRGBSharpString (input: number): string {
        return "#" + input.toString(16).padStart(6, "0");
    }

    // Converts string Value: "#RRGGBB" to int value 0xRRGGBB00
    private rgbSharpStringToRGBAInt (input: string): number {
        return parseInt(input.substring(1, 7).padEnd(8, '0'), 16);
    }

    private clamp (input: number, min: number, max:number): number {
        return Math.min(Math.max(input, min), max);
    }

    private setChosenValues() {
        const settings = this.config.getSettings();
        const keyboardBacklightColor = settings.keyboardBacklightColor;
        this.chosenColorHex = keyboardBacklightColor.map((color) =>
            this.rgbaIntToRGBSharpString(color)
        );
        this.chosenBrightness = settings.keyboardBacklightBrightness;
    }

    private subscribeKeyboardBacklightCapabilities() {
        this.tccdbus.keyboardBacklightCapabilities
            .pipe(filter(Boolean), take(1))
            .subscribe((capabilities: KeyboardBacklightCapabilitiesInterface) => 
                this.applyBacklightCapabilities(capabilities)
            );
    }

    private applyBacklightCapabilities(
        keyboardBacklightCapabilities: KeyboardBacklightCapabilitiesInterface
    ) {
        const { maxBrightness, zones } = keyboardBacklightCapabilities;

        this.keyboardBacklightCapabilities = keyboardBacklightCapabilities;
        this.chosenBrightness = this.clamp(
            this.chosenBrightness || Math.floor(maxBrightness * 0.5),
            0,
            maxBrightness
        );

        const validColors = this.chosenColorHex?.slice(0, zones) ?? [];
        const defaultColors = Array.from(
            { length: zones - validColors.length },
            () => "#ffffff"
        );
        this.chosenColorHex = [...validColors, ...defaultColors].map(
            (color) => color ?? "#ffffff"
        );
    }

    private subscribeKeyboardBacklightStates() {
        this.tccdbus.keyboardBacklightStates.subscribe(
            (keyboardBacklightStates) => {
                const hasChosenColor = keyboardBacklightStates?.length > 0;
                const hasNoPickerInUsage = !this.isPickerInUsage();

                if (hasChosenColor && hasNoPickerInUsage) {
                    const [first] = keyboardBacklightStates;
                    this.chosenBrightness = first.brightness;
                    this.chosenColorHex = keyboardBacklightStates.map(
                        ({ red, green, blue }) => {
                            return (red << 16) + (green << 8) + blue;
                        }
                    ).map(this.rgbIntToRGBSharpString)
                }
            }
        );
    }

    isPickerInUsage() {
        return (
            this.brightnessSliderInUsage ||
            this.colorPickerInUsage.some((colorPicker) => colorPicker)
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

    public onColorPickerInput(event: any, selectedZones: number[]) {
        if (event.valid !== undefined && event.valid !== true) {
            return;
        }

        const colorHex = this.chosenColorHex;
        const numZones = this.keyboardBacklightCapabilities.zones;
        selectedZones.forEach((zone) => {
            this.colorPickerInUsage[zone] = true;
            clearTimeout(this.colorPickerInUsageReset[zone]);
            this.colorPickerInUsageReset[zone] = setTimeout(() => {
                this.colorPickerInUsage[zone] = false;
            }, 10000);

            colorHex[zone] =
                numZones <= 4 ? event.color : (colorHex[0] = event.color);
        });

        const backlightStates = this.fillKeyboardBacklightStatesFromValues(
            this.chosenBrightness,
            colorHex
        );
        this.tccdbus.setKeyboardBacklightStates(backlightStates);
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

    selectedZonesChange(selectedZones: number[]) {
        this.selectedZones = selectedZones;
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