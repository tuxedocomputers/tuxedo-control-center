/*!
 * Copyright (c) 2019-2025 TUXEDO Computers GmbH <tux@tuxedocomputers.com>
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

import * as child_process from 'node:child_process';
import * as fs from 'node:fs';
import type { IDisplayFreqRes, IDisplayMode } from '../models/DisplayFreqRes';

export class XDisplayRefreshRateController {
    private displayName: string = '';

    private isX11: number = -1;
    private isWayland: boolean = undefined;
    private isTTY: boolean = undefined;

    private display: string = '';
    private xAuthorityFile: string = '';
    public XDisplayRefreshRateController(): void {
        this.displayName = '';
        this.setVariables();
    }

    public setVariables(): undefined {
        const environmentVariables: string = child_process
            .execSync(
                `cat $(printf "/proc/%s/environ " $(pgrep -vu root | tail -n 20)) 2>/dev/null | \
                tr '\\0' '\\n' | \
                awk ' /DISPLAY=/ && !countDisplay {print; countDisplay++} \
                    /XAUTHORITY=/ && !countXAuthority {print; countXAuthority++} \
                    /XDG_SESSION_TYPE=/ && !countSessionType {print; countSessionType++} \
                    /USER=/ && !countUser {print; countUser++} \
                    {if (countDisplay && countXAuthority && countSessionType && countUser) exit} '`,
            )
            .toString();

        const displayMatch: RegExpMatchArray = environmentVariables.match(/^DISPLAY=(.*)$/m);
        const xAuthorityMatch: RegExpMatchArray = environmentVariables.match(/^XAUTHORITY=(.*)$/m);
        const xdgSessionMatch: RegExpMatchArray = environmentVariables.match(/^XDG_SESSION_TYPE=(.*)$/m);
        const userMatch: RegExpMatchArray = environmentVariables.match(/^USER=(.*)$/m);

        // additional checks to make sure environment variables are not taken from login screen
        // sddm XDG_SESSION_TYPE can differ from actual session type
        if (
            xAuthorityMatch &&
            (xAuthorityMatch[1].includes('/var/run/sddm/{') || xAuthorityMatch[1].includes('/var/lib/lightdm'))
        ) {
            return undefined;
        }

        const xAuthorityFile: string = xAuthorityMatch ? xAuthorityMatch[1].replace('XAUTHORITY=', '').trim() : '';

        this.xAuthorityFile = fs.existsSync(xAuthorityFile) ? xAuthorityFile : '';

        if (!this.xAuthorityFile) {
            return undefined;
        }

        // gdm XDG_SESSION_TYPE can differ from actual session type
        // Ubuntu creates xAuthority file with user gdm and that user name is unavailable,
        // but Tuxedo OS with sddm allows the user name gdm
        const xAuthorityFileInfo: string = child_process.execSync(`ls -l ${this.xAuthorityFile}`).toString();

        if (xAuthorityFileInfo.includes(' gdm gdm ') && userMatch && userMatch[1] === 'gdm') {
            return undefined;
        }

        this.display = displayMatch ? displayMatch[1].replace('DISPLAY=', '').trim() : '';

        const sessionType: string = xdgSessionMatch
            ? xdgSessionMatch[1].replace('XDG_SESSION_TYPE=', '').trim().toLowerCase()
            : '';

        this.isX11 = sessionType === 'x11' ? 1 : 0;
        this.isWayland = sessionType === 'wayland' ? true : false;
        this.isTTY = sessionType === 'tty' ? true : false;
    }

    public getIsX11(): number {
        return this.isX11;
    }

    public getIsWayland(): boolean {
        return this.isWayland;
    }

    public getIsTTY(): boolean {
        return this.isTTY;
    }

    public getDisplay(): string {
        return this.display;
    }

    public getDisplayName(): string {
        return this.displayName;
    }

    public getXAuthorityFile(): string {
        return this.xAuthorityFile;
    }

    public resetValues(): void {
        this.isX11 = -1;
        this.isWayland = undefined;
        this.isTTY = undefined;
        this.display = '';
        this.xAuthorityFile = '';
    }

    public checkVariablesAvailable(): boolean {
        return (
            this.isX11 !== undefined &&
            this.isX11 !== -1 &&
            this.isWayland !== undefined &&
            this.isTTY !== undefined &&
            this.display !== undefined &&
            this.display !== '' &&
            this.display !== ' ' &&
            this.xAuthorityFile !== undefined &&
            this.xAuthorityFile !== '' &&
            this.xAuthorityFile !== ' '
        );
    }

    public getDisplayModes(): IDisplayFreqRes {
        let result: string = '';
        try {
            result = child_process
                .execSync(`XAUTHORITY=${this.xAuthorityFile} xrandr -q -display ${this.display} --current`)
                .toString();
        } catch (err: unknown) {
            console.error(
                `XDisplayRefreshRateController: getDisplayModes: xrandr failed with xAuthorityFile "${this.xAuthorityFile}" and display "${this.display}" => ${err}`,
            );
            return undefined;
        }

        const displayNameRegex = /(eDP\S*|LVDS\S*)/;

        // for example "1920x1080" and "1920x1080i"
        const resolutionRegex: RegExp = /\s+[0-9]{3,4}x[0-9]{3,4}[a-z]?/;

        // for example "60.00*+", "50.00", "59.94" and 59.99"
        const freqRegex: RegExp = /[0-9]{1,3}\.[0-9]{2}[*]?[+]?/g;

        // matches currently active config, for example "2560x1440 165.00*+ 40.00 +"
        const fullLineRegex: RegExp = /\s+[0-9]{3,4}x[0-9]{3,4}[a-z]?(\s+[0-9]{1,3}\.[0-9]{2}[*]?[+]?)+/;

        const newDisplayModes: IDisplayFreqRes = {
            displayName: '',
            activeMode: {
                refreshRates: [],
                xResolution: 0,
                yResolution: 0,
            },
            displayModes: [],
        };

        const lines: string[] = result.split('\n');
        const lineIter: IterableIterator<string> = lines[Symbol.iterator]();
        let foundDisplayName: boolean = false;
        let currLine: string = lineIter.next().value;

        while (currLine && !foundDisplayName) {
            const displayNameMatch: RegExpMatchArray = currLine.match(displayNameRegex);
            if (displayNameMatch) {
                newDisplayModes.displayName = this.displayName = displayNameMatch[0].trim();

                foundDisplayName = true;
            }
            currLine = lineIter.next().value;
        }
        while (currLine && currLine.match(fullLineRegex)) {
            this.createDisplayMode(currLine, resolutionRegex, freqRegex, newDisplayModes);
            currLine = lineIter.next().value;
        }

        return newDisplayModes;
    }

    private createDisplayMode(
        line: string,
        resolutionRegex: RegExp,
        freqRegex: RegExp,
        newDisplayModes: IDisplayFreqRes,
    ): void {
        const resolution: string[] = line.match(resolutionRegex)[0].split('x');
        const refreshrates: RegExpMatchArray = line.match(freqRegex);
        const newMode: IDisplayMode = {
            refreshRates: [],
            xResolution: Number.parseInt(resolution[0]),
            yResolution: Number.parseInt(resolution[1]),
        };
        for (const rate of refreshrates) {
            const num: number = Number.parseFloat(rate.replace(/[^0-9.]/g, ''));
            if (!newMode?.refreshRates.includes(num)) {
                newMode?.refreshRates.push(num);
            }
        }
        newDisplayModes.displayModes.push(newMode);

        this.setActiveDisplayMode(refreshrates, newDisplayModes, newMode);
    }

    private setActiveDisplayMode(
        refreshrates: RegExpMatchArray,
        newDisplayModes: IDisplayFreqRes,
        newMode: IDisplayMode,
    ): void {
        const activeRateIndex: number = refreshrates.findIndex((rate: string): boolean => rate.includes('*'));
        if (activeRateIndex !== -1) {
            newDisplayModes.activeMode.refreshRates = [newMode?.refreshRates[activeRateIndex]];
            newDisplayModes.activeMode.xResolution = newMode.xResolution;
            newDisplayModes.activeMode.yResolution = newMode.yResolution;
        }
    }

    public setRefreshRateAndResolution(xRes: number, yRes: number, rate: number): boolean {
        if (this.checkVariablesAvailable() && this.isX11 === 1) {
            try {
                child_process.execSync(
                    `XAUTHORITY=${this.xAuthorityFile} xrandr -display ${this.display} --output ${this.displayName} --mode ${xRes}x${yRes} -r ${rate}`,
                );
                return true;
            } catch (err: unknown) {
                return false;
            }
        }
        return false;
    }
}
