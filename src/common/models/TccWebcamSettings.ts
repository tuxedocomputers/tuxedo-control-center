export interface WebcamJSON {
    presetName: string;
    webcamId: string;
    webcamSettings: WebcamSettigs[];
}

export interface WebcamSettigs {
    config_category: string;
    config_data: [SliderInterface, BoolInterface, MenuInterface];
    config_type: string;
}

export interface SliderInterface {
    active: boolean;
    current: number;
    default: number;
    max: number;
    name: string;
    step: number;
    title: string;
    type: string;
}

export interface BoolInterface {
    active: boolean;
    current: boolean;
    default: boolean;
    max: boolean;
    min: boolean;
    name: string;
    step: number;
    title: string;
    type: string;
}

export interface MenuInterface {
    active: boolean;
    current: string;
    default: string;
    name: string;
    options: string[];
    title: string;
    type: string;
}

export interface ExportWebcamJSON {
    presetName: string;
    webcamId: string;
    webcamSettings: WebcamJSONValues;
}

export interface WebcamJSONValues {
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
