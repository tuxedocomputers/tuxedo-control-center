import { SysDevIO } from './SysDevPropertyIO';

export class SysDevPropertyInteger extends SysDevIO<number> {

    convertStringToType(value: string): number {
        return parseInt(value, 10);
    }

    convertTypeToString(value: number): string {
        return value.toString(10);
    }
}
