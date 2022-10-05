/*!
 * Copyright (c) 2019-2021 TUXEDO Computers GmbH <tux@tuxedocomputers.com>
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
import { Component, OnInit, Renderer2, ElementRef, ViewChild } from '@angular/core';
import { ElectronService } from 'ngx-electron';
import { UtilsService } from '../utils.service';
import { STEPPER_GLOBAL_OPTIONS } from '@angular/cdk/stepper';

@Component({
  selector: 'app-tomte-gui',
  templateUrl: './tomte-gui.component.html',
  styleUrls: ['./tomte-gui.component.scss'],
  providers: [
    {
      provide: STEPPER_GLOBAL_OPTIONS,
      useValue: { displayDefaultIndicatorType: false }
    }
  ]
})
export class TomteGuiComponent implements OnInit {
  tomteguitest = '';

  constructor(
    private electron: ElectronService,
    private utils: UtilsService,
    private renderer: Renderer2
  ) { }

  @ViewChild('tomteList', { static: false }) tomteList: ElementRef;

  ngOnInit() {
  }

  ngAfterViewInit() {
    this.tomtelist();
  }

  public focusControl(control): void {
    setImmediate(() => { control.focus(); });
  }

  public openExternalUrl(url: string): void {
    this.electron.shell.openExternal(url);
  }

    private async tomtelist() {

    let command = "tomte list"

    return this.utils.execCmd(command).then((data) => {
            this.parseTomteList(data);
        }).catch(function(err) {
            console.log("tomte list failed!", err);
        })
    }

    private parseTomteList(data){
        data = "" + data;
        data = data.split("\n");
        for (var i = 0; i < data.length; i++)
        {
            this.renderer.appendChild(this.tomteList,'' + data[i]);
        }
    }
 
}
