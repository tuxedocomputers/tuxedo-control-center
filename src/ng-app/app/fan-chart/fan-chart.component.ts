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

import {
    AfterViewInit,
    Component,
    Input,
    OnDestroy,
    OnInit,
    ViewChild,
} from "@angular/core";
import { FormBuilder, FormGroup } from "@angular/forms";
import { Chart, ChartConfiguration, TooltipItem } from "chart.js";
import {
    chartAnimation,
    chartMaintainAspectRatio,
    chartResponsive,
    createLineChartDataset,
    createLineChartScales,
} from "src/common/classes/FanChartProperties";
import {
    formatTemp,
    manageCriticalTemperature,
} from "src/common/classes/FanUtils";
import {
    ITccFanProfile,
    ITccFanTableEntry,
    customFanPreset,
    defaultFanProfiles,
} from "src/common/models/TccFanTable";
import { ConfigService } from "../config.service";

@Component({
    selector: "app-fan-chart",
    templateUrl: "./fan-chart.component.html",
    styleUrls: ["./fan-chart.component.scss"],
    standalone: false,
})
export class FanChartComponent implements OnInit, OnDestroy, AfterViewInit {
    public tempsLabels: any[];
    public graphType: string = "line";
    private dataCollectionTimeout: any = null;

    @ViewChild("chartCanvas") chartCanvas!: any;
    private chart: any;

    private cpuData: any[] = [];
    private gpuData: any[] = [];

    private _fanProfile: ITccFanProfile;
    private _offsetFanspeed: number = 0;
    private _minFanspeed: number = 0;
    private _maxFanspeed: number = 0;

    public fanFormGroup: FormGroup;
    public customFanCurve: ITccFanProfile = undefined;
    public tempCustomFanCurve: ITccFanProfile = undefined;

    constructor(private config: ConfigService, private fb: FormBuilder) {}

    public ngOnInit(): void {}

    public ngAfterViewInit(): void {
        this.updateDatasets();
        this.initChart();
    }

    private updateDatasets(): void {
        if (this._fanProfile === undefined) return;

        const cpuData: number[] = [];
        for (const tableEntry of this._fanProfile.tableCPU) {
            cpuData.push(this.applyParameters(tableEntry));
        }

        const gpuData: number[] = [];
        for (const tableEntry of this._fanProfile.tableGPU) {
            gpuData.push(this.applyParameters(tableEntry));
        }

        this.cpuData = cpuData.map(
            (value: number, index: number): { x: number; y: number } => ({
                x: index,
                y: value,
            })
        );
        this.gpuData = gpuData.map(
            (value: number, index: number): { x: number; y: number } => ({
                x: index,
                y: value,
            })
        );
    }

    @Input() set offsetFanspeed(value: number) {
        this._offsetFanspeed = value;
        this.resetDataCollectionTimeout();
    }

    get offsetFanspeed(): number {
        return this._offsetFanspeed;
    }

    @Input() set fanProfile(nextProfile: string) {
        const nextProfileIndex: number = defaultFanProfiles.findIndex(
            (profile: ITccFanProfile): boolean => profile.name === nextProfile
        );
        if (nextProfileIndex !== -1) {
            this._fanProfile = defaultFanProfiles[nextProfileIndex];
            this.resetDataCollectionTimeout();
        }
    }

    @Input() set minFanspeed(value: number) {
        this._minFanspeed = value;
        this.resetDataCollectionTimeout();
    }
    get minFanspeed(): number {
        return this._minFanspeed;
    }

    @Input() set maxFanspeed(value: number) {
        this._maxFanspeed = value;
        this.resetDataCollectionTimeout();
    }
    get maxFanspeed(): number {
        return this._maxFanspeed;
    }

    private applyParameters(entry: ITccFanTableEntry): number {
        let { temp, speed } = entry;

        speed += this.offsetFanspeed;

        speed = Math.max(this.minFanspeed, Math.min(this.maxFanspeed, speed));
        speed = Math.max(0, Math.min(100, speed));

        speed = manageCriticalTemperature(temp, speed);

        return speed;
    }

    private initChart(): void {
        // todo: deduplicate
        const textColor: string = getComputedStyle(
            document.documentElement
        ).getPropertyValue("color");

        const chartConfiguration: ChartConfiguration = {
            type: "line",
            options: {
                plugins: {
                    dragData: {
                        dragX: false,
                        dragY: false,
                    },
                    datalabels: {
                        display: false,
                    },
                    legend: {
                        labels: {
                            color: textColor,
                        },
                    },

                    tooltip: {
                        callbacks: {
                            label: (context: TooltipItem<"line">): string => {
                                return `${context.dataset.label}: ${context.formattedValue} %`;
                            },
                            title: (context: TooltipItem<"line">[]): string => {
                                return formatTemp(
                                    context[0].dataIndex,
                                    this.config?.getSettings()?.fahrenheit
                                );
                            },
                        },
                    },
                },
                scales: createLineChartScales(
                    this.config?.getSettings()?.fahrenheit,
                    textColor
                ),
                interaction: {
                    mode: "index",
                    intersect: false,
                },
                animation: chartAnimation,
                responsive: chartResponsive,
                maintainAspectRatio: chartMaintainAspectRatio,
            },
            data: {
                labels: this.tempsLabels,
                // todo: label translation
                datasets: createLineChartDataset(
                    "CPU Fan",
                    this.cpuData,
                    "GPU Fan",
                    this.gpuData
                ),
            },
        };

        const ctx = this.chartCanvas.nativeElement.getContext(
            "2d"
        ) as CanvasRenderingContext2D;

        this.chart = new Chart(ctx, chartConfiguration);
    }

    private updateChart(): void {
        this.updateDatasets();

        if (this.chart) {
            this.chart.data.datasets[0].data = this.cpuData;
            this.chart.data.datasets[1].data = this.gpuData;
            this.chart.update();
            return;
        }
    }

    public getFanFormGroupValues(): ITccFanProfile {
        const fanTable: { temp: number; speed: number }[] =
            customFanPreset.tableCPU.map(
                ({
                    temp,
                }: ITccFanTableEntry): { temp: number; speed: number } => ({
                    temp,
                    speed: this.fanFormGroup.get(`${temp}c`).value,
                })
            );
        return { tableCPU: fanTable, tableGPU: fanTable };
    }

    private resetDataCollectionTimeout(): void {
        if (this.dataCollectionTimeout) {
            clearTimeout(this.dataCollectionTimeout);
        }

        this.dataCollectionTimeout = setTimeout((): void => {
            this.updateChart();
        }, 200);
    }

    public ngOnDestroy(): void {}
}
