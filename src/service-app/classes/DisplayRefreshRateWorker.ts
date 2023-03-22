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
import { IDisplayFreqRes, IDisplayMode} from '../../common/models/DisplayFreqRes';
import { TuxedoControlCenterDaemon } from './TuxedoControlCenterDaemon';

export class DisplayRefreshRateWorker extends DaemonWorker {

    private controller: XDisplayRefreshRateController;
    // if we decide to put in wayland support we simply have to make a new controller?
    private isX11: boolean;
    private displayInfo: IDisplayFreqRes;

    constructor(tccd: TuxedoControlCenterDaemon) {
        super(9000, tccd); // TODO see if this worker ID thing is still free
        this.controller = new XDisplayRefreshRateController();
    }

    public onStart(): void {
        this.isX11 = this.controller.getIsX11();
    }

    public onWork(): void {
        if (!this.isX11)
        {
            // TODO switch this to output on the dbus I guess
            //return "Wayland is not supported at this point!"
            // TODO would it make sense to just turn the worker off if it's wayland, or should it poll this regularly for if someone switches to x11
            // is this even possible without restarting tccd anyway?
            return;
        }
                // get current display settings from controller and save them into data structure
                this.getAllInfo();
                // TODO now send those infos to the gui through tccd? something like this?
                this.tccd.dbusData.displayModes = JSON.stringify(this.displayInfo);
        /*
        ok all of this goes into the functions themselves I guess
        // TODO 

        // look into what the active profile says and if it's different from currently active settings,
        // if yes then use private functions to activate the differing settings.
        // uhm so we need to look into tccd. ??? activeprofile yadayadayada 
        // most importantly we need to check the variable bool userefreshrate or whatever
        // to see if refreshrate should even be set on profile activation
        this.tccd.activeProfile.display.useRefRate
        var newRefRate = this.tccd.activeProfile.display.refreshRate
        // look at current resolution and see if ref rate is available for this resolution
        this.displayInfo.activeMode // == .find() or whatever is newRefRate
        this.tccd.activeProfile.display.useResolution
        // look at current refresh rate and see if it's supported with this resolution
        // TODO what to do if it fails?
        */
    }

    public onExit(): void {
        
    }

    private getAllInfo()
    {
        this.displayInfo = this.controller.getDisplayModes();
    }

    public getActiveRefRate()
    {
        return this.controller.getDisplayModes().activeMode.refreshRates[0];
    }

    // private getAvailableRefRates()
    // {

    //     return this.controller.getDisplayModes().displayModes;
    // }

    public setRefRate(rate: number)
    {
        // TODO should this function in generel check if the refresh rate is available for the display mode?
        this.controller.setRefreshRate(rate);
        return true;

    }

    public setRes(xRes: number, yRes: number)
    {
        // TODO should this function in generel check if the resolution is available for the display mode?
        this.controller.setResolution(xRes, yRes);
        return true;
    }

    public setMode(xRes: number, yRes: number, refRate: number)
    {
        this.controller.setRefreshResolution(refRate,xRes,yRes);
        return true;

    }

   
}
