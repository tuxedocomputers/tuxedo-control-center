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

import { IDisplayFreqRes } from '../models/DisplayFreqRes';
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
        let result = child_process.execSync(`xrandr`) + "";
        // ok jetzt parsen, wir wollen alles ab eDO-<int> (welches wir in die variable displayname parsen)
        // bis zur letzten auflösung, die \t<int>x<int>\t<float> ist wobei sich \t<float> beliebig oft wiederholt
        // achso, ein * und + können auch drin sein, die sind nur in soweit wichtig, dass wir die aktive res richtig setzen
        // die aktive res soll dublicate in allen verfügbaren res mit drin sein
        this.displayName = "";

        // ok wie wäre es wenn wir jede zeile des outputs durchgehen und nach eDP-<int> bzw LVDS-<int> schauen
        // und dann alle zeilen danach parsen, bis die Zeile die wir anschauen nicht mehr dem
        // format <integer>x<integer>(*+)[ \t<int><int>.<int><int> ](mind einmal) entspricht
        return 
    }

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
