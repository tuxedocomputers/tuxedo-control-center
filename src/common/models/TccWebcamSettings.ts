// todo: product id / vendor id for profile check
export interface WebcamSettigs {
    config_category: string;
    config_data: [SliderInterface, BoolInterface, MenuInterface];
    config_type: string;
}

export interface SliderInterface {
    active: boolean;
    default: number;
    max: number;
    name: string;
    step: number;
    title: string;
    type: string;
}

export interface BoolInterface {
    active: boolean;
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
    default: string;
    name: string;
    options: string[];
    title: string;
    type: string;
}
