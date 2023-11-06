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
    @Input()
    public customFanCurve: ITccFanProfile;

    @Output()
    public setSliderDirty = new EventEmitter<void>();

    public fanFormGroup: FormGroup;

    public customFanPreset = customFanPreset;

    @Input()
    public showFanGraphs: boolean = false;

    public tempsLabels: Label[] = tempsLabels;
    public graphOptions: ChartOptions = graphOptions;
    public fantableDatasets: ChartDataSets[] = fantableDatasets;
    public graphColors: Color[] = graphColors;
    public graphType = "line";

    constructor(private fb: FormBuilder) {}

    public ngOnInit(): void {
        // currently only using cpu values for both gpu and cpu
        this.fanFormGroup = this.fb.group({
            "20c": 10,
            "30c": 10,
            "40c": 20,
            "50c": 30,
            "60c": 40,
            "70c": 50,
            "80c": 50,
        });

        if (this.customFanCurve?.tableCPU) {
            const initialValues = {};
            this.customFanCurve.tableCPU.forEach(({ temp, speed }) => {
                initialValues[temp.toString() + "c"] = speed;
            });

            this.fanFormGroup.patchValue(initialValues);
        }
    }

    public patchFanFormGroup(ac: AbstractControl): void {
        for (let obj of ac.value.tableGPU) {
            const { temp, speed } = obj;
            this.fanFormGroup.controls[temp.toString() + "c"].setValue(speed);
        }
    }

    public getFanFormGroupValues(): ITccFanProfile {
        const temperatures = ["20c", "30c", "40c", "50c", "60c", "70c", "80c"];
        const fanTable = temperatures.map((temp) => ({
            temp: parseInt(temp.slice(0, -1)),
            speed: this.fanFormGroup.get(temp).value,
        }));

        return {
            tableCPU: fanTable,
            tableGPU: fanTable,
        };
    }

    private delay(ms: number) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    public async updateComponents(
        sliderValue: number,
        temp: number
    ): Promise<void> {
        // instantly setting value sometimes results in not moved slider
        await this.delay(100);

        if (temp == 70 && sliderValue < 40) {
            this.fanFormGroup.setValue({
                ...this.fanFormGroup.value,
                "70c": 40,
            });
        }

        if (temp == 80 && sliderValue < 40) {
            this.fanFormGroup.setValue({
                ...this.fanFormGroup.value,
                "80c": 40,
            });
        }

        this.updateFanChartDataset();
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
}
