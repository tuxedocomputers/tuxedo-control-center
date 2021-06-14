import { Component, Input, OnInit } from '@angular/core';
import { ChartDataSets, ChartOptions } from 'chart.js';
import { Color, Label } from 'ng2-charts';
import { defaultFanProfiles, ITccFanProfile, ITccFanTableEntry } from 'src/common/models/TccFanTable';

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

    private _minFanspeed:number = 0;
    @Input() set minFanspeed(value: number) {
        this._minFanspeed = value;
        this.updateDatasets();
    }
    get minFanspeed() { return this._minFanspeed; }

    private _offsetFanspeed: number = 0;
    @Input() set offsetFanspeed(value: number) {
        this._offsetFanspeed = value;
        this.updateDatasets();
    }
    get offsetFanspeed() { return this._offsetFanspeed; }

    // Graph data
    public tempsLabels: Label[] = Array.from(Array(100).keys()).concat(100).map(e => this.formatTemp(e));
    public fantableDatasets: ChartDataSets[] = [
        {
            label: 'CPU Fan',
            data: [],
            spanGaps: true,
            lineTension: 0.1,
            steppedLine: true
        },
        {
            label: 'GPU Fan',
            data: [],
            spanGaps: true,
            lineTension: 0.1,
            steppedLine: true
        }
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
        maintainAspectRatio: false,
        tooltips: {
            callbacks: {
                label: (item, data) => {
                    return data.datasets[item.datasetIndex].label + ' ' + this.formatSpeed(item.yLabel);
                }
            }
        },
        scales: {
            yAxes: [
                {
                    ticks: {
                        beginAtZero: true,
                        callback: (value: number) => {
                            if (value % 20 === 0) {
                                return this.formatSpeed(value);
                            } else {
                                return null;
                            }
                        }
                    }
                }
            ],
            xAxes: [
                {
                    ticks: {
                        beginAtZero: true,
                        autoSkip: false,
                        callback: (value, index) => {
                            if (index % 5 === 0) {
                                return value;
                            } else {
                                return null;
                            }
                        }
                    }
                }
            ]
        },
    };

    constructor() { }

    ngOnInit() {
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

        // const nullDupes = data => data.map((x, i) => (!this.interestingTemps.includes(i) && data[i - 1] === x && ((i + 1) < data.length && data[i + 1] === x)) ? null : x);
        this.fantableDatasets[0].data = cpuData; //nullDupes(cpuData);
        this.fantableDatasets[1].data = gpuData; //nullDupes(gpuData);
    }

    /**
     * Applies min and offset parameters and returns the resulting speed
     * Ref. FanControlLogic.ts: calculateSpeedPercent()
     * 
     * @param entry Fan table entry to be evaluated
     * @returns Resulting speed
     */
    private applyParameters(entry: ITccFanTableEntry): number {
        // Apply offset
        let newSpeed = entry.speed;

        const offsetDisableCondition = this.offsetFanspeed < 0 && entry.temp > 75;
        if (!offsetDisableCondition) {
            newSpeed += this.offsetFanspeed;
            if (newSpeed > 100) {
                newSpeed = 100;
            } else if (newSpeed < 0) {
                newSpeed = 0;
            }
        }

        // Adjust for minimum speed parameter
        if (newSpeed < this.minFanspeed) {
            newSpeed = this.minFanspeed;
        }

        return newSpeed;
    }

    private formatTemp(value: number | string): string {
        return `${value} °C`;
    }
    
    private formatSpeed(value: number | string): string {
        return `${value} %`;
    }
}
