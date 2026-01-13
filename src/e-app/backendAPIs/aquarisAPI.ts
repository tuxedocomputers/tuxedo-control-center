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

import type { IpcMainInvokeEvent } from 'electron';
import { ipcMain } from 'electron';
import type { AquarisState } from '../../common/models/IAquarisAPI';
import { AquarisAPIFunctions } from '../../common/models/IAquarisAPI';
import type { DeviceInfo } from '../LCT21001';
import { LCT21001, PumpVoltage, RGBState } from '../LCT21001';
import { hasAquaris, userConfig } from './initMain';

let aquarisStateExpected: AquarisState;
let aquarisStateCurrent: AquarisState;

let aquarisIoProgress: boolean = false;
let aquarisSearchProgress: boolean = false;

let aquarisHasBluetooth: boolean = true;

let searchingTimeout: NodeJS.Timeout;
const searchingDelayMs: number = 1000;
let discoverTries: number = 0;
const discoverMaxTries: number = 5;
let interestTries: number = 0;
const interestMaxTries = 8;
let isSearching: boolean = false;

async function updateDeviceState(
    dev: LCT21001,
    current: AquarisState,
    next: AquarisState,
    overrideCheck = false,
): Promise<void> {
    if (!aquarisIoProgress) {
        try {
            aquarisIoProgress = true;
            let updatedSomething: boolean;
            do {
                let updateLed: boolean = false;
                let updateFan: boolean = false;
                let updatePump: boolean = false;

                updateLed =
                    overrideCheck ||
                    current.red !== next.red ||
                    current.green !== next.green ||
                    current.blue !== next.blue ||
                    current.ledMode !== next.ledMode ||
                    current.ledOn !== next.ledOn;
                if (updateLed) {
                    current.red = next.red;
                    current.green = next.green;
                    current.blue = next.blue;
                    current.ledMode = next.ledMode;
                    current.ledOn = next.ledOn;
                    if (next.deviceUUID !== 'demo') {
                        if (next.ledOn) {
                            await dev.writeRGB(next.red, next.green, next.blue, next.ledMode);
                        } else {
                            await dev.writeRGBOff();
                        }
                    }
                }

                updateFan = overrideCheck || current.fanDutyCycle !== next.fanDutyCycle || current.fanOn !== next.fanOn;
                if (updateFan) {
                    current.fanDutyCycle = next.fanDutyCycle;
                    current.fanOn = next.fanOn;
                    if (next.deviceUUID !== 'demo') {
                        if (next.fanOn) {
                            await dev.writeFanMode(next.fanDutyCycle);
                        } else {
                            await dev.writeFanOff();
                        }
                    }
                }

                updatePump =
                    overrideCheck ||
                    current.pumpDutyCycle !== next.pumpDutyCycle ||
                    current.pumpVoltage !== next.pumpVoltage ||
                    current.pumpOn !== next.pumpOn;
                if (updatePump) {
                    current.pumpDutyCycle = next.pumpDutyCycle;
                    current.pumpVoltage = next.pumpVoltage;
                    current.pumpOn = next.pumpOn;
                    if (next.deviceUUID !== 'demo') {
                        if (next.pumpOn) {
                            await dev.writePumpMode(next.pumpDutyCycle, next.pumpVoltage);
                        } else {
                            await dev.writePumpOff();
                        }
                    }
                }
                overrideCheck = false;
                updatedSomething = updateLed || updateFan || updatePump;
            } while (updatedSomething);
            aquarisIoProgress = false;
        } catch (err: unknown) {
            console.error(`aquarisAPI: updateDeviceState failed => ${err}`);
        } finally {
            aquarisIoProgress = false;
        }
    }
}
async function doSearch(): Promise<void> {
    aquarisSearchProgress = true;
    try {
        isSearching = true;
        // Start discover if not started or restart if reached discover max tries
        if (!(await aquaris.isDiscovering()) || discoverTries >= discoverMaxTries) {
            discoverTries = 0;
            await aquaris.stopDiscover();
            aquarisHasBluetooth = await aquaris.startDiscover();
            if (!aquarisHasBluetooth) {
                aquarisSearchProgress = false;
                await stopSearch();
                return;
            }
            // Wait a moment after reconnect for initial discovery to have a chance
            await new Promise<void>((resolve: () => void): NodeJS.Timeout => setTimeout(resolve, 500));
        } else {
            discoverTries += 1;
        }

        // Look for devices
        devicesList = await aquaris.getDeviceList();

        // Trigger another search if not timed out
        if (interestTries < interestMaxTries) {
            interestTries += 1;
            searchingTimeout = setTimeout(doSearch, searchingDelayMs);
        } else {
            aquarisSearchProgress = false;
            await stopSearch();
        }
    } finally {
        aquarisSearchProgress = false;
    }
}

async function startSearch(): Promise<void> {
    if (!isSearching) {
        await doSearch();
    }
    interestTries = 0;
}

async function stopSearch(): Promise<void> {
    while (aquarisSearchProgress)
        await new Promise<void>((resolve: () => void): NodeJS.Timeout => setTimeout(resolve, 100));
    devicesList = [];
    isSearching = false;
    clearTimeout(searchingTimeout);
    searchingTimeout = undefined;
    interestTries = 0;
    discoverTries = discoverMaxTries;
}

export async function aquarisCleanUp(): Promise<void> {
    if (aquaris !== undefined) {
        await aquaris.disconnect();
        await stopSearch();
        await aquaris.stopDiscover();
    }
}

async function aquarisConnectedDemo(): Promise<boolean> {
    return aquarisStateCurrent !== undefined && aquarisStateCurrent.deviceUUID === 'demo';
}

let devicesList: DeviceInfo[] = [];
const aquaris = new LCT21001();

export const aquarisHandlers: Map<string, (...args: any[]) => any> = new Map<string, (...args: any[]) => any>()
    .set(AquarisAPIFunctions.connect, async (deviceUUID: string): Promise<void> => {
        try {
            await stopSearch();

            if (deviceUUID === 'demo') {
                await new Promise<void>((resolve: () => void): NodeJS.Timeout => setTimeout(resolve, 600));
            } else {
                await aquaris.connect(deviceUUID);
            }

            aquarisStateCurrent = {
                deviceUUID: deviceUUID,
                red: 255,
                green: 0,
                blue: 0,
                ledMode: RGBState.Static,
                fanDutyCycle: 50,
                pumpDutyCycle: 60,
                pumpVoltage: PumpVoltage.V8,
                ledOn: true,
                fanOn: true,
                pumpOn: true,
            };
            const aquarisSavedSerialized: string = await userConfig.get('aquarisSaveState');
            if (aquarisSavedSerialized !== undefined) {
                aquarisStateExpected = JSON.parse(aquarisSavedSerialized) as AquarisState;
            } else {
                aquarisStateExpected = Object.assign({}, aquarisStateCurrent);
            }
            aquarisStateExpected.deviceUUID = deviceUUID;
            await updateDeviceState(aquaris, aquarisStateCurrent, aquarisStateExpected, true);
        } catch (err: unknown) {
            console.error(`aquarisAPI: connect failed => ${err}`);
        }
    })

    .set(AquarisAPIFunctions.disconnect, async (): Promise<void> => {
        if (await aquarisConnectedDemo()) {
            await new Promise<void>((resolve: () => void): NodeJS.Timeout => setTimeout(resolve, 600));
        } else {
            await aquaris.disconnect();
        }
        aquarisStateExpected.deviceUUID = undefined;
        aquarisStateCurrent.deviceUUID = undefined;
    })

    .set(AquarisAPIFunctions.isConnected, async (): Promise<boolean> => {
        if (await aquarisConnectedDemo()) return true;

        if (aquarisIoProgress) {
            return true;
        } else {
            const isConnected: boolean = await aquaris.isConnected();
            if (!isConnected && aquarisStateExpected !== undefined) {
                aquarisStateExpected.deviceUUID = undefined;
            }
            return isConnected;
        }
    })

    .set(AquarisAPIFunctions.hasBluetooth, async (): Promise<boolean> => {
        return aquarisHasBluetooth || (await aquarisConnectedDemo());
    })

    .set(AquarisAPIFunctions.startDiscover, async (): Promise<void> => {})

    .set(AquarisAPIFunctions.stopDiscover, async (): Promise<void> => {})

    .set(AquarisAPIFunctions.getDevices, async (): Promise<DeviceInfo[]> => {
        await startSearch();
        return devicesList;
    })

    .set(AquarisAPIFunctions.getState, async (): Promise<AquarisState> => {
        return aquarisStateExpected;
    })

    .set(AquarisAPIFunctions.readFwVersion, async (): Promise<string> => {
        return (await aquaris.readFwVersion()).toString();
    })

    .set(
        AquarisAPIFunctions.updateLED,
        async (red: number, green: number, blue: number, state: RGBState | number): Promise<void> => {
            aquarisStateExpected.red = red;
            aquarisStateExpected.green = green;
            aquarisStateExpected.blue = blue;
            aquarisStateExpected.ledMode = state;
            aquarisStateExpected.ledOn = true;
            await updateDeviceState(aquaris, aquarisStateCurrent, aquarisStateExpected);
        },
    )

    .set(AquarisAPIFunctions.writeRGBOff, async (): Promise<void> => {
        aquarisStateExpected.ledOn = false;
        await updateDeviceState(aquaris, aquarisStateCurrent, aquarisStateExpected);
    })

    .set(AquarisAPIFunctions.writeFanMode, async (dutyCyclePercent: number): Promise<void> => {
        aquarisStateExpected.fanDutyCycle = dutyCyclePercent;
        aquarisStateExpected.fanOn = true;
        await updateDeviceState(aquaris, aquarisStateCurrent, aquarisStateExpected);
    })

    .set(AquarisAPIFunctions.writeFanOff, async (): Promise<void> => {
        aquarisStateExpected.fanOn = false;
        await updateDeviceState(aquaris, aquarisStateCurrent, aquarisStateExpected);
    })

    .set(
        AquarisAPIFunctions.writePumpMode,
        async (dutyCyclePercent: number, voltage: PumpVoltage | number): Promise<void> => {
            aquarisStateExpected.pumpDutyCycle = dutyCyclePercent;
            aquarisStateExpected.pumpVoltage = voltage;
            aquarisStateExpected.pumpOn = true;
            await updateDeviceState(aquaris, aquarisStateCurrent, aquarisStateExpected);
        },
    )

    .set(AquarisAPIFunctions.writePumpOff, async (): Promise<void> => {
        aquarisStateExpected.pumpOn = false;
        await updateDeviceState(aquaris, aquarisStateCurrent, aquarisStateExpected);
    })

    .set(AquarisAPIFunctions.saveState, async (): Promise<void> => {
        if (await aquarisConnectedDemo()) return;
        await userConfig.set('aquarisSaveState', JSON.stringify(aquarisStateCurrent));
    });

ipcMain.handle('comp-get-has-aquaris', (event: IpcMainInvokeEvent): Promise<boolean> => {
    return new Promise<boolean>(
        (resolve: (value: boolean | PromiseLike<boolean>) => void, reject: (reason?: unknown) => void): void => {
            try {
                resolve(hasAquaris());
            } catch (err: unknown) {
                console.error(`aquarisAPI: comp-get-has-aquaris failed => ${err}`);
                reject(err);
            }
        },
    );
});
