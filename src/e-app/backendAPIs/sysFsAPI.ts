/*!
 * Copyright (c) 2019-2026 TUXEDO Computers GmbH <tux@tuxedocomputers.com>
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

import type { IpcMainEvent } from 'electron';
import { ipcMain } from 'electron';
import { DisplayBacklightController } from '../../common/classes/DisplayBacklightController';
import type { IDisplayBrightnessInfo } from '../../common/models/ICpuInfos';

let displayBacklightControllers: DisplayBacklightController[];
const displayBacklightControllerBasepath = '/sys/class/backlight';
const displayBacklightControllerNames: string[] = DisplayBacklightController.getDeviceList(
    displayBacklightControllerBasepath,
);
displayBacklightControllers = [];
for (const driverName of displayBacklightControllerNames) {
    displayBacklightControllers.push(new DisplayBacklightController(displayBacklightControllerBasepath, driverName));
}

ipcMain.on('get-display-brightness-info-sync', (event: IpcMainEvent): void => {
    const infoArray: IDisplayBrightnessInfo[] = [];
    for (const controller of displayBacklightControllers) {
        try {
            const info: IDisplayBrightnessInfo = {
                driver: controller.driver,
                brightness: controller.brightness.readValue(),
                maxBrightness: controller.maxBrightness.readValue(),
            };
            infoArray.push(info);
        } catch (err: unknown) {
            console.error(`sysFsAPI: get-display-brightness-info-sync failed => ${err}`);
        }
    }
    event.returnValue = infoArray;
});
