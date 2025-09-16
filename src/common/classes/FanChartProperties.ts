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

import type {
    BubbleDataPoint,
    CartesianScaleTypeRegistry,
    ChartDataset,
    ChartTypeRegistry,
    CoreInteractionOptions,
    Point,
    ScaleOptionsByType,
    Tick,
} from "chart.js";
import { formatTemp } from "./FanUtils";
import type {_DeepPartialObject } from "chart.js/dist/types/utils";

export const chartInteraction: _DeepPartialObject<CoreInteractionOptions> = {
    mode: "index",
    intersect: false,
};

export const chartAnimation = {
    duration: 300,
};

export const chartResponsive = true;
export const chartMaintainAspectRatio = false;

export function createLineChartDataset(
    primaryLabel: string,
    primaryData: { x: number; y: number }[],
    secondaryLabel?: string,
    secondaryData?: { x: number; y: number }[]
): ChartDataset<
    keyof ChartTypeRegistry,
    (number | [number, number] | Point | BubbleDataPoint)[]
>[] {
    const baseDataset = {
        spanGaps: true,
        showLine: true,
        pointRadius: 2,
        fill: true,
    };

    const primaryDataset = {
        label: primaryLabel,
        data: primaryData,
        borderColor: "rgba(227, 0, 22, 0.3)",
        backgroundColor: "rgba(227, 0, 22, 0.3)",
        ...baseDataset,
    };

    if (secondaryLabel) {
        const secondaryDataset = {
            label: secondaryLabel,
            data: secondaryData,
            borderColor: "rgba(120, 120, 120, 0.4)",
            backgroundColor: "rgba(10, 10, 10, 0.4)",
            ...baseDataset,
        };

        return [primaryDataset, secondaryDataset];
    }

    return [primaryDataset];
}

export function createBarChartDataset(
    primaryLabel: string,
    primaryData: number[],
    secondaryLabel: string,
    secondaryData: number[]
): ChartDataset<
    keyof ChartTypeRegistry,
    (number | [number, number] | Point | BubbleDataPoint)[]
>[] {
    return [
        {
            label: primaryLabel,
            backgroundColor: "rgba(227, 0, 22, 0.3)",
            data: primaryData,
        },
        {
            label: secondaryLabel,
            backgroundColor: "rgba(10, 10, 10, 0.4)",
            data: secondaryData,
        },
    ];
}

export function createLineChartScales(
    fahrenheit: boolean,
    textColor: string,
    max?: number
): _DeepPartialObject<{
    [key: string]: ScaleOptionsByType<
        "radialLinear" | keyof CartesianScaleTypeRegistry
    >;
}> {
    return {
        x: {
            type: "linear",
            min: 0,
            max: max ? max : 100,
            ticks: {
                color: textColor,

                callback: (
                    value: number,
                    index: number,
                    ticks: Tick[]
                ): string => {
                    return formatTemp(value, fahrenheit);
                },
            },
        },
        y: {
            min: 0,
            max: 100,
            ticks: {
                color: textColor,

                callback: (
                    value: number,
                    index: number,
                    ticks: Tick[]
                ): string => {
                    return `${value} %`;
                },
            },
        },
    };
}
