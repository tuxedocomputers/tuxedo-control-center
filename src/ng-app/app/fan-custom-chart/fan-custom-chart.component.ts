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
    Component,
    EventEmitter,
    Input,
    Output,
    ViewChild,
} from "@angular/core";

import type { ElementRef, OnInit } from "@angular/core";

import type { FormGroup } from "@angular/forms";

import { FormBuilder } from "@angular/forms";

import type {
    ITccFanProfile,
    ITccFanTableEntry,
} from "src/common/models/TccFanTable";
import { customFanPreset } from "src/common/models/TccFanTable";

import { Chart } from "chart.js";

import type { ChartConfiguration, ChartType, ChartTypeRegistry, TooltipItem } from "chart.js";

import "chartjs-plugin-datalabels";
import "chartjs-plugin-dragdata";
import {
    chartAnimation,
    chartInteraction,
    chartMaintainAspectRatio,
    chartResponsive,
    createLineChartDataset,
    createLineChartScales,
} from "src/common/classes/FanChartProperties";
import {
    interpolatePointsArray,
    manageCriticalTemperature,
} from "src/common/classes/FanUtils";
import { formatTemp } from "../../../common/classes/FanUtils";
import { ConfigService } from "../config.service";
import { UtilsService } from "../utils.service";

@Component({
    selector: "app-fan-custom-chart",
    templateUrl: "./fan-custom-chart.component.html",
    styleUrls: ["./fan-custom-chart.component.scss"],
    standalone: false,
})
export class FanCustomChartComponent implements OnInit {
    public customFanPreset: ITccFanProfile = customFanPreset;

    @Input()
    public customFanCurve: ITccFanProfile;

    @Output()
    public setCustomChartDirtyEvent: EventEmitter<void> =
        new EventEmitter<void>();

    @Output()
    public customFanCurveEvent: EventEmitter<ITccFanProfile> =
        new EventEmitter<ITccFanProfile>();

    @Output()
    public chartToggleEvent: EventEmitter<boolean> =
        new EventEmitter<boolean>();

    @Input()
    public tempCustomFanCurve: ITccFanProfile;

    public fanFormGroup: FormGroup;

    @Input()
    public showFanGraphs: boolean = false;
    public tempsLabels: string[];

    private textColor: string = "";
    private fahrenheit: boolean = false;

    @ViewChild("chartCanvas") chartCanvas!: ElementRef;

    private prevTemp: number;

    private chartEntered: boolean;
    private cpuData: { x: number; y: number }[] = [];
    private chart: Chart;

    constructor(
        private fb: FormBuilder,
        private config: ConfigService,
        private utils: UtilsService
    ) {
        this.textColor = this.utils.getTextColor()
        this.tempsLabels = Array.from(Array(100).keys())
            .concat(100)
            .map((e: number): string =>
                formatTemp(e, this.config?.getSettings()?.fahrenheit)
            );
        this.fahrenheit = this.config?.getSettings()?.fahrenheit ?? false;
    }

    public ngOnInit(): void {
        this.initFanFormGroup();
    }
    
    // this.chart.config._config.options.plugins.tooltip.animation is sometimes set to false
    public ngDoCheck(): void {
        if (this.chart) {
            this.chart.options.plugins.tooltip.animation = chartAnimation
        }
    }

    public async ngAfterViewInit(): Promise<void> {
        await this.updateFanChartDataset();
        this.initChart();
    }

    private initFanFormGroup(): void {
        const fanCurve: ITccFanProfile =
            this.tempCustomFanCurve || this.customFanCurve;

        // todo: currently only using cpu values for both gpu and cpu
        type CPUFanSpeedMap = { [temp: string]: number };

        const initialValues: CPUFanSpeedMap = fanCurve.tableCPU.reduce(
            (
                acc: CPUFanSpeedMap,
                { temp, speed }: ITccFanTableEntry
            ): CPUFanSpeedMap => {
                acc[temp] = speed;
                return acc;
            },
            {}
        );

        this.fanFormGroup = this.fb.group(initialValues);
    }

    public toggleFanGraphs(): void {
        const canvas: HTMLElement = document.getElementById("hidden");
        this.showFanGraphs = !this.showFanGraphs;
        if (canvas) {
            canvas.style.display = this.showFanGraphs ? "flex" : "none";
        }
    }

    public getFanFormGroupValues(): ITccFanProfile {
        const fanTable: { temp: number; speed: number }[] =
            customFanPreset.tableCPU.map(
                ({
                    temp,
                }: ITccFanTableEntry): { temp: number; speed: number } => ({
                    temp,
                    speed: this.fanFormGroup.get(`${temp}`)?.value,
                })
            );
        return { tableCPU: fanTable, tableGPU: fanTable };
    }

    public setFanFormGroupValues(customFanCurveValues: ITccFanProfile): void {
        customFanCurveValues.tableCPU.forEach(
            ({ temp, speed }: ITccFanTableEntry): void => {
                this.setFormValue(temp, speed);
            },
        );
    }
    
    public async updateFanChartDataset(): Promise<void> {
        const { tableCPU, tableGPU } = this.getFanFormGroupValues();

        const [interpolatedTableCpu, interpolatedTableGpu] = await Promise.all([
            interpolatePointsArray(tableCPU),
            interpolatePointsArray(tableGPU),
        ]);

        this.cpuData = interpolatedTableCpu
            .map((value: number, index: number): { x: number; y: number } => ({
                x: index,
                y: value,
            }))
            .filter(({ x }: { x: number }): boolean => x % 10 === 0);
    }

    public mouseEnter(): void {
        this.chartEntered = true;
    }

    public mouseLeave(): void {
        this.chartEntered = false;
    }

    // fixing out of bounds by reverting value if outside div
    private handlingOutOfBounds(value: { x: number; y: number }): boolean {
        if (!this.chartEntered) {
            value.y = this.prevTemp;
            return true;
        }
        this.prevTemp = value.y;
        return false;
    }
    
    private adjustFanCurve(newEntry: { x: number; y: number }): void {
        for (const cpuEntry of this.cpuData) {
            if (
                (newEntry.x < cpuEntry.x && newEntry.y > cpuEntry.y) ||
                (newEntry.x > cpuEntry.x && newEntry.y < cpuEntry.y)
            ) {
                this.setFormValue(cpuEntry.x, newEntry.y);
                cpuEntry.y = newEntry.y;
            }
          }
    }
    
    private initChart(): void {
        const chartConfiguration: ChartConfiguration = {
            type: "line",
            options: {
                normalized: true,
                parsing: false,
                plugins: {
                    dragData: {
                        dragX: false,
                        dragY: true,
                        onDrag: (
                            e: MouseEvent,
                            datasetIndex: number,
                            index: number,
                            value: { x: number; y: number }
                        ): void => {
                            value.y = Math.round(value.y);

                            const outOfBounds: boolean =
                                this.handlingOutOfBounds(value);

                            value.y = manageCriticalTemperature(
                                value.x,
                                value.y
                            );

                            if (outOfBounds) {
                                return;
                            }

                            this.setFormValue(value.x, value.y);
                        },
                        onDragEnd: (
                            e: MouseEvent,
                            datasetIndex: number,
                            index: number,
                            value: { x: number; y: number }
                        ): void => {
                            this.setCustomChartDirty();
                            this.adjustFanCurve(value);
                            this.updateChart()
                        },
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
                            label: (context: TooltipItem<ChartType>): string => {
                                return `${context.dataset.label}: ${context.formattedValue} %`;
                            },
                            title: (context: TooltipItem<keyof ChartTypeRegistry>[]): string => {
                                return formatTemp(
                                    context[0].dataIndex * 10,
                                    this.fahrenheit
                                );
                            },
                        },
                    },
                },
                scales: createLineChartScales(this.fahrenheit, this.textColor),
                interaction: chartInteraction,
                animation: chartAnimation,
                responsive: chartResponsive,
                maintainAspectRatio: chartMaintainAspectRatio,
            },
            data: {
                labels: this.tempsLabels,
                datasets: createLineChartDataset($localize`:@@cpuAndGpuFan:CPU & GPU Fan`, this.cpuData),
            },
        };

        const ctx = this.chartCanvas.nativeElement.getContext(
            "2d"
        ) as CanvasRenderingContext2D;

        this.chart = new Chart(ctx, chartConfiguration);
    }
    private setFormValue(temp: number, sliderValue: number): void {
        this.fanFormGroup.patchValue({
            [`${temp}`]: sliderValue,
        });
    }

    public setCustomChartDirty(): void {
        this.setCustomChartDirtyEvent.emit();
    }
    
    public updateChart(): void {
        if (this.chart) {
            this.chart.data.datasets[0].data = this.cpuData;
            this.chart.update();
        }
    }

    public ngOnDestroy(): void {
        this.customFanCurveEvent.emit(this.getFanFormGroupValues());
        this.chartToggleEvent.emit(this.showFanGraphs);
    }
}
