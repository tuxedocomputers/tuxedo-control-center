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

import { ChartDataset, ChartOptions } from "chart.js";
import "@angular/localize/init";

const graphOptions: ChartOptions = {
    animation: {
        duration: 300,
    },
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        tooltip: {
            callbacks: {
                label: (item) => {
                    return item.dataset.label + " " + item.formattedValue;
                },
            },
        },
    },
    scales: {
        y: {
            min: 0,
            suggestedMax: 100,
            ticks: {
                callback: (value) => {
                    if (typeof value === 'number' && value % 20 === 0) {
                        return value;
                    } 
                    return null;
                },
            },
        },
        x: {
            ticks: {
                autoSkip: false,
                callback: (value, index) => {
                    if (index % 5 === 0) {
                         // In Chart.js 4, value might be label if category scale, or number if linear.
                         // But for tick callback 'value' is strictly the value. 
                         // Check type or index usage. Index is simpler for skipping.
                        return value; 
                    }
                    return null;
                },
            },
        },
    },
};

const fantableDatasets: ChartDataset[] = [
    {
        label: $localize`:@@cProfMgrDetailsFanChartCPULabel:CPU Fan`,
        data: [],
        spanGaps: true,
        tension: 0.1,
        stepped: true,
        showLine: true,
        pointRadius: 2,
    },
    {
        label: $localize`:@@cProfMgrDetailsFanChartGPULabel:GPU Fan`,
        data: [],
        spanGaps: true,
        tension: 0.1,
        stepped: true,
        showLine: true,
        pointRadius: 2,
    },
];

const graphColors: any[] = [
    {
        borderColor: "rgba(120, 120, 120, 0.4)",
        backgroundColor: "rgba(10, 10, 10, 0.4)",
    },
    {
        borderColor: "rgba(227, 0, 22, 0.3)",
        backgroundColor: "rgba(227, 0, 22, 0.3)",
    },
];

export { graphColors, graphOptions, fantableDatasets };
