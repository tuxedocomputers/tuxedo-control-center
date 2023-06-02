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

import { IDisplayFreqRes, IDisplayMode } from '../models/DisplayFreqRes';
import * as child_process from 'child_process';
export class XDisplayRefreshRateController

{
    private displayName: string;
    private isX11: boolean;
    private displayEnvVariable: string;
    private xAuthorityFile: string;
    public XDisplayRefreshRateController()
    {
        this.displayName = "";
        this.setEnvVariables();
    }

    private setEnvVariables()
    {
        let result = child_process.execSync(`who`) + "";
        var correctLineRegex = /(\w+)\s+(.+\s+)+(\(:.+\))/ // capturing groups: 1 is user name 2 can be ignored and 3 is the display variable
        var match = result.match(correctLineRegex);
        if(!match)
        {
            // if there is no match the xserver is not running, either because it's too early
            // or because we are on wayland
            // this can change during the runtime so we need to repeat this check!
            this.isX11 = false;
            this.displayEnvVariable="";
            this.xAuthorityFile="";
            return;
        }
        var username = match[1];
        this.displayEnvVariable = match[3].replace("(","").replace(")","");
        this.xAuthorityFile="/home/"+username+"/.Xauthority"
        this.isX11 = true;
    }

    public getIsX11()//: boolean 
    {
        // always reset the env Variables, because states can change during runtime!
        this.setEnvVariables();
        return this.isX11;
    }

    public getDisplayModes(): IDisplayFreqRes
    {
        this.setEnvVariables();
        // if any of those fails return empty information, so no old information is sent to the GUI
        if(!this.isX11 || !this.displayEnvVariable || !this.xAuthorityFile )
        {
            this.isX11 = false;
            this.displayEnvVariable="";
            this.xAuthorityFile="";
            return undefined;
        }
        let result = child_process.execSync(`export XAUTHORITY=${this.xAuthorityFile} && xrandr -q -display ${this.displayEnvVariable}`) + "";
        // haha f me for thinking this would work. so apparantly it can be eDP plus anything
        // or LVDS. I think I will try match eDP/LVDS following anything until the first whitespace
        // character
        var displayNameRegex = /((eDP\S*)|(LVDS\S*))/
        var resolutionRegex = /\s+[0-9]{3,4}x[0-9]{3,4}[a-z]?/ // matches 1920x1080 (and 1920x1080i because apparantly some resolutions have letters after them AAAAAAHHHHH)
        // couldn't find much in the documentation, but the i at the end of the line probably means "interlaced"
        // which is the only thing that makes proper sence in relationship to resolutions
        var freqRegex = /[0-9]{1,3}\.[0-9]{2}[\*]?[\+]?/g // matches 60.00*+  50.00    59.94    59.99 
        var fullLineRegex = /\s+[0-9]{3,4}x[0-9]{3,4}[a-z]?(\s+[0-9]{1,3}\.[0-9]{2}[\*]?[\+]?)+/ // matches 1920x1080     60.00*+  50.00    59.94    59.99 

        this.displayName = "";
        let lines = result.split("\n");
        let foundDisplayName = false;
        let newDisplayModes: IDisplayFreqRes =
        {
            displayName: "",
            activeMode: {
                refreshRates: [],
                xResolution: 0,
                yResolution: 0
            },
            displayModes: []
        };
        for (var i = 0; i < lines.length; i++)
        {
            if(!foundDisplayName)
            {
                let name = lines[i].match(displayNameRegex);
                if(name != null)
                {
                    this.displayName = name[0];
                    foundDisplayName =true;
                    newDisplayModes.displayName = this.displayName;
                    newDisplayModes.displayModes =  [];
                }
            }
            else
            {
                if(lines[i].match(fullLineRegex))
                {
                    let resolution = lines[i].match(resolutionRegex)[0].split("x");
                    let refreshrates = lines[i].match(freqRegex);
                    let newMode:IDisplayMode =
                    {
                        refreshRates: [],
                        xResolution: 0,
                        yResolution: 0
                    }; 
                    newMode.xResolution = parseInt(resolution[0]);
                    newMode.yResolution = parseInt(resolution[1]);
                    newMode.refreshRates = [];
                    for (let i = 0; i < refreshrates.length; i++)
                    {
                    // look for * and + if they are there remove them
                    // if they are there add mode to the active mode and also to the normal displaymodes
                    // I think, maybe we don't even need to remove the *, in theory, parseFloat should ignore it.
                    // only the currently active refresh rate will be added to the active mode
                    // all the other available refresh rates for that resolution will be added in the array with the
                    // other modes, hence why we have dublicates

                    // Check if refresh rate is already in there, if yes do not push again:
                    if(newMode.refreshRates.indexOf(parseFloat(refreshrates[i])) === -1)
                    {
                        newMode.refreshRates.push(parseFloat(refreshrates[i]));
                    }        
                        if (refreshrates[i].includes("*"))
                        {
                            newDisplayModes.activeMode.refreshRates= [parseFloat(refreshrates[i])];
                            newDisplayModes.activeMode.xResolution = newMode.xResolution;
                            newDisplayModes.activeMode.yResolution = newMode.yResolution;
                        }
                    }
                    newDisplayModes.displayModes.push(newMode);
                }
                else
                {
                    break;
                }
            }
        }

        return newDisplayModes;
    }



    // set refresh rate
    public setRefreshRate(rate: number): void
    {
        if(this.isX11 && this.displayEnvVariable && this.xAuthorityFile)
        {
            child_process.execSync(`export XAUTHORITY=${this.xAuthorityFile} && xrandr -display ${this.displayEnvVariable} --output ${this.displayName} -r ${rate}`);
        }
    }

    //set resolution
    public setResolution(xRes: number, yRes: number): void
    {
        if(this.isX11 && this.displayEnvVariable && this.xAuthorityFile)
        {
            child_process.execSync(`export XAUTHORITY=${this.xAuthorityFile} && xrandr -display ${this.displayEnvVariable} --output ${this.displayName} --mode ${xRes}x${yRes}`);
        }
    }

    // set both
    public setRefreshResolution(xRes: number, yRes: number, rate: number)
    {
        if(this.isX11 && this.displayEnvVariable && this.xAuthorityFile)
        {
        child_process.execSync(`export XAUTHORITY=${this.xAuthorityFile} && xrandr -display ${this.displayEnvVariable} --output ${this.displayName} --mode ${xRes}x${yRes} -r ${rate}`);
        }
    }
}
