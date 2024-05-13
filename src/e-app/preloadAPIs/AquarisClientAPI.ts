/*!
 * Copyright (c) 2019-2022 TUXEDO Computers GmbH <tux@tuxedocomputers.com>
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

import { DeviceInfo, PumpVoltage, RGBState } from "../LCT21001";
import { aquarisAPIHandle, AquarisAPIFunctions, AquarisState } from "../../common/models/IAquarisAPI"
const { ipcRenderer } = require('electron');

// for preload script
export const AquarisClientAPI =
    {
        connect: (deviceUUID: string) => ipcRenderer.invoke(aquarisAPIHandle, [AquarisAPIFunctions.connect, deviceUUID]),
        disconnect: () => ipcRenderer.invoke(aquarisAPIHandle, [AquarisAPIFunctions.disconnect]),
        isConnected: () => ipcRenderer.invoke(aquarisAPIHandle, [AquarisAPIFunctions.isConnected]) as Promise<boolean>,
        hasBluetooth: () => ipcRenderer.invoke(aquarisAPIHandle, [AquarisAPIFunctions.hasBluetooth]) as Promise<boolean>,
        startDiscover: () => ipcRenderer.invoke(aquarisAPIHandle, [AquarisAPIFunctions.startDiscover]),
        stopDiscover: () => ipcRenderer.invoke(aquarisAPIHandle, [AquarisAPIFunctions.stopDiscover]),
        getDevices: () => ipcRenderer.invoke(aquarisAPIHandle, [AquarisAPIFunctions.getDevices]) as Promise<DeviceInfo[]>,
        getState: () => ipcRenderer.invoke(aquarisAPIHandle, [AquarisAPIFunctions.getState]) as Promise<AquarisState>,
        readFwVersion: () => ipcRenderer.invoke(aquarisAPIHandle, [AquarisAPIFunctions.readFwVersion]) as Promise<string>,
        updateLED: (red: number, green: number, blue: number, state: RGBState | number) => ipcRenderer.invoke(aquarisAPIHandle, [AquarisAPIFunctions.updateLED, red, green, blue, state]),
        writeRGBOff: () => ipcRenderer.invoke(aquarisAPIHandle, [AquarisAPIFunctions.writeRGBOff]),
        writeFanMode: (dutyCyclePercent: number) => ipcRenderer.invoke(aquarisAPIHandle, [AquarisAPIFunctions.writeFanMode, dutyCyclePercent]),
        writeFanOff: () => ipcRenderer.invoke(aquarisAPIHandle, [AquarisAPIFunctions.writeFanOff]),
        writePumpMode: (dutyCyclePercent: number, voltage: PumpVoltage | number) => ipcRenderer.invoke(aquarisAPIHandle, [AquarisAPIFunctions.writePumpMode, dutyCyclePercent, voltage]),
        writePumpOff: () => ipcRenderer.invoke(aquarisAPIHandle, [AquarisAPIFunctions.writePumpOff]),
        saveState: () => ipcRenderer.invoke(aquarisAPIHandle, [AquarisAPIFunctions.saveState]),
    }

// for render.d.ts typescript definition
export interface IAquarisClientAPI
{
    connect: (deviceUUID: string) => void,
    disconnect: () => void,
    isConnected: () => Promise<boolean>,
    hasBluetooth: () => Promise<boolean>,
    startDiscover: () => void,
    stopDiscover: () => void,
    getDevices: () => Promise<DeviceInfo[]>,
    getState: () => Promise<AquarisState>,
    readFwVersion: () => Promise<string>,
    updateLED: (red: number, green: number, blue: number, state: RGBState | number) => void,
    writeRGBOff: () => void,
    writeFanMode: (dutyCyclePercent: number) => void,
    writeFanOff: () => void,
    writePumpMode: (dutyCyclePercent: number, voltage: PumpVoltage | number) => void,
    writePumpOff: () => void
    saveState: () => void,
 
}