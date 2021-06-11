import { Component, Input, OnInit } from '@angular/core';
import { ChartDataSets, ChartOptions } from 'chart.js';
import { Color, Label } from 'ng2-charts';
import { ITccFanProfile } from 'src/common/models/TccFanTable';

@Component({
    selector: 'app-fan-graph',
    templateUrl: './fan-graph.component.html',
    styleUrls: ['./fan-graph.component.scss']
})
export class FanGraphComponent implements OnInit {

    private _fanProfile: ITccFanProfile;
    @Input() set fanProfile(nextProfile: ITccFanProfile) {
        this._fanProfile = nextProfile;
        // TODO: fill graph axis
    }
    get fanProfile() {
        return this._fanProfile;
    }

    @Input() minFanspeed: number = 0;
    @Input() offsetFanspeed: number = 0;

    // Graph data
    public tempsLabels: Label[] = [ ];
    public fantableDatasets: ChartDataSets[] = [];
    public graphType = 'line';
    public graphColors: Color[] = [
        {
            borderColor: 'black',
            // backgroundColor: 'rgba(255, 0, 0, 0.3)'
        }
    ];

    public graphOptions: ChartOptions = {
        responsive: true,
        maintainAspectRatio: false
    };

    constructor() { }

    ngOnInit() {
    }

}
