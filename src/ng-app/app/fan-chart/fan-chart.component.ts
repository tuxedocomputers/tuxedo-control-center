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
    type AfterViewInit,
    Component,
    type ElementRef,
    Input,
    type OnDestroy,
    type OnInit,
    ViewChild,
} from '@angular/core';
import { Chart, type ChartTypeRegistry, type ChartConfiguration, type TooltipItem } from 'chart.js';
import {
    chartAnimation,
    chartMaintainAspectRatio,
    chartResponsive,
    createLineChartDataset,
    createLineChartScales,
} from 'src/common/classes/FanChartProperties';
import { formatTemp, manageCriticalTemperature } from 'src/common/classes/FanUtils';
import { type ITccFanProfile, type ITccFanTableEntry, defaultFanProfiles } from 'src/common/models/TccFanTable';
import { ConfigService } from '../config.service';
import { UtilsService } from '../utils.service';

@Component({
    selector: 'app-fan-chart',
    templateUrl: './fan-chart.component.html',
    styleUrls: ['./fan-chart.component.scss'],
    standalone: false,
})
export class FanChartComponent implements OnInit, OnDestroy, AfterViewInit {
    public tempsLabels: string[];
    public graphType: string = 'line';
    private dataCollectionTimeout: NodeJS.Timeout = null;

    @ViewChild('chartCanvas') chartCanvas!: ElementRef;
    private chart: Chart;

    private cpuData: { x: number; y: number }[] = [];
    private gpuData: { x: number; y: number }[] = [];

    private _fanProfile: ITccFanProfile;
    private _offsetFanspeed: number = 0;
    private _minFanspeed: number = 0;
    private _maxFanspeed: number = 0;

    public customFanCurve: ITccFanProfile = undefined;
    public tempCustomFanCurve: ITccFanProfile = undefined;

    private textColor: string = '';
    private fahrenheit: boolean = false;

    constructor(
        private config: ConfigService,
        private utils: UtilsService,
    ) {
        this.textColor = this.utils.getTextColor();
        this.fahrenheit = this.config?.getSettings()?.fahrenheit;
    }

    public ngOnInit(): void {}

    // this.chart.config._config.options.plugins.tooltip.animation is sometimes set to false
    public ngDoCheck(): void {
        if (this.chart) {
            this.chart.options.plugins.tooltip.animation = chartAnimation;
        }
    }

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

        this.cpuData = cpuData.map((value: number, index: number): { x: number; y: number } => ({
            x: index,
            y: value,
        }));
        this.gpuData = gpuData.map((value: number, index: number): { x: number; y: number } => ({
            x: index,
            y: value,
        }));
    }

    @Input() public set offsetFanspeed(value: number) {
        this._offsetFanspeed = value;
        this.resetDataCollectionTimeout();
    }

    public get offsetFanspeed(): number {
        return this._offsetFanspeed;
    }

    @Input() public set fanProfile(nextProfile: string) {
        const nextProfileIndex: number = defaultFanProfiles.findIndex(
            (profile: ITccFanProfile): boolean => profile.name === nextProfile,
        );
        if (nextProfileIndex !== -1) {
            this._fanProfile = defaultFanProfiles[nextProfileIndex];
            this.resetDataCollectionTimeout();
        }
    }

    @Input() public set minFanspeed(value: number) {
        this._minFanspeed = value;
        this.resetDataCollectionTimeout();
    }
    public get minFanspeed(): number {
        return this._minFanspeed;
    }

    @Input() public set maxFanspeed(value: number) {
        this._maxFanspeed = value;
        this.resetDataCollectionTimeout();
    }
    public get maxFanspeed(): number {
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
        const chartConfiguration: ChartConfiguration = {
            type: 'line',
            options: {
                normalized: true,
                parsing: false,
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
                            color: this.textColor,
                        },
                    },

                    tooltip: {
                        callbacks: {
                            label: (tooltipItem: TooltipItem<keyof ChartTypeRegistry>): string => {
                                return `${tooltipItem.dataset.label}: ${tooltipItem.formattedValue} %`;
                            },
                            title: (tooltipItems: TooltipItem<keyof ChartTypeRegistry>[]): string => {
                                if (!tooltipItems.length) return '';

                                const dataIndex = tooltipItems[0].dataIndex;
                                return formatTemp(dataIndex, this.fahrenheit);
                            },
                        },
                    },
                },
                scales: createLineChartScales(this.fahrenheit, this.textColor),
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                animation: chartAnimation,
                responsive: chartResponsive,
                maintainAspectRatio: chartMaintainAspectRatio,
            },
            data: {
                labels: this.tempsLabels,
                datasets: createLineChartDataset(
                    $localize`:@@cpuFan:CPU Fan`,
                    this.cpuData,
                    $localize`:@@gpuFan:GPU Fan`,
                    this.gpuData,
                ),
            },
        };

        const ctx = this.chartCanvas.nativeElement.getContext('2d') as CanvasRenderingContext2D;

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
