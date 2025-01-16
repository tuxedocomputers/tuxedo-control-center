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

import { Component, EventEmitter, Input, ViewChild } from "@angular/core";
import { Chart, ChartConfiguration } from "chart.js";
import {
    chartMaintainAspectRatio,
    chartResponsive,
    createBarChartDataset,
} from "src/common/classes/FanChartProperties";

@Component({
    selector: "app-tgp-chart",
    templateUrl: "./tgp-chart.component.html",
    styleUrl: "./tgp-chart.component.scss",
    standalone: false,
})
export class TgpChartComponent {
    @ViewChild("chartCanvas") chartCanvas!: any;
    private chart: Chart;

    @Input()
    public cTGPOffset: number;

    @Input()
    public nvidiaPowerCTRLMaxPowerLimit: number;
    @Input()
    public nvidiaPowerCTRLDefaultPowerLimit: number;
    private dataCollectionTimeout: any = null;

    @Input() private nvidiaPowerCTRLMaxPowerLimitEvent: EventEmitter<number>;

    public ngOnInit(): void {
        this.nvidiaPowerCTRLMaxPowerLimitEvent.subscribe(
            (data: number): void => {
                this.nvidiaPowerCTRLMaxPowerLimit = data;
                this.resetDataCollectionTimeout();
            }
        );
    }

    public ngAfterViewInit(): void {
        this.initChart();
    }

    initChart(): void {
        // todo: deduplicate
        const textColor: string = getComputedStyle(
            document.documentElement
        ).getPropertyValue("color");

        const chartConfiguration: ChartConfiguration = {
            type: "bar",
            data: {
                labels: ["TGP"],
                // todo: label translation
                datasets: createBarChartDataset(
                    "Configurable graphics power (cTGP)",
                    [this.nvidiaPowerCTRLDefaultPowerLimit + this.cTGPOffset],
                    "Dynamic Boost range",
                    [
                        this.nvidiaPowerCTRLMaxPowerLimit -
                            this.nvidiaPowerCTRLDefaultPowerLimit -
                            this.cTGPOffset,
                    ]
                ),
            },
            options: {
                indexAxis: "y",
                scales: {
                    x: {
                        type: "linear",
                        min: 0,
                        max: this.nvidiaPowerCTRLMaxPowerLimit,
                        stacked: true,
                        ticks: {
                            color: textColor,
                        },
                    },
                    y: {
                        stacked: true,
                        ticks: {
                            color: textColor,
                        },
                    },
                },
                responsive: chartResponsive,
                maintainAspectRatio: chartMaintainAspectRatio,

                plugins: {
                    datalabels: {
                        color: textColor,
                        display: true,
                    },
                    legend: {
                        labels: {
                            color: textColor,
                        },
                    },
                },
            },
        };

        const ctx = this.chartCanvas.nativeElement.getContext(
            "2d"
        ) as CanvasRenderingContext2D;

        this.chart = new Chart(ctx, chartConfiguration);
    }

    public updateChart(): void {
        if (this.chart) {
            this.chart.data.datasets[0].data = [
                this.nvidiaPowerCTRLDefaultPowerLimit + this.cTGPOffset,
            ];

            this.chart.data.datasets[1].data = [
                this.nvidiaPowerCTRLMaxPowerLimit -
                    this.nvidiaPowerCTRLDefaultPowerLimit -
                    this.cTGPOffset,
            ];
            this.chart.update();
            return;
        }
        console.error("No tgp chart found");
    }

    // todo: deduplicate
    private resetDataCollectionTimeout(): void {
        if (this.dataCollectionTimeout) {
            clearTimeout(this.dataCollectionTimeout);
        }

        this.dataCollectionTimeout = setTimeout((): void => {
            this.updateChart();
        }, 200);
    }
}
