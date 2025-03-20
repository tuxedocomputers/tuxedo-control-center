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

import { createBluetooth } from 'node-ble';
import * as NodeBle from 'node-ble';

function sleep(ms: number, arg: string = 'timeout'): Promise<string> {
    return new Promise<string>((resolve: (value: string) => void): NodeJS.Timeout => setTimeout(resolve, ms, arg));
}

const noop: () => void = (): void => {};

export enum RGBState {
    Static = 0x00,
    Breathe = 0x01,
    Colorful = 0x02,
    BreatheColor = 0x03
}

export enum PumpVoltage {
    V11 = 0x00,
    V12 = 0x01,
    V7 = 0x02,
    V8 = 0x03
}

enum LCTDeviceModel {
    LCT21001 = 'LCT21001',
    LCT22002 = 'LCT22002',
}

export class DeviceInfo {
    uuid: string;
    name: string;
    rssi: number;
}

/**
 * Encapsulates communication with the Bluetooth LE device.
 */
export class LCT21001 {

    private static readonly NORDIC_UART_SERVICE_UUID: string = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
    private static readonly NORDIC_UART_CHAR_TX: string = '6e400002-b5a3-f393-e0a9-e50e24dcca9e';
    private static readonly NORDIC_UART_CHAR_RX: string = '6e400003-b5a3-f393-e0a9-e50e24dcca9e';

    private static readonly CMD_RESET: number = 0x19;
    private static readonly CMD_FAN: number = 0x1b;
    private static readonly CMD_PUMP: number = 0x1c;
    private static readonly CMD_RGB: number = 0x1e;

    public static RGBState: typeof RGBState = RGBState;
    public static PumpVoltage: typeof PumpVoltage = PumpVoltage;

    private adapter: NodeBle.Adapter | undefined;
    private device: NodeBle.Device | undefined;
    private uartRx: NodeBle.GattCharacteristic | undefined;
    private uartTx: NodeBle.GattCharacteristic | undefined;
    private destroy: (() => any) | undefined;

    private connectedModel: LCTDeviceModel | undefined;

    public getConnectedModel(): LCTDeviceModel | undefined {
        return this.connectedModel;
    }

    private async deviceModelFromName(name: string): Promise<LCTDeviceModel | undefined> {
        for (const model of Object.values(LCTDeviceModel)) {
            if (name.toLowerCase().includes(model.toLowerCase())) {
                return LCTDeviceModel[model];
            }
        }
        return undefined;
    }

    /**
     * Initialize bluetooth communication and attempt to connect to device
     */
    async connect(deviceUUID: string): Promise<void> {
        this.device = await this.adapter.getDevice(deviceUUID);

        let rssi, deviceName: string;
        try { rssi = await this.device.getRSSI(); } catch (err: unknown) {console.error("LCT21001: connect getRSSI failed =>", err)}
        if (rssi === undefined) {
            throw Error('connect(): device appears offline/unavailable');
        }

        try {
            deviceName = await this.device.getName();
        } catch (err: unknown) {
            throw Error('connect(): failed reading name');
        }

        const connectionTimeout: Promise<string> = sleep(5000, 'timeout');
        const connect: Promise<void> = this.device.connect();

        const result: void | string = await Promise.race([connect, connectionTimeout]);
        if (result === 'timeout') {
            await this.device.disconnect();
            return;
        }

        const gattServer = await this.device.gatt();

        const uartService: NodeBle.GattService = await gattServer.getPrimaryService(LCT21001.NORDIC_UART_SERVICE_UUID);
        this.uartTx = await uartService.getCharacteristic(LCT21001.NORDIC_UART_CHAR_TX);
        this.uartRx = await uartService.getCharacteristic(LCT21001.NORDIC_UART_CHAR_RX);

        this.connectedModel = await this.deviceModelFromName(deviceName);
    }

    /**
     * Disconnect from device and clean-up bluetooth initializations
     */
    async disconnect(): Promise<void> {
        if (this.device !== undefined && await this.device.isConnected()) {
            // Data written on disconnect by original control, seems to reset
            // or turn off configured parameters
            try { await this.writeReset(); } catch(err: unknown) {
                console.error("LCT21001: disconnect writeReset failed =>", err)
            }
            try { await this.device.disconnect(); } catch (err: unknown) {
                console.error("LCT21001: disconnect failed =>", err)
            }
            this.device = undefined;
            this.connectedModel = undefined;
        }
    }

    async startDiscover(): Promise<boolean> {
        try {
            const { bluetooth, destroy } = createBluetooth();
            this.destroy = destroy;

            this.adapter = await bluetooth.defaultAdapter();

            if (! await this.adapter.isDiscovering()) {
                await this.adapter.startDiscovery();
            }

            return true;
        } catch (err: unknown) {
            console.error("LCT21001: startDiscover failed =>", err)
            return false;
        }
    }

    async stopDiscover(): Promise<void> {
        // Clean-up other initialized stuff
        if (this.adapter !== undefined && await this.adapter.isDiscovering()) {
            await this.adapter.stopDiscovery().catch((err: unknown): void => console.error("LCT21001: stopDiscover failed =>", err));
        }

        if (this.destroy !== undefined) {
            this.destroy();
        }
    }

    async isDiscovering(): Promise<boolean> {
        try {
            return await this.adapter?.isDiscovering();
        } catch (err: unknown) {
            console.error("LCT21001: isDiscovering failed =>", err)
            return false;
        }
    }

    async getDeviceList(): Promise<DeviceInfo[]> {
        const deviceIds: string[] = await this.adapter.devices();
        const deviceInfo: DeviceInfo[] = [];
        let blDevice: NodeBle.Device;
        for (const deviceId of deviceIds) {
            // Sort out devices that are not accessible with the expected parameters
            try {
                blDevice = await this.adapter.getDevice(deviceId);
            } catch (dummy: unknown) {
                await blDevice.cleanup();
                continue;
            }
            const info = new DeviceInfo();
            info.uuid = deviceId;

            try {
                info.rssi = parseInt(await blDevice.getRSSI());
            } catch (dummy: unknown) {
                await blDevice.cleanup();
                continue;
            }

            try {
                info.name = await blDevice.getName();
            } catch (dummy: unknown) {
                info.name = '';
            }

            await blDevice.cleanup();

            const model: LCTDeviceModel = await this.deviceModelFromName(info.name);
            if (model !== undefined) {
                deviceInfo.push(info);
            }
        };

        return deviceInfo;
    }

    async isConnected(): Promise<boolean> {
        let result: boolean;

        try {
            // todo: testing
            result = !!await this.device?.isConnected();
        } catch (err: unknown) {
            console.error("LCT21001: isConnected failed =>", err)
            result = false;
        }

        if (result === undefined) {
            return false;
        } else {
            return result;
        }
    }

    /**
     * Write to the uart tx characteristic
     *
     * @param buffer `Buffer` of data to write
     *
     * Note: Throws error if not connected
     */
    async writeBuffer(buffer: Buffer): Promise<void> {
        if (this.uartTx !== undefined && await this.isConnected()) {
            await this.uartTx.writeValue(buffer, { type: 'request' });
        } else {
            throw Error('writeBuffer(): not connected');
        }
    }

    /**
     * Read from the uart rx characteristic
     *
     * @returns A `Buffer` with the data read
     *
     * Note: Throws error if not connected
     */
    async readBuffer(): Promise<Buffer> {
        if (this.uartRx !== undefined && await this.isConnected()) {
            return await this.uartRx.readValue();
        } else {
            throw Error('readBuffer(): not connected');
        }
    }

    /**
     * Write to the uart tx characteristic and wait for a
     * notification on the uart rx characteristic
     *
     * @param inputBuffer `Buffer` to write to device
     * @returns A `Buffer` with the response
     *
     * Note: Throws error if not connected
     */
    async writeReceive(inputBuffer: Buffer): Promise<Buffer> {
        return new Promise<Buffer>(async (resolve: (value: Buffer | PromiseLike<Buffer>) => void, reject: (reason?: unknown) => void): Promise<void> => {
            if (this.uartRx !== undefined && await this.isConnected()) {
                if (await this.uartRx.isNotifying()) {
                    reject('rx already awaiting notify');
                }
                await this.uartRx.startNotifications();
                this.uartRx.once('valuechanged', async (outputBuffer: any) => {
                    await this.uartRx?.stopNotifications();
                    resolve(outputBuffer);
                });
                this.writeBuffer(inputBuffer).catch(async (): Promise<void> => {
                    await this.uartRx?.stopNotifications();
                    this.uartRx?.removeAllListeners();
                    reject()
                });
            } else {
                throw Error('writeReceive(): not connected');
            }
        });
    }

    /**
     * Write RGB color and state to device
     *
     * @param red Red color 0-255
     * @param green Green color 0-255
     * @param blue Blue color 0-255
     * @param state Behaviour of light display
     */
    async writeRGB(red: number, green: number, blue: number, state: RGBState | number): Promise<void> {
        if (red < 0 || red > 0xff) throw Error('writeRGB(): param out of range');
        if (green < 0 || green > 0xff) throw Error('writeRGB(): param out of range');
        if (blue < 0 || blue > 0xff) throw Error('writeRGB(): param out of range');
        if (state < 0 || state > 0x03) throw Error('writeRGB(): param out of range');

        const data: Buffer = Buffer.from([0xfe, LCT21001.CMD_RGB, 0x01, red, green, blue, state, 0xef]);
        await this.writeBuffer(data);
    }

    async writeRGBOff(): Promise<void> {
        const data: Buffer = Buffer.from([0xfe, LCT21001.CMD_RGB, 0x00, 0x00, 0x00, 0x00, 0x00, 0xef]);
        await this.writeBuffer(data);
    }

    /**
     * Write fan speed to device
     *
     * @param dutyCyclePercent Fan speed in percent 0-100
     */
    async writeFanMode(dutyCyclePercent: number): Promise<void> {
        if (dutyCyclePercent < 0 || dutyCyclePercent > 0xff) throw Error('writeFanMode(): param out of range');
        const data: Buffer = Buffer.from([0xfe, LCT21001.CMD_FAN, 0x01, dutyCyclePercent, 0x00, 0x00, 0x00, 0xef]);
        await this.writeBuffer(data);
    }

    async writeFanOff(): Promise<void> {
        const data: Buffer = Buffer.from([0xfe, LCT21001.CMD_FAN, 0x00, 0x00, 0x00, 0x00, 0x00, 0xef]);
        await this.writeBuffer(data);
    }

    /**
     * Write pump parameters to device
     *
     * @param pumpDutyCyclePercent Duty cycle in percent 0-100
     * @param pumpVoltage See `PumpVoltage` for valid settings
     */
    async writePumpMode(pumpDutyCyclePercent?: number, pumpVoltage?: PumpVoltage | number): Promise<void> {
        if (pumpDutyCyclePercent === undefined) {
            pumpDutyCyclePercent = 60;
        }
        if (pumpDutyCyclePercent < 0 || pumpDutyCyclePercent > 100) throw Error('writePumpMode(): param out of range');
        if (pumpVoltage === undefined) {
            pumpVoltage = PumpVoltage.V8;
        }
        if (pumpVoltage < 0 || pumpVoltage > 0x03) throw Error('writePumpMode(): param out of range');

        const data: Buffer = Buffer.from([0xfe, LCT21001.CMD_PUMP, 0x01, pumpDutyCyclePercent, pumpVoltage, 0x00, 0x00, 0xef]);
        await this.writeBuffer(data);
    }

    async writePumpOff(): Promise<void> {
        const data: Buffer = Buffer.from([0xfe, LCT21001.CMD_PUMP, 0x00, 0x00, 0x00, 0x00, 0x00, 0xef]);
        await this.writeBuffer(data);
    }

    /**
     * Read firmware version from device
     *
     * @returns A `Buffer` representing a string describing the firmware version
     */
    async readFwVersion(): Promise<Buffer> {
        return await this.writeReceive(Buffer.from([0x73, 0x77]));
    }

    /**
     * Write (presumably) reset to device
     */
    async writeReset(): Promise<void> {
        await this.writeBuffer(Buffer.from([0xfe, LCT21001.CMD_RESET, 0x00, 0x01, 0x00, 0x00, 0x00, 0xef]));
    }
}
