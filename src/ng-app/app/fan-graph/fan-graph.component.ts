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
import {
    AfterViewInit,
    ChangeDetectorRef,
    Component,
    Input,
    OnDestroy,
    OnInit,
} from "@angular/core";

/*
// todo: update to chart.js 4

import { ChartDataSets, ChartOptions } from "chart.js";
import { Color, Label } from "ng2-charts";
import {
    defaultFanProfiles,
    ITccFanProfile,
    ITccFanTableEntry,
} from "src/common/models/TccFanTable";
import {
    fantableDatasets,
    graphColors,
    graphOptions,
} from "src/common/classes/FanChartProperties";
import { manageCriticalTemperature } from "src/common/classes/FanUtils";
import { formatTemp } from "../../../common/classes/FanUtils";
import { ConfigService } from "../config.service";
*/

@Component({
    selector: "app-fan-graph",
    templateUrl: "./fan-graph.component.html",
    styleUrls: ["./fan-graph.component.scss"],
    standalone: false
})
export class FanGraphComponent implements OnInit, OnDestroy, AfterViewInit {
    ngOnInit(): void {}
    ngAfterViewInit(): void {}
    ngOnDestroy(): void {}

    /*
    // todo: update to chart.js 4
    
    // Graph data
    // todo: why is variable called e
    public tempsLabels: Label[] = Array.from(Array(100).keys())
        .concat(100)
        .map((e: number): string => formatTemp(e, this.config.getSettings().fahrenheit));
    public graphOptions: ChartOptions = graphOptions;
    public fantableDatasets: ChartDataSets[] = fantableDatasets;
    public graphColors: Color[] = graphColors;
    public graphType: string = "line";

    // Inputs
    private _fanProfile: ITccFanProfile;
    @Input() set fanProfile(nextProfile: string) {
        const nextProfileIndex: number = defaultFanProfiles.findIndex(
            (profile: ITccFanProfile): boolean => profile.name === nextProfile
        );
        if (nextProfileIndex !== -1) {
            this._fanProfile = defaultFanProfiles[nextProfileIndex];
            this.updateDatasets();
        }
    }
    get fanProfile(): string {
        return this._fanProfile.name;
    }

    private _minFanspeed: number = 0;
    @Input() set minFanspeed(value: number) {
        this._minFanspeed = value;
        this.updateDatasets();
    }
    get minFanspeed(): number {
        return this._minFanspeed;
    }

    private _maxFanspeed: number = 0;
    @Input() set maxFanspeed(value: number) {
        this._maxFanspeed = value;
        this.updateDatasets();
    }
    get maxFanspeed(): number {
        return this._maxFanspeed;
    }

    private _offsetFanspeed: number = 0;
    @Input() set offsetFanspeed(value: number) {
        this._offsetFanspeed = value;
        this.updateDatasets();
    }
    get offsetFanspeed(): number {
        return this._offsetFanspeed;
    }

    initDone: boolean = false;

    constructor(private cdref: ChangeDetectorRef,
        private config: ConfigService,
        ) {}

    ngOnInit(): void {}

    ngAfterViewInit(): void {
        this.initDone = true;
        this.cdref.detectChanges();
    }

    ngOnDestroy(): void {}

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

        // const nullDupes = data => data.map((x, i) => (!this.interestingTemps.includes(i) && data[i - 1] === x && ((i + 1) < data?.length && data[i + 1] === x)) ? null : x);
        this.fantableDatasets[0].data = cpuData; //nullDupes(cpuData);
        this.fantableDatasets[1].data = gpuData; //nullDupes(gpuData);
    }
    */

    /**
     * Applies min, max and offset parameters and returns the resulting speed
     * Ref. FanControlLogic.ts: calculateSpeedPercent()
     *
     * @param entry Fan table entry to be evaluated
     * @returns Resulting speed
     */
    /*
    private applyParameters(entry: ITccFanTableEntry): number {
        let { temp, speed } = entry;

        speed += this.offsetFanspeed;

        speed = Math.max(this.minFanspeed, Math.min(this.maxFanspeed, speed));
        speed = Math.max(0, Math.min(100, speed));

        speed = manageCriticalTemperature(temp, speed);

        return speed;
    }
    */
}
