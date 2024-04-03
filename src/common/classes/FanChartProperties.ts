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

import { ChartDataSets, ChartOptions } from "chart.js";
import { Color } from "ng2-charts";
import "@angular/localize/init";

const graphOptions: ChartOptions = {
    animation: {
        duration: 300,
    },
    responsive: true,
    maintainAspectRatio: false,
    tooltips: {
        callbacks: {
            label: (item, data) => {
                return (
                    data.datasets[item.datasetIndex].label + " " + item.yLabel
                );
            },
        },
    },
    scales: {
        yAxes: [
            {
                ticks: {
                    beginAtZero: true,
                    suggestedMax: 100,
                    callback: (value: number) => {
                        if (value % 20 === 0) {
                            return value;
                        } else {
                            return null;
                        }
                    },
                },
            },
        ],
        xAxes: [
            {
                ticks: {
                    beginAtZero: true,
                    autoSkip: false,
                    callback: (value, index) => {
                        if (index % 5 === 0) {
                            return value;
                        } else {
                            return null;
                        }
                    },
                },
            },
        ],
    },
};

const fantableDatasets: ChartDataSets[] = [
    {
        label: $localize`:@@cProfMgrDetailsFanChartCPULabel:CPU Fan`,
        data: [],
        spanGaps: true,
        lineTension: 0.1,
        steppedLine: true,
        showLine: true,
        pointRadius: 2,
    },
    {
        label: $localize`:@@cProfMgrDetailsFanChartGPULabel:GPU Fan`,
        data: [],
        spanGaps: true,
        lineTension: 0.1,
        steppedLine: true,
        showLine: true,
        pointRadius: 2,
    },
];

const graphColors: Color[] = [
    {
        borderColor: "rgba(120, 120, 120, 0.4)",
        backgroundColor: "rgba(10, 10, 10, 0.4)",
    },
    {
        borderColor: "rgba(227, 0, 22, 0.3)",
        backgroundColor: "rgba(227, 0, 22, 0.3)",
    },
];
export { graphOptions, fantableDatasets, graphColors };
