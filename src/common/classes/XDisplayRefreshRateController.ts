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
    private displayName = ""
    public getIsX11(): boolean 
    {
        let result = child_process.execSync(`echo $XDG_SESSION_TYPE`) + "";
        if(result === "x11")
        {
            return true;
        }
        else
         {
            return false;
         }
    }

    // dann get refresh rates oder so (die frage ist, soll es die auflösung gleich mit schicken?)
// wo wir hier die funktion reinbauen, die xrandr's output parsed#
// also die verfügbaren refreshrates plus die derzeit aktive raushaut

// sollen wir einfach als bonus einbauen, dass man die auflösung gleich mit einstellen kann?
// vlt bau ich es einfach mit ein, es dann auszukommentieren ist wirklicht nicht schwer xD
    public getDisplayModes(): IDisplayFreqRes
    {
        // TODO
        // vermutlich sollte sich diese klasse hier merken, wie der interne bildschirm heißt? bekommt er vom parsen
        // wir suchen nach displays die entweder edp oder lvds (mit eDP-1 bzw LVDS-1) heißen
        // wobei die meisten tuxedo devices edp haben sollten
        let result = child_process.execSync(`xrandr -q`) + "";
        // ok jetzt parsen, wir wollen alles ab eDO-<int> (welches wir in die variable displayname parsen)
        // bis zur letzten auflösung, die \t<int>x<int>\t<float> ist wobei sich \t<float> beliebig oft wiederholt
        // achso, ein * und + können auch drin sein, die sind nur in soweit wichtig, dass wir die aktive res richtig setzen
        // die aktive res soll dublicate in allen verfügbaren res mit drin sein
        var displayNameRegex = /((eDP\-[0-9]+)|(LVDS\-[0-9]+))/
        // each line consists of one resolutionRegex and one or more freqRegex sepparated by tabs
        // we want everything after displayNameRegex (which we wanna save into displayName variable) 
        // that matches resolutionRegex \t (freqRegex)+
        var resolutionRegex = /\t[0-9]{3,4}x[0-9]{3,4}[a-z]?/g // matches 1920x1080 (and 1920x1080i because apparantly some resolutions have letters after them AAAAAAHHHHH)
        // wait, does the i at the end of the resolution mean "in use"?
        var freqRegex = /[0-9]{1,3}\.[0-9]{2}[\*]?[\+]?/ // matches 60.00*+  50.00    59.94    59.99 
        var fullLineRegex = /\t[0-9]{3,4}x[0-9]{3,4}[a-z]?(\t[0-9]{1,3}\.[0-9]{2}[\*]?[\+]?)+/ // matches 1920x1080     60.00*+  50.00    59.94    59.99 
        
        // or should we use xrandr --listmonitors ? or xrandr --listactivemonitors
        this.displayName = "";

        // pff so we look at each line after displayNameRegex, see if it matches fullLineRegex
        // if yes we put it into our displaymodes
        // if we come across one that has * we ALSO put it in active mode
        // * means active, + means prefered
        // ok wie wäre es wenn wir jede zeile des outputs durchgehen und nach eDP-<int> bzw LVDS-<int> schauen
        // und dann alle zeilen danach parsen, bis die Zeile die wir anschauen nicht mehr dem
        // format <integer>x<integer>(*+)[ \t<int><int>.<int><int> ](mind einmal) entspricht

        // maybe we should split the whole output into an array, on the line breaks and go through it line for line
        // untill we encounter the right display name line
        // then look at every line after and stuff it into the displaymodes array until we land on a line that does not match
        // the regex anymore?
        let lines = result.split("\n");
        let foundDisplayName = false;
        let newDisplayModes: IDisplayFreqRes;
        for (var i = 0; i < lines.length; i++)
        {
            if(!foundDisplayName)
            {
                let name = lines[i].match(displayNameRegex);
                if(name[0] !== "")
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
                    let newMode:IDisplayMode; 
                    newMode.xResolution = parseInt(resolution[0]);
                    newMode.yResolution = parseInt(resolution[1]);
                    newMode.refreshRates = [];
                    for (let i = 0; i < refreshrates.length; i++)
                    {
                    // TODO
                    // look for * and + if they are there remove them
                    // if they are there add mode to the active mode and also to the normal displaymodes
                    // I think, maybe we don't even need to remove the *, in theory, parseFloat should ignore it.
                        newMode.refreshRates.push(parseFloat(refreshrates[i]));
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

    /* 

    just for reference:
    export interface IDisplayFreqRes 
    {
        displayName: string;
        activeMode: IDisplayMode;
        // active Mode is also included in displayModes
        displayModes: IDisplayMode[];
    }

    export interface IDisplayMode
    {
        refreshRates: number[];
        xResolution: number;
        yResolution: number;
    }
    
    */

// und dann letztendlich eine funktion, die die refresh rate setzt
    public setRefreshRate(rate: number): void
    {
        child_process.execSync(`xrandr --output ${this.displayName} -r ${rate}`);
    }
    public setResolution(xRes: number, yRes: number): void
    {
        child_process.execSync(`xrandr --output ${this.displayName} --mode ${xRes}x${yRes}`);
    }

    public setRefreshResolution(rate: number, xRes: number, yRes: number)
    {
        child_process.execSync(`xrandr --output ${this.displayName} --mode ${xRes}x${yRes} -r ${rate}`);
    }
}
