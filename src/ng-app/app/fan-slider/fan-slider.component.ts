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
import {
    AbstractControl,
    FormBuilder,
    FormGroup,
    Validators,
} from "@angular/forms";
import { Mutex } from "async-mutex";
import {
    ITccFanProfile,
    ITccFanTableEntry,
    customFanPreset,
} from "src/common/models/TccFanTable";
import {
    fantableDatasets,
    graphColors,
    graphOptions,
} from "src/common/classes/FanChartProperties";
import { Color, Label } from "ng2-charts";
import { ChartDataSets, ChartOptions } from "chart.js";
import { interpolatePointsArray } from "src/common/classes/FanUtils";
import { delay } from "src/common/classes/Utils";
import { formatTemp } from "../../../common/classes/FanUtils";
import { ConfigService } from "../config.service";
import { UtilsService } from "../utils.service";
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
    public tempsLabels: Label[] = Array.from(Array(100).keys())
    .concat(100)
    .map((e) => formatTemp(e, this.config.getSettings().fahrenheit));;
    public graphOptions: ChartOptions = graphOptions;
    public fantableDatasets: ChartDataSets[] = fantableDatasets;
    public graphColors: Color[] = graphColors;
    public graphType = "line";

    constructor(
        private fb: FormBuilder,       
        private config: ConfigService, 
        private utils: UtilsService,
        ) {}
        
    public ngOnInit(): void {
        this.initFanFormGroup();
        this.updateFanChartDataset();
    }

    private initFanFormGroup(): void {
        const fanCurve = this.tempCustomFanCurve || this.customFanCurve;

        // currently only using cpu values for both gpu and cpu
        const initialValues = fanCurve.tableCPU.reduce(
            (acc, { temp, speed }) => {
                return { ...acc, ...{ [`${temp}c`]: speed } };
            },
            {}
        );

        this.fanFormGroup = this.fb.group(initialValues);
    }

    public patchFanFormGroup(ac: AbstractControl): void {
        ac.value.tableGPU.forEach(({ temp, speed }) => {
            this.fanFormGroup.controls[`${temp}c`].setValue(speed);
        });
        this.updateFanChartDataset();
    }

    public getFanFormGroupValues(): ITccFanProfile {
        const fanTable = customFanPreset.tableCPU.map(({ temp }) => ({
            temp,
            speed: this.fanFormGroup.get(`${temp}c`).value,
        }));
        return { tableCPU: fanTable, tableGPU: fanTable };
    }

    private setFormValue(temp: number, sliderValue: number): void {
        this.fanFormGroup.patchValue({
            [`${temp}c`]: sliderValue,
        });
    }


    formatTemperatureLabel(temp: number) {
        if(this.config.getSettings().fahrenheit) {
            temp = Math.round(this.utils.getFahrenheitFromCelsius(temp));
            return temp.toString() + " °F";
        }   
        else {
            return temp.toString() + " °C";
        }
    }

    public async adjustSliderValues(
        sliderValue: number,
        temp: number
    ): Promise<void> {
        await this.mutex.runExclusive(async () => {
            const clampedSliderValue = this.safeguardFanSpeed(
                sliderValue,
                temp
            );
            const leftSliders = this.getSlidersToAdjust(temp, "left");
            const rightSliders = this.getSlidersToAdjust(temp, "right");

            this.adjustSliders(leftSliders, clampedSliderValue, temp, "left");
            this.adjustSliders(rightSliders, clampedSliderValue, temp, "right");

            // slider won't adjust to formgroup value without delay
            await delay(10);
            this.setFormValue(temp, clampedSliderValue);
            this.updateFanChartDataset();
        });
    }

    private getSlidersToAdjust(
        temp: number,
        direction: "left" | "right"
    ): number[] {
        const comparison = direction === "left" ? "<" : ">";
        return this.customFanPreset.tableCPU
            .filter((entry: ITccFanTableEntry) =>
                eval(`${entry.temp} ${comparison} ${temp}`)
            )
            .map((entry) => entry.temp);
    }

    private adjustSliders(
        sliders: number[],
        sliderValue: number,
        temp: number,
        direction: "left" | "right"
    ): void {
        const targetValue = this.safeguardFanSpeed(sliderValue, temp);

        for (const slider of sliders) {
            const sliderControl = this.fanFormGroup.get(`${slider}c`);
            const sliderControlValue = sliderControl.value;

            if (
                (direction === "left" && sliderControlValue > sliderValue) ||
                (direction === "right" && sliderControlValue < sliderValue)
            ) {
                sliderControl.setValue(targetValue);
            }
        }
    }

    private safeguardFanSpeed(sliderValue: number, temp: number): number {
        return temp > 70 ? Math.max(40, sliderValue) : sliderValue;
    }

    public async updateComponents(sliderValue: number, temp: number) {
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
