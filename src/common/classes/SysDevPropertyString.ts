import { SysDevIO } from './SysDevPropertyIO';

export class SysDevPropertyString extends SysDevIO<string> {

    convertStringToType(value: string): string {
        return value;
    }

    convertTypeToString(value: string): string {
        return value;
    }
}
