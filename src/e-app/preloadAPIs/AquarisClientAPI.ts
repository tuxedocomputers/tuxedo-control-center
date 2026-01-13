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

import { AquarisAPIFunctions, type AquarisState, aquarisAPIHandle } from '../../common/models/IAquarisAPI';
import type { DeviceInfo, PumpVoltage, RGBState } from '../LCT21001';

const { ipcRenderer } = require('electron');

// for preload script
export const AquarisClientAPI = {
    connect: (deviceUUID: string): Promise<void> =>
        ipcRenderer.invoke(aquarisAPIHandle, [AquarisAPIFunctions.connect, deviceUUID]),
    disconnect: (): Promise<void> => ipcRenderer.invoke(aquarisAPIHandle, [AquarisAPIFunctions.disconnect]),
    isConnected: (): Promise<boolean> =>
        ipcRenderer.invoke(aquarisAPIHandle, [AquarisAPIFunctions.isConnected]) as Promise<boolean>,
    hasBluetooth: (): Promise<boolean> =>
        ipcRenderer.invoke(aquarisAPIHandle, [AquarisAPIFunctions.hasBluetooth]) as Promise<boolean>,
    startDiscover: (): Promise<boolean> => ipcRenderer.invoke(aquarisAPIHandle, [AquarisAPIFunctions.startDiscover]),
    stopDiscover: (): Promise<void> => ipcRenderer.invoke(aquarisAPIHandle, [AquarisAPIFunctions.stopDiscover]),
    getDevices: (): Promise<DeviceInfo[]> =>
        ipcRenderer.invoke(aquarisAPIHandle, [AquarisAPIFunctions.getDevices]) as Promise<DeviceInfo[]>,
    getState: (): Promise<AquarisState> =>
        ipcRenderer.invoke(aquarisAPIHandle, [AquarisAPIFunctions.getState]) as Promise<AquarisState>,
    readFwVersion: (): Promise<string> =>
        ipcRenderer.invoke(aquarisAPIHandle, [AquarisAPIFunctions.readFwVersion]) as Promise<string>,
    updateLED: (red: number, green: number, blue: number, state: RGBState | number): Promise<void> =>
        ipcRenderer.invoke(aquarisAPIHandle, [AquarisAPIFunctions.updateLED, red, green, blue, state]),
    writeRGBOff: (): Promise<void> => ipcRenderer.invoke(aquarisAPIHandle, [AquarisAPIFunctions.writeRGBOff]),
    writeFanMode: (dutyCyclePercent: number): Promise<void> =>
        ipcRenderer.invoke(aquarisAPIHandle, [AquarisAPIFunctions.writeFanMode, dutyCyclePercent]),
    writeFanOff: (): Promise<void> => ipcRenderer.invoke(aquarisAPIHandle, [AquarisAPIFunctions.writeFanOff]),
    writePumpMode: (dutyCyclePercent: number, voltage: PumpVoltage | number): Promise<void> =>
        ipcRenderer.invoke(aquarisAPIHandle, [AquarisAPIFunctions.writePumpMode, dutyCyclePercent, voltage]),
    writePumpOff: (): Promise<void> => ipcRenderer.invoke(aquarisAPIHandle, [AquarisAPIFunctions.writePumpOff]),
    saveState: (): Promise<void> => ipcRenderer.invoke(aquarisAPIHandle, [AquarisAPIFunctions.saveState]),
};

// for render.d.ts typescript definition
export interface IAquarisClientAPI {
    connect: (deviceUUID: string) => Promise<void>;
    disconnect: () => Promise<void>;
    isConnected: () => Promise<boolean>;
    hasBluetooth: () => Promise<boolean>;
    startDiscover: () => Promise<void>;
    stopDiscover: () => Promise<void>;
    getDevices: () => Promise<DeviceInfo[]>;
    getState: () => Promise<AquarisState>;
    readFwVersion: () => Promise<string>;
    updateLED: (red: number, green: number, blue: number, state: RGBState | number) => Promise<void>;
    writeRGBOff: () => Promise<void>;
    writeFanMode: (dutyCyclePercent: number) => Promise<void>;
    writeFanOff: () => Promise<void>;
    writePumpMode: (dutyCyclePercent: number, voltage: PumpVoltage | number) => Promise<void>;
    writePumpOff: () => Promise<void>;
    saveState: () => Promise<void>;
}
