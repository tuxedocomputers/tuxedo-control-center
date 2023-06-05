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

import { Component, OnInit } from "@angular/core";
import { ConfigService } from "../config.service";
import { TccDBusClientService } from "../tcc-dbus-client.service";
import {
    KeyboardBacklightCapabilitiesInterface,
    KeyboardBacklightColorModes,
    KeyboardBacklightStateInterface,
} from "../../../common/models/TccSettings";
import { filter, take } from "rxjs/operators";
import { MatSlider } from "@angular/material/slider";
import { interval, Subscription } from "rxjs";

@Component({
    selector: "app-keyboard-backlight",
    templateUrl: "./keyboard-backlight.component.html",
    styleUrls: ["./keyboard-backlight.component.scss"],
})
export class KeyboardBacklightComponent implements OnInit {
    public keyboardBacklightCapabilities: KeyboardBacklightCapabilitiesInterface;
    public chosenBrightness: number;
    public chosenColorHex: Array<string>;
    public selectedZones: Array<number>;
    private pressTimer: NodeJS.Timeout;
    private pressInterval: Subscription;
    private resetTimeout: NodeJS.Timeout;

    private brightnessSliderInUsage: boolean = false;
    private colorPickerInUsage: Array<boolean> = [];
    private colorPickerInUsageReset: Array<NodeJS.Timeout> = [];

    constructor(
        private config: ConfigService,
        private tccdbus: TccDBusClientService
    ) {}

    public ngOnInit() {
        this.setChosenValues();
        this.subscribeKeyboardBacklightCapabilities();
        this.subscribeKeyboardBacklightStates();
        this.setColorPickerInUsageDefault();
    }

    // Converts integer value: 0xRRGGBBAA or 0xRRGGBB to a string value "#RRGGBB"
    private intToRGBSharpString(input: number): string {
        const hex = input.toString(16).padStart(input <= 0xffffff ? 6 : 8, "0");
        return "#" + hex.substring(0, 6);
    }

    // Converts a string value: "#RRGGBB" to an integer value: 0xRRGGBBAA
    private RGBSharpStringToInt(input: string, alpha = "00"): number {
        const hex = input.replace("#", "") + alpha;
        return parseInt(hex, 16);
    }

    private clamp(input: number, min: number, max: number): number {
        return Math.min(Math.max(input, min), max);
    }

    private setChosenValues() {
        const settings = this.config.getSettings();
        const keyboardBacklightColor = settings.keyboardBacklightColor;
        this.chosenColorHex = keyboardBacklightColor.map((color) =>
            this.intToRGBSharpString(color)
        );
        this.chosenBrightness = settings.keyboardBacklightBrightness;
    }

    private setColorPickerInUsageDefault() {
        const zones = this.keyboardBacklightCapabilities.zones;
        for (let i = 0; i < zones; i++) {
            this.colorPickerInUsage.push(false);
            this.colorPickerInUsageReset.push(undefined);
        }
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
                    const { brightness, red, green, blue } =
                        keyboardBacklightStates[0];
                    this.chosenBrightness = brightness;
                    this.chosenColorHex = this.createColorHexArray(
                        keyboardBacklightStates
                    );
                }
            }
        );
    }

    private createColorHexArray(
        keyboardBacklightStates: KeyboardBacklightStateInterface[]
    ) {
        return keyboardBacklightStates
            .map(({ red, green, blue }) => {
                return (red << 16) + (green << 8) + blue;
            })
            .map(this.intToRGBSharpString);
    }

    private isPickerInUsage() {
        return (
            this.brightnessSliderInUsage ||
            this.colorPickerInUsage.some((colorPicker) => colorPicker)
        );
    }

    private fillKeyboardBacklightStatesFromValues(
        brightness: number,
        colorHex: string[] = []
    ): KeyboardBacklightStateInterface[] {
        return colorHex
            ? colorHex.map((hex) => {
                  const rgbaInt = this.RGBSharpStringToInt(hex);
                  return {
                      mode: KeyboardBacklightColorModes.static,
                      brightness,
                      red: (rgbaInt >>> 24) & 0xff,
                      green: (rgbaInt >>> 16) & 0xff,
                      blue: (rgbaInt >>> 8) & 0xff,
                  };
              })
            : [
                  {
                      mode: KeyboardBacklightColorModes.static,
                      brightness,
                      red: undefined,
                      green: undefined,
                      blue: undefined,
                  },
              ];
    }

    public onBrightnessSliderInput(brightness: number) {
        this.brightnessSliderInUsage = true;
        this.applyBrightnessSliderInUsageReset();
        const colorHex = this.chosenColorHex?.length
            ? this.chosenColorHex
            : undefined;

        this.chosenBrightness = brightness;
        this.tccdbus.setKeyboardBacklightStates(
            this.fillKeyboardBacklightStatesFromValues(brightness, colorHex)
        );
    }

    public onBrightnessSliderChange() {
        this.applyBrightnessSliderInUsageReset();
    }

    private applyBrightnessSliderInUsageReset() {
        clearTimeout(this.resetTimeout);

        if (!this.brightnessSliderInUsage) {
            this.brightnessSliderInUsage = true;
        }

        this.resetTimeout = setTimeout(() => {
            this.brightnessSliderInUsage = false;
        }, 10000);
    }

    private setResetTimeout(
        resetFn: () => void,
        resetVar: NodeJS.Timeout | boolean,
        timeoutMS = 10000
    ) {
        clearTimeout(resetVar as NodeJS.Timeout);
        resetVar = setTimeout(resetFn, timeoutMS);
    }

    public onColorPickerInput(color: string, selectedZones: number[]) {
        let colorHex = this.chosenColorHex;
        const numZones = this.keyboardBacklightCapabilities.zones;

        selectedZones.forEach((zone) => {
            const useFallbackColor = numZones > 4;
            colorHex[zone] = useFallbackColor ? colorHex[0] : color;
            this.setColorPickerUsage(zone, true);
            this.setPickerUsageResetTimeout(zone);
        });

        const backlightStates = this.fillKeyboardBacklightStatesFromValues(
            this.chosenBrightness,
            colorHex
        );
        this.tccdbus.setKeyboardBacklightStates(backlightStates);
    }

    private setColorPickerUsage(zones: number | number[], isUsed: boolean) {
        if (!Array.isArray(zones)) {
            this.colorPickerInUsage[zones] = isUsed;
        } else {
            zones.forEach((zone) => {
                this.colorPickerInUsage[zone] = isUsed;
            });
        }
    }

    private setPickerUsageResetTimeout(zones: number | number[]) {
        if (!Array.isArray(zones)) {
            zones = [zones];
        }

        zones.forEach((zone) => {
            const resetVar = this.colorPickerInUsageReset[zone];
            this.setResetTimeout(() => {
                this.setColorPickerUsage(zone, false);
            }, resetVar);
            this.colorPickerInUsageReset[zone] = resetVar;
        });
    }

    public onColorPickerDragStart(selectedZones: number[]) {
        this.setColorPickerUsage(selectedZones, true);
        this.setPickerUsageResetTimeout(selectedZones);
    }

    public onColorPickerDragEnd(selectedZones: number[]) {
        this.setPickerUsageResetTimeout(selectedZones);
    }

    public selectedZonesChange(selectedZones: number[]) {
        this.selectedZones = selectedZones;
    }

    public startPress(
        slider: MatSlider,
        offset: number,
        min: number,
        max: number
    ): void {
        this.pressTimer = setTimeout(() => {
            this.pressInterval = interval(200).subscribe(() => {
                this.modifySliderInput(slider, offset, min, max);
            });
        }, 500);
        this.modifySliderInput(slider, offset, min, max);
    }

    public stopPress(): void {
        clearTimeout(this.pressTimer);
        if (this.pressInterval) {
            this.pressInterval.unsubscribe();
        }
    }

    public modifySliderInput(
        slider: MatSlider,
        offset: number,
        min: number,
        max: number
    ) {
        this.onBrightnessSliderInput(
            this.clamp(slider.value + offset, min, max)
        );
    }

    public getSelectedColor() {
        return this.chosenColorHex[this.selectedZones[0]];
    }
}
