export interface ITccFanTable {
    name: string;
    entries: ITccFanTableEntry[];
}

export interface ITccFanTableEntry {
    temp: number;
    speed: number;
}

export const defaultFanTable = {
    name: 'Normal',
    entries: [
        { temp: 44, speed: 10 },
        { temp: 45, speed: 10 },
        { temp: 46, speed: 10 },
        { temp: 47, speed: 12 },
        { temp: 48, speed: 12 },
        { temp: 49, speed: 12 },
        { temp: 50, speed: 15 },
        { temp: 51, speed: 15 },
        { temp: 52, speed: 15 },
        { temp: 53, speed: 17 },
        { temp: 54, speed: 17 },
        { temp: 55, speed: 17 },
        { temp: 56, speed: 19 },
        { temp: 57, speed: 19 },
        { temp: 58, speed: 19 },
        { temp: 59, speed: 22 },
        { temp: 60, speed: 23 },
        { temp: 61, speed: 24 },
        { temp: 62, speed: 25 },
        { temp: 63, speed: 27 },
        { temp: 64, speed: 29 },
        { temp: 65, speed: 35 },
        { temp: 66, speed: 35 },
        { temp: 67, speed: 37 },
        { temp: 68, speed: 37 },
        { temp: 69, speed: 42 },
        { temp: 70, speed: 42 },
        { temp: 71, speed: 45 },
        { temp: 72, speed: 45 },
        { temp: 73, speed: 45 },
        { temp: 74, speed: 50 },
        { temp: 75, speed: 50 },
        { temp: 76, speed: 55 },
        { temp: 77, speed: 55 },
        { temp: 78, speed: 60 },
        { temp: 79, speed: 60 },
        { temp: 80, speed: 70 },
        { temp: 81, speed: 70 },
        { temp: 82, speed: 75 },
        { temp: 83, speed: 80 },
        { temp: 84, speed: 80 },
        { temp: 85, speed: 85 },
        { temp: 86, speed: 85 },
        { temp: 87, speed: 85 },
        { temp: 88, speed: 90 },
        { temp: 89, speed: 90 },
        { temp: 90, speed: 90 },
        { temp: 91, speed: 100 },
        { temp: 92, speed: 100 },
        { temp: 93, speed: 100 },
        { temp: 94, speed: 100 },
        { temp: 95, speed: 100 },
        { temp: 96, speed: 100 },
        { temp: 97, speed: 100 },
        { temp: 98, speed: 100 },
        { temp: 99, speed: 100 },
        { temp: 100, speed: 100 }
    ]
};
