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

import { ipcMain } from "electron";
import type { IpcMainEvent, IpcMainInvokeEvent } from "electron";
import { AvailabilityService } from "../../common/classes/availability.service";
import { execCmdSync, execFile, readTextFile } from "./utilsAPI";
import * as path from "node:path";
import { amdDGpuDeviceIdString } from "../../common/classes/AmdDeviceIDs";

const availabilityService: AvailabilityService = new AvailabilityService();

ipcMain.on('get-nvidia-dgpu-count-power', (event: IpcMainEvent): void => {
    event.returnValue = availabilityService.getNvidiaDGpuCount();
});
ipcMain.on('get-amd-dgpu-count-power', (event: IpcMainEvent): void => {
    event.returnValue = availabilityService.getAmdDGpuCount();
});

ipcMain.on('get-is-dgpu-available-power', (event: IpcMainEvent): void => {
    event.returnValue = availabilityService.isDGpuAvailable();
});
ipcMain.on('get-is-igpu-available-power', (event: IpcMainEvent): void => {
    event.returnValue = availabilityService.isIGpuAvailable();
});

ipcMain.handle('get-dgpu-power-state-power', async (event: IpcMainEvent, arg: string): Promise<string> => {
    return getDGpuPowerState(arg);
});

async function getDGpuPowerState(busPath: string): Promise<string> {
    if (busPath) {
        try {
            const powerStatePath: string = path.join(busPath, "power_state");
            const powerState: string = await readTextFile(
                powerStatePath
            );

            return powerState.trim();
        } catch (err: unknown) {
            console.error(`powerAPI: getDGpuPowerState failed => ${err}`);
        }
    }
    return "-1";
}



ipcMain.on('get-bus-path-power', (event: IpcMainEvent, arg: string): void => {
    event.returnValue = getBusPath(arg);
});

function getBusPath(driver: string): string {
    let devicePattern: string;

    if (driver === "nvidia") {
        devicePattern = "DRIVER=nvidia";
    } else if (driver === "amd") {
        devicePattern = `PCI_ID=${amdDGpuDeviceIdString}`;
    }

    if (devicePattern) {
        const grepCmd = `grep -lx '${devicePattern}' /sys/bus/pci/devices/*/uevent | sed 's|/uevent||'`;
        return execCmdSync(grepCmd).trim();
    }
    return undefined;
}

ipcMain.handle('prime-select', async (event: IpcMainInvokeEvent, selectedState: string): Promise<{data: string; error: unknown}> => {
    return new Promise<{data:string, error:unknown}>((resolve: (value: {data:string, error:unknown} | PromiseLike<{data:string, error:unknown}>) => void, reject: (reason?: unknown) => void): void => {
        try {
            resolve( execFile(
                `pkexec prime-select ${selectedState}`
            ));
        } catch (err: unknown) {
          console.error(`powerAPI: prime-select failed => ${err}`)
          reject(err);
        }
      });

});