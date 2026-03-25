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

export interface WebcamDeviceInformation {
    active: boolean;
    category: string;
    current: string | number | boolean;
    default: string | number | boolean;
    max?: number;
    min?: number;
    name: string;
    step?: number;
    options?: number[] | string[];
    title: string;
    type: string;
}

export interface WebcamPreset {
    active: boolean;
    presetName: string;
    webcamId: string;
    webcamSettings: WebcamPresetValues;
}

export interface WebcamPresetValues {
    auto_exposure?: string;
    backlight_compensation?: boolean;
    brightness?: number;
    contrast?: number;
    exposure_absolute?: number;
    exposure_auto?: string;
    exposure_auto_priority?: boolean;
    exposure_dynamic_framerate?: boolean;
    exposure_time_absolute?: number;
    fps?: number;
    gain?: number;
    gamma?: number;
    hue?: number;
    resolution?: string;
    saturation?: number;
    sharpness?: number;
    white_balance_automatic?: boolean;
    white_balance_temperature?: number;
    white_balance_temperature_auto?: boolean;
    [key: string]: boolean | number | string;
}

export interface WebcamDevice {
    deviceId: string;
    id: string;
    label: string;
    path: string;
}

export interface WebcamConstraints {
    deviceId: string | { exact: string };
    frameRate: number | { exact: number };
    height: number | { exact: number };
    width: number | { exact: number };
}

export interface WebcamPath {
    [key: string]: string;
}
