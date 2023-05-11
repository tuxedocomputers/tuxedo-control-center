import { Component, EventEmitter, Input, OnInit, Output } from "@angular/core";
import { KeyboardBacklightCapabilitiesInterface } from "src/common/models/TccSettings";

@Component({
    selector: 'app-keyboard-visual',
    templateUrl: './keyboard-visual.component.html',
    styleUrls: ['./keyboard-visual.component.scss'],
})
export class KeyboardVisualComponent implements OnInit {
    @Input()
    keyboardBacklightCapabilities: KeyboardBacklightCapabilitiesInterface;
    @Input() chosenColorHex: Array<string>;
    @Output() selectedZoneChange = new EventEmitter<number>();
    public selectedZone = 0;

    constructor() {}

    ngOnInit(): void {}

    public onKeyboardImageClick(zone: number) {
        if (this.keyboardBacklightCapabilities.zones > 1) {
            this.selectedZone = zone;
            this.selectedZoneChange.emit(zone);
        }
    }
}
