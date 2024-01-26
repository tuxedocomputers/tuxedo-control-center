/*!
 * Copyright (c) 2021 TUXEDO Computers GmbH <tux@tuxedocomputers.com>
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

function interpolatePoints(
    points: { temp: number; speed: number }[],
    x: number
): number {
    const first = points[0];
    const last = points[points.length - 1];
    if (x <= first.temp) {
        return first.speed;
    }
    if (x >= last.temp) {
        return last.speed;
    }
    const i =
        points.findIndex((p, idx) => p.temp >= x || idx === points.length - 1) -
        1;
    const { temp: x1, speed: y1 } = points[i];
    const { temp: x2, speed: y2 } = points[i + 1];
    const m = (y2 - y1) / (x2 - x1);
    const b = y1 - m * x1;
    return Math.round(m * x + b);
}

export function interpolatePointsArray(
    points: { temp: number; speed: number }[]
): number[] {
    return Array.from({ length: 101 }, (_, i) => interpolatePoints(points, i));
}


export function formatTemp(value: number, usingFahrenheit: boolean): string {
    if (usingFahrenheit)  {
        return `${Math.round(((value * 1.8) + 32))} °F`;
    }
    else {
        return `${value} °C`;
    }   
}

export function formatSpeed(value: number | string): string {
    return `${value} %`;
}
