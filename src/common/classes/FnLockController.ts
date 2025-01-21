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

import { SysFsPropertyBoolean } from "./SysFsProperties";

export class FnLockController {
    fnLock: SysFsPropertyBoolean = new SysFsPropertyBoolean("/sys/devices/platform/tuxedo_keyboard/fn_lock");

    getFnLockSupported: () => boolean = (): boolean => this.fnLock.isAvailable();

    getFnLockStatus: () => boolean  = (): boolean => this.fnLock.readValueNT();

    setFnLockStatus: (status: boolean) => void = (status: boolean): void => this.fnLock.writeValue(status);
}