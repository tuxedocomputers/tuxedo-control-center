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
