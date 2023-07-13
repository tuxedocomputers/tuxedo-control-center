
/*!
 * Copyright (c) 2019-2022 TUXEDO Computers GmbH <tux@tuxedocomputers.com>
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

import { Injectable } from '@angular/core';
import { IPC } from '../renderer';


/* 
    see https://github.com/maximegris/angular-electron/blob/main/src/app/core/services/electron/electron.service.ts
*/

@Injectable( {providedIn: 'root'})
export class ElectronService {  
    // TODO add type... contextbridgeapi or something
    ipcRenderer: IPC;
    constructor() 
    {
        // contextisolation = true, nodeintegration = false;
        // z.B: https://www.debugandrelease.com/the-ultimate-electron-guide/
        this.ipcRenderer = window.ipc;
    }  
  
}