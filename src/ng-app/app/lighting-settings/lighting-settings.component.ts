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

import { Component, type OnDestroy, type OnInit } from '@angular/core';
// biome-ignore lint: injection token
import { ActivatedRoute } from '@angular/router';
import { interval, Subscription } from 'rxjs';
import { GridParamsSettings, type IGridParams } from '../../../common/models/IGridParams';
import {
    type KeyboardCapabilitiesInterface,
    KeyboardColorModes,
    type KeyboardStateInterface,
    type LightbarCapabilitiesInterface,
    type LightbarStateInterface,
} from '../../../common/models/TccSettings';
// biome-ignore lint: injection token
import { ConfigService } from '../config.service';
// biome-ignore lint: injection token
import { TccDBusClientService } from '../tcc-dbus-client.service';

@Component({
    selector: 'app-lighting-settings',
    templateUrl: './lighting-settings.component.html',
    styleUrls: ['./lighting-settings.component.scss'],
    standalone: false,
})
export class LightingComponent implements OnInit, OnDestroy {
    public keyboardCapabilities: KeyboardCapabilitiesInterface | undefined;
    private lightbarCapabilities: LightbarCapabilitiesInterface | undefined;

    public keyboardBrightness: number = -1;
    public keyboardColorHex: string[] = [];
    private keyboardColorHexPending: string[] = [];
    private chosenKeyboardBrightnessPending: number = -1;
    public keyboardMaxBrightness: number = -1;
    public selectedKeyboardZones: number[] = [];

    public lightbarBrightness: number = -1;
    private lightbarColorHex: string = '#ffffff';
    private lightbarColorHexPending: string = '#ffffff';
    private lightbarBrightnessPending: number = -1;
    public lightbarMaxBrightness: number = -1;

    private keyboardColorPickerTimeout: NodeJS.Timeout | undefined;
    private keyboardBrightnessSliderTimeout: NodeJS.Timeout | undefined;

    private lightbarColorPickerTimeout: NodeJS.Timeout | undefined;
    private lightbarBrightnessSliderTimeout: NodeJS.Timeout | undefined;

    private pressTimer: NodeJS.Timeout | undefined;
    private pressInterval: Subscription | undefined;

    private keyboardColorPickerInUsage: boolean[] = [];
    private keyboardBrightnessSliderInUsage: boolean = false;
    private lightbarColorPickerInUsage: boolean = false;
    private lightbarBrightnessSliderInUsage: boolean = false;

    private readonly timeoutDuration: number = 3000;
    public gridParams: IGridParams = GridParamsSettings;

    private subscriptions = new Subscription();

    constructor(
        public config: ConfigService,
        private tccdbus: TccDBusClientService,
        private route: ActivatedRoute,
    ) {}

    public ngOnInit(): void {
        this.initSubscriptions();
        this.setDefaultColorPickerUsage();
    }

    private initSubscriptions(): void {
        this.setValuesFromRoute();

        this.subscriptions.add(
            this.tccdbus.keyboardStates.subscribe((states: KeyboardStateInterface[]) =>
                this.updateKeyboardStates(states),
            ),
        );
        this.subscriptions.add(
            this.tccdbus.lightbarStates.subscribe((states: LightbarStateInterface) =>
                this.updateLightbarStates(states),
            ),
        );
    }

    private setValuesFromRoute() {
        const data = this.route.snapshot.data;
        this.applyKeyboardCapabilities(data.keyboardCapabilities);
        this.applyLightbarCapabilities(data.lightbarCapabilities);
    }

    private applyKeyboardCapabilities(capabilities: KeyboardCapabilitiesInterface): void {
        this.keyboardCapabilities = capabilities;
        this.keyboardBrightness = this.clamp(
            this.keyboardBrightness ?? Math.floor(capabilities.maxBrightness * 0.5),
            0,
            capabilities.maxBrightness,
        );

        const validColors: string[] = this.keyboardColorHex ?? [];
        const defaultColors: string[] = Array.from(
            { length: capabilities.zones - validColors.length },
            () => '#ffffff',
        );
        this.keyboardColorHex = [...validColors, ...defaultColors].map((color: string) => color ?? '#ffffff');
        this.keyboardMaxBrightness = capabilities.maxBrightness;
    }

    private applyLightbarCapabilities(capabilities: LightbarCapabilitiesInterface): void {
        this.lightbarCapabilities = capabilities;
        this.lightbarBrightness = this.clamp(
            this.lightbarBrightness ?? Math.floor(capabilities.maxBrightness * 0.5),
            0,
            capabilities.maxBrightness,
        );

        this.lightbarMaxBrightness = capabilities.maxBrightness;
    }

    private updateKeyboardStates(states: KeyboardStateInterface[]): void {
        if (!states?.length) return;

        if (states.length > 0 && !this.isKeyboardColorPickerInUsage()) {
            this.keyboardBrightness = states[0]?.brightness;
            this.keyboardColorHex = this.colorArrayToHexArray(states);
        } else {
            this.chosenKeyboardBrightnessPending = states[0]?.brightness;
            this.keyboardColorHexPending = this.colorArrayToHexArray(states);
        }
    }

    private updateLightbarStates(states: LightbarStateInterface): void {
        if (!states) return;

        const colorInt: number = (states.red << 16) + (states.green << 8) + states.blue;
        const shiftedColorInt: number = (colorInt << 8) >>> 0;

        if (!this.isLightbarColorPickerInUsage()) {
            this.lightbarBrightness = states.brightness;
            this.lightbarColorHex = this.intToHex(shiftedColorInt);
        } else {
            this.lightbarBrightnessPending = states.brightness;
            this.lightbarColorHexPending = this.intToHex(shiftedColorInt);
        }
    }

    // example: 4278190080 -> #ff0000
    private intToHex(input: number): string {
        const hex: string = input.toString(16).padStart(8, '0');
        return `#${hex.substring(0, 6)}`;
    }

    // example: #ff0000 -> 4278190080
    private hexToInt(input: string, alpha: string = '00'): number {
        const hex = input.replace('#', '') + alpha;
        return parseInt(hex, 16);
    }

    // example: [{ "red": 255, "green": 0, "blue": 0 }] -> ["#ff0000"]
    private colorArrayToHexArray(states: KeyboardStateInterface[]): string[] {
        return states.map(({ red, green, blue }) => {
            const colorInt: number = (red << 16) + (green << 8) + blue;
            const shiftedColorInt: number = (colorInt << 8) >>> 0;
            return this.intToHex(shiftedColorInt);
        });
    }

    // example: 4278190080 -> { "red": 255, "green": 0, "blue": 0 }
    private intToColor(rgbaInt: number): { red: number; green: number; blue: number } {
        return {
            red: (rgbaInt >>> 24) & 0xff,
            green: (rgbaInt >>> 16) & 0xff,
            blue: (rgbaInt >>> 8) & 0xff,
        };
    }

    private clamp(value: number, min: number, max: number): number {
        return Math.min(Math.max(value, min), max);
    }

    public onKeyboardBrightnessSliderInput(brightness: number): void {
        this.triggerKeyboardBrightnessTimeout();
        this.keyboardBrightness = brightness;
        this.setKeyboardStates(this.fillKeyboardStatesFromValues(brightness, this.keyboardColorHex));
    }

    public onLightbarBrightnessSliderInput(brightness: number): void {
        if (!this.lightbarColorHex) return;

        this.triggerLightbarBrightnessTimeout();
        this.lightbarBrightness = brightness;
        const { red, green, blue } = this.intToColor(this.hexToInt(this.lightbarColorHex));
        this.tccdbus.setLightbarStates({ brightness, red, green, blue });
    }

    public onKeyboardColorPickerInput(color: string, zones: number[]): void {
        this.triggerKeyboardColorTimeout(zones);
        zones.forEach((zone: number) => (this.keyboardColorHex[zone] = color));
        this.setKeyboardStates(this.fillKeyboardStatesFromValues(this.keyboardBrightness, this.keyboardColorHex));
    }

    public onLightbarColorPickerInput(color: string): void {
        this.triggerLightbarColorTimeout();
        this.lightbarColorHex = color;
        const { red, green, blue } = this.intToColor(this.hexToInt(color));
        this.tccdbus.setLightbarStates({ brightness: this.lightbarBrightness, red, green, blue });
    }

    private triggerKeyboardBrightnessTimeout(): void {
        if (this.keyboardBrightnessSliderTimeout) {
            clearTimeout(this.keyboardBrightnessSliderTimeout);
        }

        this.keyboardBrightnessSliderInUsage = true;

        this.keyboardBrightnessSliderTimeout = setTimeout(() => {
            this.keyboardBrightnessSliderInUsage = false;
            this.applyPendingChanges();
        }, this.timeoutDuration);
    }

    private triggerKeyboardColorTimeout(zones: number[]): void {
        if (this.keyboardColorPickerTimeout) {
            clearTimeout(this.keyboardColorPickerTimeout);
        }

        zones.forEach((zone: number) => (this.keyboardColorPickerInUsage[zone] = true));
        this.keyboardColorPickerTimeout = setTimeout(() => {
            zones.forEach((zone: number) => (this.keyboardColorPickerInUsage[zone] = false));
            this.applyPendingChanges();
        }, this.timeoutDuration);
    }

    private triggerLightbarBrightnessTimeout(): void {
        if (this.lightbarBrightnessSliderTimeout) {
            clearTimeout(this.lightbarBrightnessSliderTimeout);
        }

        this.lightbarBrightnessSliderInUsage = true;

        this.lightbarBrightnessSliderTimeout = setTimeout(() => {
            this.lightbarBrightnessSliderInUsage = false;
            this.applyPendingChanges();
        }, this.timeoutDuration);
    }

    private triggerLightbarColorTimeout(): void {
        if (this.lightbarColorPickerTimeout) {
            clearTimeout(this.lightbarColorPickerTimeout);
        }

        this.lightbarColorPickerInUsage = true;

        this.lightbarColorPickerTimeout = setTimeout(() => {
            this.lightbarColorPickerInUsage = false;
            this.applyPendingChanges();
        }, this.timeoutDuration);
    }

    private applyPendingChanges(): void {
        if (!this.isKeyboardColorPickerInUsage() && !this.isLightbarColorPickerInUsage()) {
            if (this.chosenKeyboardBrightnessPending !== -1) {
                this.keyboardBrightness = this.chosenKeyboardBrightnessPending;
                this.chosenKeyboardBrightnessPending = -1;
            }
            if (this.keyboardColorHexPending.length > 0) {
                this.keyboardColorHex = this.keyboardColorHexPending;
                this.keyboardColorHexPending = [];
            }
            if (this.lightbarBrightnessPending !== -1) {
                this.lightbarBrightness = this.lightbarBrightnessPending;
                this.lightbarBrightnessPending = -1;
            }
            if (this.lightbarColorHexPending !== '') {
                this.lightbarColorHex = this.lightbarColorHexPending;
                this.lightbarColorHexPending = '';
            }
        }
    }

    public startKeyboardPress(slider: HTMLInputElement, offset: number, min: number, max: number): void {
        this.pressTimer = setTimeout(() => {
            this.pressInterval = interval(200).subscribe(() =>
                this.modifyKeyboardBrightnessSlider(slider, offset, min, max),
            );
        }, 500);
        this.modifyKeyboardBrightnessSlider(slider, offset, min, max);
    }

    public startLightbarPress(slider: HTMLInputElement, offset: number, min: number, max: number): void {
        this.pressTimer = setTimeout(() => {
            this.pressInterval = interval(200).subscribe(() =>
                this.modifyLightbarBrightnessSlider(slider, offset, min, max),
            );
        }, 500);
        this.modifyLightbarBrightnessSlider(slider, offset, min, max);
    }

    private modifyKeyboardBrightnessSlider(slider: HTMLInputElement, offset: number, min: number, max: number): void {
        let newValue = +slider.value + offset;
        newValue = this.clamp(newValue, min, max);
        this.onKeyboardBrightnessSliderInput(newValue);
    }

    private modifyLightbarBrightnessSlider(slider: HTMLInputElement, offset: number, min: number, max: number): void {
        let newValue = +slider.value + offset;
        newValue = this.clamp(newValue, min, max);
        this.onLightbarBrightnessSliderInput(newValue);
    }

    public stopPress(): void {
        clearTimeout(this.pressTimer);
        if (this.pressInterval) this.pressInterval.unsubscribe();
    }

    private isKeyboardColorPickerInUsage(): boolean {
        return this.keyboardColorPickerInUsage.some(Boolean) || this.keyboardBrightnessSliderInUsage;
    }

    private isLightbarColorPickerInUsage(): boolean {
        return this.lightbarColorPickerInUsage || this.lightbarBrightnessSliderInUsage;
    }

    private setDefaultColorPickerUsage(): void {
        const zones: number = this.keyboardCapabilities?.zones ?? 0;
        this.keyboardColorPickerInUsage = Array.from({ length: zones }, () => false);
        this.lightbarColorPickerInUsage = false;
    }

    private fillKeyboardStatesFromValues(brightness: number, colorHex: string[]): KeyboardStateInterface[] {
        return colorHex.map((hex: string) => {
            const { red, green, blue } = this.intToColor(this.hexToInt(hex));
            return {
                mode: KeyboardColorModes.static,
                brightness,
                red,
                green,
                blue,
            };
        });
    }

    public getSelectedKeyboardColor(): string {
        return this.keyboardColorHex[this.selectedKeyboardZones[0]] ?? '#ffffff';
    }

    public getLightbarColor(): string {
        return this.lightbarColorHex ?? '#ffffff';
    }

    private setKeyboardStates(states: KeyboardStateInterface[]): void {
        this.tccdbus.setKeyboardStates(states);
    }

    public selectedKeyboardZonesChange(selectedKeyboardZones: number[]): void {
        this.selectedKeyboardZones = selectedKeyboardZones;
    }

    public onKeyboardColorPickerDragStart(zones: number[]): void {
        this.triggerKeyboardColorTimeout(zones);
    }

    public onKeyboardColorPickerDragEnd(zones: number[]): void {
        this.triggerKeyboardColorTimeout(zones);
    }

    public ngOnDestroy(): void {
        this.subscriptions.unsubscribe();
    }
}
