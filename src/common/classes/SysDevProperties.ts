import { SysDevPropertyIO } from './SysDevPropertyIO';

export class SysDevPropertyString extends SysDevPropertyIO<string> {

    convertStringToType(value: string): string {
        return value;
    }

    convertTypeToString(value: string): string {
        return value;
    }
}

export class SysDevPropertyStringList extends SysDevPropertyIO<string[]> {

    convertStringToType(value: string): string[] {
        if (value.trim() === '') {
            return [];
        } else {
            return value.split(' ');
        }
    }

    convertTypeToString(value: string[]): string {
        if (value.length === 0) {
            return '';
        } else {
            return value.join(' ');
        }
    }
}

export class SysDevPropertyInteger extends SysDevPropertyIO<number> {

    convertStringToType(value: string): number {
        return parseInt(value, 10);
    }

    convertTypeToString(value: number): string {
        return value.toString(10);
    }
}
