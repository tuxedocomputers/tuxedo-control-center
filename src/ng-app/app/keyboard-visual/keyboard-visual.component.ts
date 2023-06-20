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

import {
    Component,
    EventEmitter,
    HostListener,
    Input,
    OnInit,
    Output,
} from "@angular/core";
import { KeyboardBacklightCapabilitiesInterface } from "src/common/models/TccSettings";

@Component({
    selector: "app-keyboard-visual",
    templateUrl: "./keyboard-visual.component.html",
    styleUrls: ["./keyboard-visual.component.scss"],
})
export class KeyboardVisualComponent implements OnInit {
    @Input()
    keyboardBacklightCapabilities: KeyboardBacklightCapabilitiesInterface;
    @Input() chosenColorHex: Array<string>;
    @Output() selectedZonesChange = new EventEmitter<number[]>();
    public selectedZones: Array<number> = [];
    public divHeight: number;
    private viewInitialized = false;

    constructor() {}

    ngOnInit(): void {
        this.selectedZones = Array.from(
            { length: this.keyboardBacklightCapabilities.zones },
            (_, i) => i
        );
        this.selectedZonesChange.emit(this.selectedZones);
    }

    ngAfterViewInit() {
        this.viewInitialized = true;
        this.updateHeight();
    }

    @HostListener("window:resize")
    onResize() {
        this.updateHeight();
    }

    updateHeight() {
        if (this.viewInitialized) {
            let el: HTMLElement;
            if (this.keyboardBacklightCapabilities.zones === 4) {
                el = document.getElementById("Svg4Zones");
            } else {
                el = document.getElementById("Svg1+3Zones");
            }
            const rect = el.getBoundingClientRect();
            this.divHeight = rect.height;
        }
    }

    private addOrRemoveSelectedZones(num: number): number[] {
        const index = this.selectedZones.indexOf(num);
        if (index !== -1) {
            this.selectedZones.splice(index, 1);
        } else {
            this.selectedZones.push(num);
        }
        return this.selectedZones;
    }

    public getSvgHeight(): number {
        if (this.keyboardBacklightCapabilities.zones === 1) {
            return 205;
        }
        return 215;
    }

    public getSvgWidth(): number {
        if (this.keyboardBacklightCapabilities.zones === 1) {
            return 728;
        }
        return 760;
    }

    public calculateTranslateValue(zone: number): string {
        if (this.keyboardBacklightCapabilities.zones === 3) {
            return `${832.61151 + zone * 16}, 535.06891`;
        } else {
            return "832.61151, 535.06891";
        }
    }

    public updateZoneOpacity(event: MouseEvent, zone: number): void {
        if (
            this.keyboardBacklightCapabilities.zones === 1 ||
            this.keyboardBacklightCapabilities.zones > 4
        ) {
            return;
        }

        if (!event.shiftKey) {
            this.selectedZones = [];
        }

        this.selectedZonesChange.emit(this.addOrRemoveSelectedZones(zone));
        const gElements = document.querySelectorAll("g.key-group");
        gElements.forEach((g: SVGGraphicsElement) => {
            const isSelected = this.selectedZones.includes(
                parseInt(g.dataset.zone)
            );
            if (isSelected) {
                g.classList.remove("unselected");
                g.classList.add("selected");
            } else {
                g.classList.add("unselected");
                g.classList.remove("selected");
            }
        });
    }
}
