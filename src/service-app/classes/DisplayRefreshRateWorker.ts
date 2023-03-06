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
import { DaemonWorker } from './DaemonWorker';
import { XDisplayRefreshRateController } from '../../common/classes/XDisplayRefreshRateController';

import { TuxedoControlCenterDaemon } from './TuxedoControlCenterDaemon';

export class DisplayRefreshRateWorker extends DaemonWorker {

    private controller: XDisplayRefreshRateController;
    // if we decide to put in wayland support we simply have to make a new controller?
    private isX11: boolean;

    constructor(tccd: TuxedoControlCenterDaemon) {
        super(9000, tccd); // TODO see if this worker ID thing is still free
        this.controller = new XDisplayRefreshRateController();
    }

    public onStart(): void {
        this.isX11 = this.controller.getIsX11();
    }

    public onWork(): void {

    }

    public onExit(): void {
        
    }

    public getActiveRefRate()
    {
        if (!this.isX11)
        {
            return "Wayland is not supported at this point!"
        }
        return this.controller.getDisplayModes().activeMode.refreshRates[0];
    }

    public getAvailableRefRates()
    {
        if (!this.isX11)
        {
            return "Wayland is not supported at this point!"
        }
        return this.controller.getDisplayModes();
    }

    public setRefRate(rate: number)
    {
        if (!this.isX11)
        {
            return "Wayland is not supported at this point!"
        }
        else
        {
            this.controller.setRefreshRate(rate);
        }
    }

    public setRes(xRes: number, yRes: number)
    {
        if (!this.isX11)
        {
            return "Wayland is not supported at this point!"
        }
        else
        {
            this.controller.setResolution(xRes, yRes);
        }
    }

   
}
