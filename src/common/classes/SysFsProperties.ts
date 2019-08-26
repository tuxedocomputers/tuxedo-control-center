import { SysFsPropertyIO } from './SysFsPropertyIO';

export class SysFsPropertyString extends SysFsPropertyIO<string> {

    convertStringToType(value: string): string {
        return value;
    }

    convertTypeToString(value: string): string {
        return value;
    }
}

export class SysFsPropertyStringList extends SysFsPropertyIO<string[]> {

    convertStringToType(value: string): string[] {
        if (value.trim() === '') {
            return [];
        } else {
            const trimmedList = value.split(' ').map((element) => element.trim());
            // Finally filter all empty strings
            return trimmedList.filter(e => e !== '');
        }
    }

    convertTypeToString(value: string[]): string {
        if (value.length === 0) {
            return '';
        } else {
            value = value.map((element) => element.trim());
            return value.join(' ');
        }
    }
}

export class SysFsPropertyInteger extends SysFsPropertyIO<number> {

    convertStringToType(value: string): number {
        return parseInt(value, 10);
    }

    convertTypeToString(value: number): string {
        return value.toString(10);
    }
}

export class SysFsPropertyBoolean extends SysFsPropertyIO<boolean> {

    convertStringToType(value: string): boolean {
        return parseInt(value, 10) === 1;
    }

    convertTypeToString(value: boolean): string {
        if (value) {
            return '1';
        } else {
            return '0';
        }
    }
}

export class SysFsPropertyNumList extends SysFsPropertyIO<number[]> {

    convertStringToType(value: string): number[] {
        const resultArray: number[] = [];

        if (value.trim() === '') { return []; }
        const arrayRanges = value.split(',');
        arrayRanges.forEach((strRange) => {
            const rangeSplit = strRange.split('-');
            if (rangeSplit.length === 1) {
                const nr = Number.parseInt(rangeSplit[0], 10);
                if (Number.isNaN(nr)) { return; }
                resultArray.push(nr);
            } else if (rangeSplit.length === 2) {
                const startNr = Number.parseInt(rangeSplit[0], 10);
                const endNr = Number.parseInt(rangeSplit[1], 10);
                if (Number.isNaN(startNr) || Number.isNaN(endNr)) { return; }
                for (let i = startNr; i <= endNr; ++i) {
                    resultArray.push(i);
                }
            }
        });
        return resultArray;
    }

    convertTypeToString(value: number[]): string {
        if (value.length === 0) { return ''; }

        const resultArray: string[] = [];
        value.sort((a, b) => a - b );

        let currentStart = value[0];

        for (let i = 0; i < value.length; ++i) {
            if (i === value.length - 1 || (value[i + 1] - value[i]) > 1) {
                if (value[i] === currentStart) {
                    resultArray.push(currentStart.toString());
                } else {
                    resultArray.push(currentStart + '-' + value[i]);
                }
                if (i !== value.length - 1) {
                    currentStart = value[i + 1];
                }
            }
        }
        return resultArray.join(',');
    }
}
