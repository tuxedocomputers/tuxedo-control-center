export interface WebcamDeviceInformation {
    active: boolean;
    cagegory: string;
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
    presetName: string;
    webcamId: string;
    webcamSettings: WebcamPresetValues;
}

export interface WebcamPresetValues {
    backlight_compensation?: boolean;
    brightness?: number;
    contrast?: number;
    exposure_absolute?: number;
    exposure_auto?: string;
    exposure_auto_priority?: boolean;
    fps?: number;
    gain?: number;
    gamma?: number;
    hue?: number;
    resolution?: string;
    saturation?: number;
    sharpness?: number;
    white_balance_temperature?: number;
    white_balance_temperature_auto?: boolean;
}

export interface WebcamDevice {
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
