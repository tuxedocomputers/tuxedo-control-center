import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ChartDataSets, ChartOptions } from 'chart.js';
import { Color, Label, ThemeService } from 'ng2-charts';
import { Subscription } from 'rxjs';
import { defaultFanProfiles, ITccFanProfile, ITccFanTableEntry } from 'src/common/models/TccFanTable';
import { UtilsService } from '../utils.service';

@Component({
    selector: 'app-fan-graph',
    templateUrl: './fan-graph.component.html',
    styleUrls: ['./fan-graph.component.scss']
})
export class FanGraphComponent implements OnInit, OnDestroy, AfterViewInit {

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
            steppedLine: true,
            showLine: true,
            pointRadius: 2
        },
        {
            label: 'GPU Fan',
            data: [],
            spanGaps: true,
            lineTension: 0.1,
            steppedLine: true,
            showLine: true,
            pointRadius: 2
        }
    ];
    public graphType = 'line';
    public graphColors: Color[] = [
        {
            borderColor: 'rgba(120, 120, 120, 0.4)',
            backgroundColor: 'rgba(10, 10, 10, 0.4)'
        },
        {
            borderColor: 'rgba(227, 0, 22, 0.3)',
            backgroundColor: 'rgba(227, 0, 22, 0.3)'
        }
    ];

    public graphOptions: ChartOptions = {
        animation: {
            duration: 300
        },
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

    @ViewChild('chartTextE', { static: false }) chartTextE: ElementRef;
    public get chartTextColor(): string { return this.elementColor(this.chartTextE); };

    initDone = false;

    private subscriptions: Subscription = new Subscription();

    constructor(
        private utils: UtilsService,
        private cdref: ChangeDetectorRef,
        private themeService: ThemeService) { }

    ngAfterViewInit(): void {
        this.initDone = true;
        this.cdref.detectChanges();
    }

    ngOnInit() {
        // Workaround for applying theme overrides
        this.subscriptions.add(this.utils.themeClass.subscribe( (next) => {
            if (!this.initDone) { return; }
            setTimeout( () => {
                this.updateTheme();
            }, 100);
        }));
    }

    ngOnDestroy(): void {
        this.subscriptions.unsubscribe();
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

    private elementColor(element: ElementRef): string {
        if (element !== undefined && this.initDone) {
            return getComputedStyle(element.nativeElement).color;
        } else {
            return '';
        }
    }

    private updateTheme() {
        let overrides: ChartOptions;
        overrides = {
            legend: {
                labels: { fontColor: this.chartTextColor }
            },
            scales: {
                xAxes: [{
                    ticks: { fontColor: this.chartTextColor },
                    gridLines: { color: `rgba(${this.chartTextColor.slice(4, -1)}, 0.2)` }
                }],
                yAxes: [{
                    ticks: { fontColor: this.chartTextColor },
                    gridLines: { color: `rgba(${this.chartTextColor.slice(4, -1)}, 0.2)` }
                }]
            }
        };
        this.themeService.setColorschemesOptions(overrides);
    }

}
