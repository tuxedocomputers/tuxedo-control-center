/* 
########################################################
############## Aquaris Backend #########################
########################################################
*/

import { AquarisState, AquarisAPIFunctions } from '../../common/models/IAquarisAPI';
import { DeviceInfo, LCT21001, PumpVoltage, RGBState } from '../LCT21001';


async function updateDeviceState(dev: LCT21001, current: AquarisState, next: AquarisState, overrideCheck = false) {
    if (!aquarisIoProgress) {
        try {
            aquarisIoProgress = true;
            let updatedSomething;
            do {
                let updateLed = false;
                let updateFan = false;
                let updatePump = false;

                updateLed = overrideCheck ||
                            current.red !== next.red || current.green !== next.green || current.blue !== next.blue ||
                            current.ledMode !== next.ledMode || current.ledOn !== next.ledOn;
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

                updateFan = overrideCheck ||
                            current.fanDutyCycle !== next.fanDutyCycle || current.fanOn !== next.fanOn;
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

                updatePump = overrideCheck ||
                            current.pumpDutyCycle !== next.pumpDutyCycle || current.pumpVoltage !== next.pumpVoltage || current.pumpOn !== next.pumpOn;
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
        } catch (err) {
            console.log('updateDeviceState error => ' + err);
        } finally {
            aquarisIoProgress = false;
        }
    }
}

let aquarisStateExpected: AquarisState;
let aquarisStateCurrent: AquarisState;

let aquarisIoProgress = false;
let aquarisSearchProgress = false;
let aquarisConnectProgress = false;

let aquarisHasBluetooth = true;

let searchingTimeout: NodeJS.Timeout;
let searchingDelayMs = 1000;
let discoverTries = 0;
const discoverMaxTries = 5;
let interestTries = 0;
const interestMaxTries = 8;
let isSearching = false;

async function doSearch() {
    aquarisSearchProgress = true;
    try {
        isSearching = true;
        // Start discover if not started or restart if reached discover max tries
        if (!await aquaris.isDiscovering()  || discoverTries >= discoverMaxTries) {
            discoverTries = 0;
            await aquaris.stopDiscover();
            aquarisHasBluetooth = await aquaris.startDiscover();
            if (!aquarisHasBluetooth) {
                aquarisSearchProgress = false;
                await stopSearch();
                return;
            }
            // Wait a moment after reconnect for initial discovery to have a chance
            await new Promise(resolve => setTimeout(resolve, 500));
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

async function startSearch() {
    if (!isSearching) {
        await doSearch();
    }
    interestTries = 0;
}

async function stopSearch() {
    while (aquarisSearchProgress) await new Promise(resolve => setTimeout(resolve, 100));
    devicesList = [];
    isSearching = false;
    clearTimeout(searchingTimeout);
    searchingTimeout = undefined;
    interestTries = 0;
    discoverTries = discoverMaxTries;
}

export async function aquarisCleanUp() {
    if (aquaris !== undefined) {
        await aquaris.disconnect();
        await stopSearch();
        await aquaris.stopDiscover();
    }
}

async function aquarisConnectedDemo() {
    return aquarisStateCurrent !== undefined && aquarisStateCurrent.deviceUUID === 'demo';
}

let devicesList: DeviceInfo[] = [];
const aquaris = new LCT21001();
export const aquarisHandlers = new Map<string, (...args: any[]) => any>()
    .set(AquarisAPIFunctions.connect, async (deviceUUID) => {
        aquarisConnectProgress = true;
        try {
            await stopSearch();

            if (deviceUUID === 'demo') {
                await new Promise(resolve => setTimeout(resolve, 600));
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
                pumpOn: true
            };
            const aquarisSavedSerialized = undefined; //await userConfig.get('aquarisSaveState');
            if (aquarisSavedSerialized !== undefined) {
                aquarisStateExpected = JSON.parse(aquarisSavedSerialized) as AquarisState;
            } else {
                aquarisStateExpected = Object.assign({}, aquarisStateCurrent);
            }
            aquarisStateExpected.deviceUUID = deviceUUID;
            await updateDeviceState(aquaris, aquarisStateCurrent, aquarisStateExpected, true);
        } catch (err) {
            console.log('err => ' + err);
        } finally {
            aquarisConnectProgress = false;
        }
    })

    .set(AquarisAPIFunctions.disconnect, async () => {
        if (await aquarisConnectedDemo()) {
            await new Promise(resolve => setTimeout(resolve, 600));
        } else {
            await aquaris.disconnect();
        }
        aquarisStateExpected.deviceUUID = undefined;
        aquarisStateCurrent.deviceUUID = undefined;
    })

    .set(AquarisAPIFunctions.isConnected, async () => {
        if (await aquarisConnectedDemo()) return true;

        if (aquarisIoProgress) {
            return true;
        } else {
            const isConnected = await aquaris.isConnected();
            if (!isConnected && aquarisStateExpected !== undefined) {
                aquarisStateExpected.deviceUUID = undefined;
            }
            return isConnected;
        }
    })

    .set(AquarisAPIFunctions.hasBluetooth, async () => {
        return aquarisHasBluetooth || await aquarisConnectedDemo();
    })

    .set(AquarisAPIFunctions.startDiscover, async () => {

    })

    .set(AquarisAPIFunctions.stopDiscover, async () => {

    })

    .set(AquarisAPIFunctions.getDevices, async () => {
        await startSearch();
        return devicesList;
    })

    .set(AquarisAPIFunctions.getState, async () => {
        return aquarisStateExpected;
    })

    .set(AquarisAPIFunctions.readFwVersion, async () => {
        return (await aquaris.readFwVersion()).toString();
    })

    .set(AquarisAPIFunctions.updateLED, async (red, green, blue, state) => {
        aquarisStateExpected.red = red;
        aquarisStateExpected.green = green;
        aquarisStateExpected.blue = blue;
        aquarisStateExpected.ledMode = state;
        aquarisStateExpected.ledOn = true;
        await updateDeviceState(aquaris, aquarisStateCurrent, aquarisStateExpected);
    })

    .set(AquarisAPIFunctions.writeRGBOff, async () => {
        aquarisStateExpected.ledOn = false;
        await updateDeviceState(aquaris, aquarisStateCurrent, aquarisStateExpected);
    })

    .set(AquarisAPIFunctions.writeFanMode, async (dutyCyclePercent) => {
        aquarisStateExpected.fanDutyCycle = dutyCyclePercent;
        aquarisStateExpected.fanOn = true;
        await updateDeviceState(aquaris, aquarisStateCurrent, aquarisStateExpected);
    })

    .set(AquarisAPIFunctions.writeFanOff, async () => {
        aquarisStateExpected.fanOn = false;
        await updateDeviceState(aquaris, aquarisStateCurrent, aquarisStateExpected);
    })

    .set(AquarisAPIFunctions.writePumpMode, async (dutyCyclePercent, voltage) => {
        aquarisStateExpected.pumpDutyCycle = dutyCyclePercent;
        aquarisStateExpected.pumpVoltage = voltage;
        aquarisStateExpected.pumpOn = true;
        await updateDeviceState(aquaris, aquarisStateCurrent, aquarisStateExpected);
    })

    .set(AquarisAPIFunctions.writePumpOff, async () => {
        aquarisStateExpected.pumpOn = false;
        await updateDeviceState(aquaris, aquarisStateCurrent, aquarisStateExpected);
    })
    
    .set(AquarisAPIFunctions.saveState, async () => {
        if (await aquarisConnectedDemo()) return;
        //await userConfig.set('aquarisSaveState', JSON.stringify(aquarisStateCurrent));
    });

