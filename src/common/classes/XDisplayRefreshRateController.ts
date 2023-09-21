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

import { IDisplayFreqRes, IDisplayMode } from "../models/DisplayFreqRes";
import * as child_process from "child_process";
export class XDisplayRefreshRateController {
    private displayName: string;
    private isX11: boolean;
    private displayEnvVariable: string;
    private xAuthorityFile: string;
    public XDisplayRefreshRateController() {
        this.displayName = "";
        this.setEnvVariables();
    }

    private setEnvVariables(): void {
        let result = child_process.execSync(`who`) + "";

        // Capturing groups: 1 is user name, 2 can be ignored and 3 is the display variable.
        var correctLineRegex = /(\w+)\s+(.+\s+)+(\(:.+\))/;

        var match = result.match(correctLineRegex);

        // If there is no match, the X server is not running, which can be because it's too early or because we are on Wayland.
        // This check may need to be repeated during the runtime.
        if (!match) {
            this.isX11 = false;
            this.displayEnvVariable = "";
            this.xAuthorityFile = "";
            return;
        }
        var username = match[1];
        this.displayEnvVariable = match[3].replace("(", "").replace(")", "");
        this.xAuthorityFile = "/home/" + username + "/.Xauthority";
        this.isX11 = true;
    }

    public getIsX11(): boolean {
        // Always reset the env variables, because states can change during runtime.
        this.setEnvVariables();
        return this.isX11;
    }

    public getDisplayModes(): IDisplayFreqRes {
        this.setEnvVariables();

        if (!this.isX11 || !this.displayEnvVariable || !this.xAuthorityFile) {
            this.isX11 = false;
            this.displayEnvVariable = "";
            this.xAuthorityFile = "";
            return undefined;
        }

        const result = child_process
            .execSync(
                `export XAUTHORITY=${this.xAuthorityFile} && xrandr -q -display ${this.displayEnvVariable}`
            )
            .toString();

        const displayNameRegex = /(eDP\S*|LVDS\S*)/;

        // for example "1920x1080" and "1920x1080i"
        var resolutionRegex = /\s+[0-9]{3,4}x[0-9]{3,4}[a-z]?/;

        // for example "60.00*+", "50.00", "59.94" and 59.99"
        var freqRegex = /[0-9]{1,3}\.[0-9]{2}[\*]?[\+]?/g;

        // matches currently active config, for example "2560x1440 165.00*+ 40.00 +"
        var fullLineRegex =
            /\s+[0-9]{3,4}x[0-9]{3,4}[a-z]?(\s+[0-9]{1,3}\.[0-9]{2}[\*]?[\+]?)+/;

        let newDisplayModes: IDisplayFreqRes = {
            displayName: "",
            activeMode: {
                refreshRates: [],
                xResolution: 0,
                yResolution: 0,
            },
            displayModes: [],
        };

        const lines = result.split("\n");
        const lineIter = lines[Symbol.iterator]();
        let foundDisplayName = false;
        let currLine = lineIter.next().value;

        while (currLine && !foundDisplayName) {
            const displayNameMatch = currLine.match(displayNameRegex);
            if (displayNameMatch) {
                newDisplayModes.displayName = this.displayName =
                    displayNameMatch[0];

                foundDisplayName = true;
            }
            currLine = lineIter.next().value;
        }
        while (currLine && currLine.match(fullLineRegex)) {
            this.createDisplayMode(
                currLine,
                resolutionRegex,
                freqRegex,
                newDisplayModes
            );
            currLine = lineIter.next().value;
        }

        return newDisplayModes;
    }

    private createDisplayMode(
        line: string,
        resolutionRegex: RegExp,
        freqRegex: RegExp,
        newDisplayModes: IDisplayFreqRes
    ): void {
        const resolution = line.match(resolutionRegex)[0].split("x");
        const refreshrates = line.match(freqRegex);
        const newMode: IDisplayMode = {
            refreshRates: [],
            xResolution: parseInt(resolution[0]),
            yResolution: parseInt(resolution[1]),
        };
        for (let rate of refreshrates) {
            const num = parseFloat(rate.replace(/[^0-9.]/g, ""));
            if (!newMode.refreshRates.includes(num)) {
                newMode.refreshRates.push(num);
            }
        }
        newDisplayModes.displayModes.push(newMode);

        this.setActiveDisplayMode(refreshrates, newDisplayModes, newMode);
    }

    private setActiveDisplayMode(
        refreshrates: RegExpMatchArray,
        newDisplayModes: IDisplayFreqRes,
        newMode: IDisplayMode
    ): void {
        const activeRateIndex = refreshrates.findIndex((rate) =>
            rate.includes("*")
        );
        if (activeRateIndex !== -1) {
            newDisplayModes.activeMode.refreshRates = [
                newMode.refreshRates[activeRateIndex],
            ];
            newDisplayModes.activeMode.xResolution = newMode.xResolution;
            newDisplayModes.activeMode.yResolution = newMode.yResolution;
        }
    }

    public setRefreshRate(rate: number): void {
        if (this.isX11 && this.displayEnvVariable && this.xAuthorityFile) {
            child_process.execSync(
                `export XAUTHORITY=${this.xAuthorityFile} && xrandr -display ${this.displayEnvVariable} --output ${this.displayName} -r ${rate}`
            );
        }
    }

    public setResolution(xRes: number, yRes: number): void {
        if (this.isX11 && this.displayEnvVariable && this.xAuthorityFile) {
            child_process.execSync(
                `export XAUTHORITY=${this.xAuthorityFile} && xrandr -display ${this.displayEnvVariable} --output ${this.displayName} --mode ${xRes}x${yRes}`
            );
        }
    }

    public setRefreshResolution(
        xRes: number,
        yRes: number,
        rate: number
    ): void {
        if (this.isX11 && this.displayEnvVariable && this.xAuthorityFile) {
            child_process.execSync(
                `export XAUTHORITY=${this.xAuthorityFile} && xrandr -display ${this.displayEnvVariable} --output ${this.displayName} --mode ${xRes}x${yRes} -r ${rate}`
            );
        }
    }
}
