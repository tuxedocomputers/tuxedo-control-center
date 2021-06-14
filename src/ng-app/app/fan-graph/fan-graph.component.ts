import { Component, Input, OnInit } from '@angular/core';
import { ChartDataSets, ChartOptions } from 'chart.js';
import { Color, Label } from 'ng2-charts';
import { defaultFanProfiles, ITccFanProfile } from 'src/common/models/TccFanTable';

@Component({
    selector: 'app-fan-graph',
    templateUrl: './fan-graph.component.html',
    styleUrls: ['./fan-graph.component.scss']
})
export class FanGraphComponent implements OnInit {

    // Inputs
    private _fanProfile: ITccFanProfile;
    @Input() set fanProfile(nextProfile: string) {
        const nextProfileIndex = defaultFanProfiles.findIndex(profile => profile.name === nextProfile);
        if (nextProfileIndex !== -1) {
            this._fanProfile = defaultFanProfiles[nextProfileIndex];
            this.updateDatasets();
        }
    }
    get fanProfile() {
        return this._fanProfile.name;
    }

    @Input() minFanspeed: number = 0;
    @Input() offsetFanspeed: number = 0;

    // Graph data
    public tempsLabels: Label[] = Array.from(Array(100).keys()).concat(100).map(e => e.toString());
    public fantableDatasets: ChartDataSets[] = [
        { label: 'CPU Fan', data: [], spanGaps: true, lineTension: 0.1, steppedLine: true },
        { label: 'GPU Fan', data: [], spanGaps: true, lineTension: 0.1, steppedLine: true }
    ];
    public graphType = 'line';
    public graphColors: Color[] = [
        {
            borderColor: 'black',
            backgroundColor: 'rgba(0, 0, 0, 0.3)'
        },
        {
            borderColor: 'red',
            backgroundColor: 'rgba(255, 0, 0, 0.3)'
        }
    ];

    public graphOptions: ChartOptions = {
        responsive: true,
        maintainAspectRatio: false
    };

    constructor() { }

    ngOnInit() {
    }

    private updateDatasets(): void {
        if (this._fanProfile === undefined) return;

        const cpuData: number[] = [];
        for (const tableEntry of this._fanProfile.tableCPU) {
            cpuData.push(tableEntry.speed);
        }

        const gpuData: number[] = [];
        for (const tableEntry of this._fanProfile.tableGPU) {
            gpuData.push(tableEntry.speed);
        }

        // const nullDupes = data => data.map((x, i) => (!this.interestingTemps.includes(i) && data[i - 1] === x && ((i + 1) < data.length && data[i + 1] === x)) ? null : x);
        this.fantableDatasets[0].data = cpuData; //nullDupes(cpuData);
        this.fantableDatasets[1].data = gpuData; //nullDupes(gpuData);
    }

}
