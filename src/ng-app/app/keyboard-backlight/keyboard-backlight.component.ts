/*!
 * Copyright (c) 2019-2020 TUXEDO Computers GmbH <tux@tuxedocomputers.com>
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

import { Component, OnInit } from '@angular/core';
import { ConfigService } from '../config.service';
import { UtilsService } from '../utils.service';
import { Subscription } from 'rxjs';
import { TccDBusClientService } from '../tcc-dbus-client.service';
import { KeyboardBacklightColorModes } from '../../../common/models/TccSettings';

@Component({
    selector: 'app-keyboard-backlight',
    templateUrl: './keyboard-backlight.component.html',
    styleUrls: ['./keyboard-backlight.component.scss']
})
export class KeyboardBacklightComponent implements OnInit {
    Object = Object;

    private subscriptions: Subscription = new Subscription();

    public chosenColorHex: string = "#000000";

    constructor(
        private config: ConfigService,
        private utils: UtilsService,
        private tccdbus: TccDBusClientService
    ) { }

    ngOnInit() {

    }

    onButtonClickOn(){
        this.config.getSettings().keyboardBacklightBrightness = 100;
        this.config.getSettings().keyboardBacklightColorMode = KeyboardBacklightColorModes.static;
        this.config.getSettings().keyboardBacklightColor = [0xffffff00, 0xffffff00, 0xffffff00];
        this.config.saveSettings()
    }

    onButtonClickOff(){
        this.config.getSettings().keyboardBacklightBrightness = 0;
        this.config.getSettings().keyboardBacklightColorMode = KeyboardBacklightColorModes.static;
        this.config.getSettings().keyboardBacklightColor = [0xffffff00, 0xffffff00, 0xffffff00];
        this.config.saveSettings()
    }
}
