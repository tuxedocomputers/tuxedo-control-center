/*!
 * Copyright (c) 2024 TUXEDO Computers GmbH <tux@tuxedocomputers.com>
 *
 * This file is part of TUXEDO Control Center.
 *
 * TUXEDO Control Center is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * TUXEDO Control Center is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with TUXEDO Control Center.  If not, see <https://www.gnu.org/licenses/>.
 */
import 'jasmine';
import { ValueBuffer } from './FanControlLogic';

class TestValues {
    public testValues: number[];
    public result: number;
}

describe('FanLogic ValueBuffer', () => {

    let buffer: ValueBuffer;

    let testData: TestValues[] = [];
    testData.push({
        testValues: [
            63, 39, 34, 92, 93, 85,
            59,  2, 19, 97, 79, 54,
            74
        ],
        result: 65
    });

    testData.push({
        testValues: [
            77, 22, 68, 41, 82, 92,
            21, 61, 13, 22, 23, 26,
            31
        ],
        result: 39
    });

    testData.push({
        testValues: [
            26, 62, 87, 61, 16, 97,
            74,  2, 77, 91, 64, 80,
            73
        ],
        result: 70
    });

    beforeEach(() => {
        buffer = new ValueBuffer();
    });

    afterEach(() => {
    });

    it('should handle sample test data cases', () => {
        for (let data of testData) {
            buffer = new ValueBuffer();
            for (let value of data.testValues) {
                buffer.addValue(value);
            }
            expect(buffer.getFilteredValue()).toBe(data.result);
        }
    });

    it('should handle not completely filled buffer', () => {
        buffer.addValue(20);
        expect(buffer.getFilteredValue()).toBe(20);
        buffer.addValue(40);
        expect(buffer.getFilteredValue()).toBe(30);
        buffer.addValue(60);
        buffer.addValue(80);
        expect(buffer.getFilteredValue()).toBe(50);
        buffer.addValue(10);
        buffer.addValue(90);
        expect(buffer.getFilteredValue()).toBe(50);
        buffer.addValue(50);
        // Filled with seven values, filling with two extreme values (one high one low)
        // outside previous range => should get filtered away
        buffer.addValue(1);
        buffer.addValue(95);
        expect(buffer.getFilteredValue()).toBe(50);
    });

    it('should roll the buffer', () => {
        // Fill with 0-12
        for (let i = 0; i < 13; ++i) {
            buffer.addValue(i);
        }

        // Overwrite all but one with 5s
        for (let i = 0; i < 12; ++i) {
            buffer.addValue(5);
        }
        expect(buffer.getBufferCopy()[0]).toBe(12);

        // Fill last space with another 5
        buffer.addValue(5);
        // Should have overwritten complete buffer with 5s
        expect(buffer.getBufferCopy()).toEqual(Array(13).fill(5));
    });

    it('should work as previous implementation', () => {
        let referenceBuffer: OriginalValueBuffer;

        // Let's do 100 tests
        for (let i = 0; i < 100; ++i) {
            buffer = new ValueBuffer();
            referenceBuffer = new OriginalValueBuffer();

            // ...of random length
            const nrValues = Math.floor(Math.random() * 15) + 1;
            for (let j = 0; j < nrValues; ++j) {
                // ...and random values
                const randomTemp = Math.floor(Math.random() * 101);
                buffer.addValue(randomTemp);
                referenceBuffer.addValue(randomTemp);
            }
            expect(buffer.getBufferCopy()).toEqual(referenceBuffer.getBufferCopy());
            expect(buffer.getFilteredValue()).toEqual(referenceBuffer.getFilteredValue());
        }
    });
});

class OriginalValueBuffer {
    private bufferData: Array<number>;
    private bufferMaxSize = 13; // Buffer max size

    constructor() {
        this.bufferData = new Array();
    }

    public addValue(value: number): void {
        this.bufferData.push(value);
        while (this.bufferData.length > this.bufferMaxSize) {
            this.bufferData.shift();
        }
    }

    public getFilteredValue(): number {
        // Number of values to reduce to, to take average from
        // Note (bufferMaxSize - usedSize) / 2 values are ignored on either side
        const usedSize = 7;

        const copy = Array.from(this.bufferData);
        copy.sort((a, b) => a - b);

        while (copy.length >= usedSize + 2) {
            copy.shift();
            copy.pop();
        }

        // Calculate average from rest of array
        const averageValue = Math.round(copy.reduce((accVal, currentValue) => accVal + currentValue) / copy.length);
        return averageValue;
    }

    public getBufferCopy(): Array<number> {
        return Array.from(this.bufferData);
    }
}
