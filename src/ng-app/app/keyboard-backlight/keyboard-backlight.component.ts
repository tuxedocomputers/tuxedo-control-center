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

import { Component, OnInit, inject } from "@angular/core";
import { TccDBusClientService } from "../tcc-dbus-client.service";
import { ConfigService } from '../config.service';
import {
    KeyboardBacklightCapabilitiesInterface,
    KeyboardBacklightColorModes,
    KeyboardBacklightStateInterface,
} from "../../../common/models/TccSettings";
import { filter, take } from "rxjs/operators";
import { interval, Subscription } from "rxjs";
import { SharedModule } from '../shared/shared.module';

@Component({
  standalone: true,
  imports: [SharedModule], 
    selector: "app-keyboard-backlight",
    templateUrl: "./keyboard-backlight.component.html",
    styleUrls: ["./keyboard-backlight.component.scss"],
    
})
export class KeyboardBacklightComponent implements OnInit {
    private config = inject(ConfigService);
    private tccdbus = inject(TccDBusClientService);

    public keyboardBacklightCapabilities: KeyboardBacklightCapabilitiesInterface;
    public chosenBrightness: number;
    public chosenBrightnessPending: number = undefined;
    public chosenColorHex: string[];
    public chosenColorHexPending: string[] = undefined;
    public selectedZones: number[];
    private pressTimer: NodeJS.Timeout;
    private pressInterval: Subscription;
    private colorPickerInUsage: boolean[] = [];
    private colorPickerTimeout: NodeJS.Timeout;
    private brightnessSliderInUsage: boolean;
    private brightnessSliderTimeout: number | null = null;
    private timeoutDuration = 1000;



    public ngOnInit() {
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

    private setColorPickerInUsageDefault(): void {
        const zones = this.keyboardBacklightCapabilities.zones;
        for (let i = 0; i < zones; i++) {
            this.colorPickerInUsage.push(false);
        }
    }

    private subscribeKeyboardBacklightCapabilities(): void {
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

    private subscribeKeyboardBacklightStates(): void {
        this.tccdbus.keyboardBacklightStates.subscribe(
            (keyboardBacklightStates) => {
                const hasChosenColor = keyboardBacklightStates?.length > 0;
                const hasNoPickerInUsage = !this.isPickerInUsage();
                const { brightness, red: _red, green: _green, blue: _blue } =
                    keyboardBacklightStates[0];

                if (hasChosenColor && hasNoPickerInUsage) {
                    this.chosenBrightness = brightness;
                    this.chosenColorHex = this.createColorHexArray(
                        keyboardBacklightStates
                    );
                }
                else {
                    this.chosenBrightnessPending = brightness;
                    this.chosenColorHexPending = this.createColorHexArray(
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

    public isPickerInUsage(): boolean {
        return (
            this.colorPickerInUsage.some((inUse) => inUse) ||
            this.brightnessSliderInUsage
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

    public onBrightnessSliderInput(brightness: number): void {
        this.triggerBrightnessSliderTimeout();
        const colorHex = this.chosenColorHex?.length
            ? this.chosenColorHex
            : undefined;

        this.chosenBrightness = brightness;
        this.tccdbus.setKeyboardBacklightStates(
            this.fillKeyboardBacklightStatesFromValues(brightness, colorHex)
        );
    }

    public onBrightnessSliderChange(): void {
        // Event handler called by template
    }

    public onColorPickerInput(color: string, selectedZones: number[]): void {
        this.triggerColorPickerTimeout(selectedZones);

        const colorHex = this.chosenColorHex;
        for (const zone of selectedZones) {
            colorHex[zone] = color;
        }

        const backlightStates = this.fillKeyboardBacklightStatesFromValues(
            this.chosenBrightness,
            colorHex
        );
        this.tccdbus.setKeyboardBacklightStates(backlightStates);
    }

    public onColorPickerDragStart(selectedZones: number[]): void {
        this.triggerColorPickerTimeout(selectedZones);
    }

    public onColorPickerDragEnd(selectedZones: number[]): void {
        this.triggerColorPickerTimeout(selectedZones);
    }

    public selectedZonesChange(selectedZones: number[]): void {
        this.selectedZones = selectedZones;
    }

    private triggerBrightnessSliderTimeout(): void {
        if (this.brightnessSliderTimeout !== null) {
            clearTimeout(this.brightnessSliderTimeout);
        }
        this.brightnessSliderInUsage = true;
        this.brightnessSliderTimeout = window.setTimeout(() => {
            this.brightnessSliderInUsage = false;
            this.applyPendingChanges();
        }, this.timeoutDuration);
    }

    private triggerColorPickerTimeout(selectedZones: number[]): void {
        if (this.colorPickerTimeout) {
            clearTimeout(this.colorPickerTimeout);
        }
        selectedZones.forEach((zone) => {
            this.colorPickerInUsage[zone] = true;
        });

        this.colorPickerTimeout = setTimeout(() => {
            selectedZones.forEach((zone) => {
                this.colorPickerInUsage[zone] = false;
            });
            this.applyPendingChanges();
        }, this.timeoutDuration);
    }

    private applyPendingChanges(): void {
        if (!this.isPickerInUsage()) {
            if (this.chosenBrightnessPending != undefined) {
                this.chosenBrightness = this.chosenBrightnessPending;
                this.chosenBrightnessPending = undefined;
            }
            if (this.chosenColorHexPending != undefined) {
                this.chosenColorHex = this.chosenColorHexPending;
                this.chosenColorHexPending = undefined;
            }
        }
    }

    public startPress(
        offset: number,
        min: number,
        max: number
    ): void {
        this.pressTimer = setTimeout(() => {
            this.pressInterval = interval(200).subscribe(() => {
                this.modifySliderInput(offset, min, max);
            });
        }, 500);
        this.modifySliderInput(offset, min, max);
    }

    public stopPress(): void {
        clearTimeout(this.pressTimer);
        if (this.pressInterval) {
            this.pressInterval.unsubscribe();
        }
    }

    public modifySliderInput(
        offset: number,
        min: number,
        max: number
    ): void {
        this.onBrightnessSliderInput(
            this.clamp(this.chosenBrightness + offset, min, max)
        );
    }

    public getSelectedColor(): string {
        return this.chosenColorHex[this.selectedZones[0]];
    }
}
