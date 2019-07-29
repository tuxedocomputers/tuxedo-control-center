import { SysDevIO } from './SysDevPropertyIO';

export class SysDevPropertyStringList extends SysDevIO<string[]> {

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
