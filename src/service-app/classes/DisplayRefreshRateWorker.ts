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
import { IDisplayFreqRes} from '../../common/models/DisplayFreqRes';
import { TuxedoControlCenterDaemon } from './TuxedoControlCenterDaemon';
import { ITccProfile } from 'src/common/models/TccProfile';

export class DisplayRefreshRateWorker extends DaemonWorker {

    private controller: XDisplayRefreshRateController;
    private displayInfo: IDisplayFreqRes;
    private refreshRateSupported: boolean;

    constructor(tccd: TuxedoControlCenterDaemon) {
        super(3000, tccd); 
        this.controller = new XDisplayRefreshRateController();
    }

    public onStart(): void {      
    }

    public onWork(): void {
        // get current display settings from controller and save them into data structure
        this.getAllInfo();
        // get active profile and check if we need to do something
        let activeprofile: ITccProfile;
        try
        {
            activeprofile = this.tccd.getCurrentProfile();
        }
        catch(err)
        {
            return;
        }
        // occured right after boot when user was not logged into graphical DE yet (but into tty)
        if(!activeprofile)
        {
            return;
        }
        if(activeprofile.display.useRefRate)
        {
            if(activeprofile.display.refreshRate !== this.displayInfo.activeMode.refreshRates[0])
            {
                // xrandr sometimes fails when you don't specifiy the full line
                this.setMode(this.displayInfo.activeMode.xResolution,this.displayInfo.activeMode.yResolution,activeprofile.display.refreshRate);
            }
        }
        // if(activeprofile.display.useResolution)
        // {
        //     if(activeprofile.display.xResolution !== this.displayInfo.activeMode.xResolution || activeprofile.display.yResolution !== this.displayInfo.activeMode.yResolution)
        //     {
        //         this.setMode(activeprofile.display.xResolution, activeprofile.display.yResolution, activeprofile.display.refreshRate);
        //     }
        // }
    }

    public onExit(): void {
        
    }

    // queries the controller to get all info 
    private getAllInfo()
    {
        this.displayInfo = this.controller.getDisplayModes();
        // once we implement wayland we need to change this check :)
        this.refreshRateSupported = this.controller.getIsX11();
        if(this.displayInfo === undefined)
        {
            this.tccd.dbusData.displayModes = undefined;
        }
        else
        {
            this.tccd.dbusData.displayModes = JSON.stringify(this.displayInfo);
        }
        this.tccd.dbusData.refreshRateSupported = this.refreshRateSupported;
    }

    public getActiveDisplayMode()
     {
        if(this.displayInfo === undefined)
        {
            this.getAllInfo();
        }
        if(this.displayInfo === undefined)
        {
            return undefined;
        }
        else
        {
            return this.displayInfo.activeMode;
        }
     }

    // set refresh rate only
    private setRefRate(rate: number)
    {
        this.controller.setRefreshRate(rate);
    }

    // set resolution only
    private setRes(xRes: number, yRes: number)
    {
        this.controller.setResolution(xRes, yRes);
    }

    // set both at the same time - have to use this using xrandr because it sometimes fails otherwise
    private setMode(xRes: number, yRes: number, refRate: number)
    {
        this.controller.setRefreshResolution(xRes,yRes,refRate);
    }

   
}
