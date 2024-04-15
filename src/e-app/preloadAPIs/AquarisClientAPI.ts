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