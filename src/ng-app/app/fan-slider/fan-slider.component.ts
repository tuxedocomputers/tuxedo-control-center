/*!
 * Copyright (c) 2019-2023 TUXEDO Computers GmbH <tux@tuxedocomputers.com>
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
import { Component, EventEmitter, Input, OnInit, Output } from "@angular/core";
import { AbstractControl, FormBuilder, FormGroup } from "@angular/forms";
import { Mutex } from "async-mutex";
import { ITccFanProfile, customFanPreset } from "src/common/models/TccFanTable";
import {
    fantableDatasets,
    graphColors,
    graphOptions,
    tempsLabels,
} from "src/common/classes/FanChartProperties";
import { Color, Label } from "ng2-charts";
import { ChartDataSets, ChartOptions } from "chart.js";
import { interpolatePointsArray } from "src/common/classes/FanUtils";

@Component({
    selector: "app-fan-slider",
    templateUrl: "./fan-slider.component.html",
    styleUrls: ["./fan-slider.component.scss"],
})
export class FanSliderComponent implements OnInit {
    public customFanPreset = customFanPreset;

    @Input()
    public customFanCurve: ITccFanProfile;

    @Output()
    public setSliderDirty = new EventEmitter<void>();

    @Output()
    public customFanCurveEvent = new EventEmitter<ITccFanProfile>();

    @Output()
    public chartToggleEvent = new EventEmitter<boolean>();

    @Input()
    public tempCustomFanCurve: ITccFanProfile;

    public fanFormGroup: FormGroup;

    @Input()
    public showFanGraphs: boolean = false;

    private mutex = new Mutex();

    public tempsLabels: Label[] = tempsLabels;
    public graphOptions: ChartOptions = graphOptions;
    public fantableDatasets: ChartDataSets[] = fantableDatasets;
    public graphColors: Color[] = graphColors;
    public graphType = "line";

    constructor(private fb: FormBuilder) {}

    public ngOnInit(): void {
        // currently only using cpu values for both gpu and cpu
        const initialValues = this.customFanCurve.tableCPU.reduce(
            (acc, { temp, speed }) => {
                return { ...acc, ...{ [`${temp}c`]: speed } };
            },
            {}
        );

        this.fanFormGroup = this.fb.group(initialValues);
    }

    public patchFanFormGroup(ac: AbstractControl): void {
        for (let obj of ac.value.tableGPU) {
            const { temp, speed } = obj;
            this.fanFormGroup.controls[temp.toString() + "c"].setValue(speed);
        }
    }

    public getFanFormGroupValues(): ITccFanProfile {
        const fanTable = customFanPreset.tableCPU.map(({ temp }) => ({
            temp,
            speed: this.fanFormGroup.get(`${temp}c`).value,
        }));

        return {
            tableCPU: fanTable,
            tableGPU: fanTable,
        };
    }

    private delay(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    private setFormValue(temp: number, sliderValue: number): void {
        this.fanFormGroup.patchValue({
            [`${temp}c`]: sliderValue,
        });
    }

    public async adjustSliderValues(
        sliderValue: number,
        temp: number
    ): Promise<void> {
        await this.mutex.runExclusive(async () => {
            const delta = 10;
            const leftTemp = temp - delta;
            const rightTemp = temp + delta;
            let finalValue = sliderValue;

            if (temp !== 20) {
                const leftSlider = this.fanFormGroup.get(`${leftTemp}c`).value;
                finalValue = Math.max(finalValue, leftSlider);

                if (temp > 70 && finalValue < 40) {
                    finalValue = 40;
                }
            }

            if (temp !== 100) {
                const rightSlider = this.fanFormGroup.get(
                    `${rightTemp}c`
                ).value;
                finalValue = Math.min(finalValue, rightSlider);
            }

            await this.delay(100);
            this.setFormValue(temp, finalValue);
            this.updateFanChartDataset();
        });
    }

    public async updateComponents(
        sliderValue: number,
        temp: number
    ) {
        await this.adjustSliderValues(sliderValue, temp);
    }

    public dirtyFanFormGroup() {
        this.setSliderDirty.emit();
    }

    public updateFanChartDataset() {
        let { tableCPU, tableGPU } = this.getFanFormGroupValues();

        this.fantableDatasets[0].data = interpolatePointsArray(tableCPU);
        this.fantableDatasets[1].data = interpolatePointsArray(tableGPU);
    }

    public toggleFanGraphs() {
        this.updateFanChartDataset();
        const canvas = document.getElementById("hidden");
        this.showFanGraphs = !this.showFanGraphs;
        if (canvas) {
            canvas.style.display = this.showFanGraphs ? "flex" : "none";
        }
    }

    public ngOnDestroy() {
        this.customFanCurveEvent.emit(this.getFanFormGroupValues());
        this.chartToggleEvent.emit(this.showFanGraphs);
    }
}
