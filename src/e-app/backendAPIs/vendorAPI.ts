/*!
 * Copyright (c) 2019-2024 TUXEDO Computers GmbH <tux@tuxedocomputers.com>
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
import type { IpcMainEvent } from "electron";
import { VendorService } from "../../common/classes/Vendor.service";

let vendorService: VendorService = new VendorService();

ipcMain.handle('get-cpu-vendor', async (event: IpcMainEvent, status: any): Promise<string> => {
    return new Promise<string>(async (resolve: (value: string | PromiseLike<string>) => void, reject: (reason?: unknown) => void): Promise<void> => {
        resolve(vendorService.getCpuVendor());
    });
});
