/*!
 * Copyright (c) 2019-2025 TUXEDO Computers GmbH <tux@tuxedocomputers.com>
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

import type { ITccFanTableEntry } from "../models/TccFanTable";

async function interpolatePoints(
    points: ITccFanTableEntry[],
    x: number
): Promise<number> {
    const first: ITccFanTableEntry = points[0];
    const last: ITccFanTableEntry = points[points.length - 1];
    if (x <= first.temp) {
        return first.speed;
    }
    if (x >= last.temp) {
        return last.speed;
    }
    const i: number =
        points.findIndex(
            (p: ITccFanTableEntry, idx: number): boolean =>
                p.temp >= x || idx === points.length - 1
        ) - 1;
    const { temp: x1, speed: y1 } = points[i];
    const { temp: x2, speed: y2 } = points[i + 1];
    const m: number = (y2 - y1) / (x2 - x1);
    const b: number = y1 - m * x1;
    return Math.round(m * x + b);
}

export async function interpolatePointsArray(
    points: ITccFanTableEntry[]
): Promise<number[]> {
    return Promise.all(
        Array.from(
            { length: 101 },
            (_: unknown, i: number): Promise<number> =>
                interpolatePoints(points, i)
        )
    );
}

export function formatTemp(value: number, usingFahrenheit: boolean): string {
    if (usingFahrenheit) {
        return `${Math.round(value * 1.8 + 32)} °F`;
    } else {
        return `${value} °C`;
    }
}

/**
 * Ensure minimum fan speed if temperature is high
 */
export function manageCriticalTemperature(temp: number, speed: number): number {
    return temp >= 90
        ? Math.max(40, speed)
        : temp >= 80
        ? Math.max(30, speed)
        : speed;
}
