export interface WebcamDeviceInformation {
    active: boolean;
    category: string;
    current: string | number | boolean;
    default: string | number | boolean;
    max?: number;
    min?: number;
    name: string;
    step?: number;
    options?: string[];
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
