import { Component, Input, OnInit } from '@angular/core';
import { ITccFanProfile } from 'src/common/models/TccFanTable';

@Component({
    selector: 'app-fan-graph',
    templateUrl: './fan-graph.component.html',
    styleUrls: ['./fan-graph.component.scss']
})
export class FanGraphComponent implements OnInit {

    @Input() fanProfile: ITccFanProfile;
    @Input() minFanspeed: number = 0;
    @Input() offsetFanspeed: number = 0;

    constructor() { }

    ngOnInit() {
    }

}
