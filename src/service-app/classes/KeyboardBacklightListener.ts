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

import * as fs from 'node:fs';
import * as dbus from 'dbus-next';

import type { TuxedoControlCenterDaemon } from './TuxedoControlCenterDaemon';
import { KeyboardBacklightColorModes, type KeyboardBacklightCapabilitiesInterface, type KeyboardBacklightStateInterface } from '../../common/models/TccSettings';
import { fileOK, fileOKAsync, getDirectories, getSymbolicLinks } from '../../common/classes/Utils';

export class KeyboardBacklightListener {
    protected ledsWhiteOnly: string = "/sys/devices/platform/tuxedo_keyboard/leds/white:kbd_backlight";
    protected ledsWhiteOnlyNB05: string = "/sys/bus/platform/devices/tuxedo_nb05_kbd_backlight/leds/white:kbd_backlight";
    protected ledsRGBZones: Array<string> = ["/sys/devices/platform/tuxedo_keyboard/leds/rgb:kbd_backlight",
                                             "/sys/devices/platform/tuxedo_keyboard/leds/rgb:kbd_backlight_1",
                                             "/sys/devices/platform/tuxedo_keyboard/leds/rgb:kbd_backlight_2"];
    protected keyboardBacklightCapabilities: KeyboardBacklightCapabilitiesInterface = {} as KeyboardBacklightCapabilitiesInterface;
    protected sysDBusUPowerProps: dbus.ClientInterface = {} as dbus.ClientInterface;
    protected sysDBusUPowerKbdBacklightInterface: dbus.ClientInterface = {} as dbus.ClientInterface;
    protected onStartRetryCount: number = 5;

    constructor(private tccd: TuxedoControlCenterDaemon) {
        this.init();
    }

    private async init(): Promise<void> {
        this.updateKeyboardBacklightCapabilities();

        if (this.keyboardBacklightCapabilities.zones === undefined && this.onStartRetryCount) {
            console.log("KeyboardBacklightListener: Could not find keyboard backlight, retrying");
            --this.onStartRetryCount;
            setTimeout((): void => { this.init() }, 1000);
            return;
        }

        if (this.keyboardBacklightCapabilities?.zones !== undefined) {
            // Init state in settings if not yet done or anything is wonky
            if (this.keyboardBacklightCapabilities.zones != this.tccd.settings.keyboardBacklightStates?.length) {
                this.tccd.settings.keyboardBacklightStates = []
                for (let i: number = 0; i < this.keyboardBacklightCapabilities.zones ; ++i) {
                    this.tccd.settings.keyboardBacklightStates[i] = {
                        mode: this.keyboardBacklightCapabilities.modes[0],
                        brightness: this.keyboardBacklightCapabilities.maxBrightness,
                        red: this.keyboardBacklightCapabilities.maxRed,
                        green: this.keyboardBacklightCapabilities.maxGreen,
                        blue: this.keyboardBacklightCapabilities.maxBlue
                    }
                }
                this.tccd.config.writeSettingsAsync(this.tccd.settings);
            }

            await this.initUPower();
            await this.initSysFSListener();
            this.tccd.dbusData.keyboardBacklightStatesNewJSON.subscribe(
                this.keyboardBacklightStatesNewJSONSubscriptionHandler.bind(this));

            if (this.tccd.settings.keyboardBacklightControlEnabled) {
                this.setKeyboardBacklightStates(this.tccd.settings.keyboardBacklightStates, true, false, true);
            }
        }

        if (this.keyboardBacklightCapabilities.zones === undefined) {
            console.log("KeyboardBacklightListener: Failed to configure keyboard backlight");
        }
    }

    public onActiveProfileChanged(): void {}

    // Input from SysFS

    private async initUPower(): Promise<void> {
        const sysDBus: dbus.MessageBus = dbus.systemBus();

        // Props to poll LidIsClosed status when required
        const sysDBusUPowerObject: dbus.ProxyObject = await sysDBus.getProxyObject('org.freedesktop.UPower', '/org/freedesktop/UPower');
        this.sysDBusUPowerProps = sysDBusUPowerObject.getInterface('org.freedesktop.DBus.Properties');

        // BrightnessChanged handler
        const sysDBusUPowerKbdBacklightObject: dbus.ProxyObject = await sysDBus.getProxyObject('org.freedesktop.UPower', '/org/freedesktop/UPower/KbdBacklight');
        this.sysDBusUPowerKbdBacklightInterface = sysDBusUPowerKbdBacklightObject.getInterface('org.freedesktop.UPower.KbdBacklight');
        this.sysDBusUPowerKbdBacklightInterface.on('BrightnessChanged', (async function(brightness: number): Promise<void> {
            if (!(await this.sysDBusUPowerProps.Get('org.freedesktop.UPower', 'LidIsClosed')).value) {
                const keyboardBacklightStatesNew: Array<KeyboardBacklightStateInterface> = this.tccd.settings.keyboardBacklightStates;
                if (keyboardBacklightStatesNew) {
                    for (const i in keyboardBacklightStatesNew) {
                        if (keyboardBacklightStatesNew[i]) {
                            keyboardBacklightStatesNew[i].brightness = brightness;
                        }
                    }
                }
                this.setKeyboardBacklightStates(keyboardBacklightStatesNew, false, true, true);
            }
        }).bind(this));
    }

    private async initSysFSListener(): Promise<void> {
        if (this.keyboardBacklightCapabilities.maxRed != undefined) {
            for (let i: number = 0; i < this.ledsRGBZones?.length ; ++i) {
                if (this.ledsRGBZones[i]) {
                    if (await fileOKAsync(`${this.ledsRGBZones[i]}/multi_intensity`)) {
                        (function(i: number): void {
                            fs.watch(`${this.ledsRGBZones[i]}/multi_intensity`, (async function(): Promise<void> {
                                if (!(await this.sysDBusUPowerProps.Get('org.freedesktop.UPower', 'LidIsClosed')).value) {
                                    const keyboardBacklightStatesNew: Array<KeyboardBacklightStateInterface> = this.tccd.settings.keyboardBacklightStates;
                                    const colors: number[] = (await fs.promises.readFile(`${this.ledsRGBZones[i]}/multi_intensity`)).toString().split(' ').map(Number);
                                    if (keyboardBacklightStatesNew && keyboardBacklightStatesNew[i] && colors) {
                                        keyboardBacklightStatesNew[i].red = colors[0];
                                        keyboardBacklightStatesNew[i].green = colors[1];
                                        keyboardBacklightStatesNew[i].blue = colors[2];
                                        this.setKeyboardBacklightStates(keyboardBacklightStatesNew, false, true, true);
                                    }
                                }
                            }).bind(this));
                        }).bind(this)(i);
                    }
                }
            }
        }
    }



    // Input from TCC

    private keyboardBacklightStatesPendingNewJSON: string = undefined;
    private keyboardBacklightStatesWritingNew: boolean = false;
    private async keyboardBacklightStatesNewJSONSubscriptionHandler(keyboardBacklightStatesNewJSON: string): Promise<void> {
        if (keyboardBacklightStatesNewJSON !== undefined ) {
            this.keyboardBacklightStatesPendingNewJSON = keyboardBacklightStatesNewJSON;

            if (this.keyboardBacklightStatesWritingNew == false) {
                this.keyboardBacklightStatesWritingNew = true;
                while(this.keyboardBacklightStatesPendingNewJSON !== undefined) {
                    const keyboardBacklightStatesNew: Array<KeyboardBacklightStateInterface> = JSON.parse(this.keyboardBacklightStatesPendingNewJSON);
                    this.keyboardBacklightStatesPendingNewJSON = undefined;
                    await this.setKeyboardBacklightStates(keyboardBacklightStatesNew, true, true, false);
                }
                this.keyboardBacklightStatesWritingNew = false;
            }
        }
    }



    // Utility

    private updateKeyboardBacklightCapabilities(): void {
        this.keyboardBacklightCapabilities = {} as KeyboardBacklightCapabilitiesInterface;

        this.keyboardBacklightCapabilities.modes = [KeyboardBacklightColorModes.static];

        let ledsWhitePath;
        if (fileOK(`${this.ledsWhiteOnly}/max_brightness`)) {
            ledsWhitePath = this.ledsWhiteOnly;
        } else if (fileOK(`${this.ledsWhiteOnlyNB05}/max_brightness`)) {
            ledsWhitePath = this.ledsWhiteOnlyNB05;
        }

        if (ledsWhitePath) {
            console.log("KeyboardBacklightListener: Detected white only keyboard backlight");
            this.keyboardBacklightCapabilities.maxBrightness = Number(fs.readFileSync(`${ledsWhitePath}/max_brightness`));
            this.keyboardBacklightCapabilities.zones = 1;
        }
        else {
            this.updateLEDSRGBZonesForPerKeyKBL();

            if (this.ledsRGBZones?.length <= 3 && fileOK(`${this.ledsRGBZones[0]}/max_brightness`)) {
                console.log("KeyboardBacklightListener: Detected RGB zone keyboard backlight");
                this.keyboardBacklightCapabilities.maxBrightness = Number(fs.readFileSync(`${this.ledsRGBZones[0]}/max_brightness`));
                this.keyboardBacklightCapabilities.maxRed = 0xff;
                this.keyboardBacklightCapabilities.maxGreen = 0xff;
                this.keyboardBacklightCapabilities.maxBlue = 0xff;
                this.keyboardBacklightCapabilities.zones = 1;
                if (fileOK(`${this.ledsRGBZones[1]}/max_brightness`)) {
                    this.keyboardBacklightCapabilities.zones++;
                }
                if (fileOK(`${this.ledsRGBZones[2]}/max_brightness`)) {
                    console.log("KeyboardBacklightListener: Detected RGB 3 zone keyboard backlight");
                    this.keyboardBacklightCapabilities.zones++;
                }
            }
            else if (this.ledsRGBZones?.length > 3 && fileOK(`${this.ledsRGBZones[0]}/max_brightness`)) {
                console.log("KeyboardBacklightListener: Detected per-key RGB keyboard backlight");
                this.keyboardBacklightCapabilities.maxBrightness = Number(fs.readFileSync(`${this.ledsRGBZones[0]}/max_brightness`));
                this.keyboardBacklightCapabilities.maxRed = 0xff;
                this.keyboardBacklightCapabilities.maxGreen = 0xff;
                this.keyboardBacklightCapabilities.maxBlue = 0xff;
                this.keyboardBacklightCapabilities.zones = this.ledsRGBZones?.length;
            }
            else {
                console.log("KeyboardBacklightListener: Detected no keyboard backlight");
                this.tccd.dbusData.keyboardBacklightCapabilitiesJSON = "{}"
                return;
            }
        }

        this.tccd.dbusData.keyboardBacklightCapabilitiesJSON = JSON.stringify(this.keyboardBacklightCapabilities);
    }

    private updateLEDSRGBZonesForPerKeyKBL(): void {
        let ledsPerKey: string[] = [];

        const keyboardPaths: string[] = [
            "/sys/bus/hid/drivers/tuxedo-keyboard-ite/",
            "/sys/bus/hid/drivers/ite_829x/",
            "/sys/bus/hid/drivers/ite_8291/",
            "/sys/bus/platform/drivers/tuxedo_nb04_kbd_backlight/",
        ];

        for (const keyboardPath of keyboardPaths) {
            if (fs.existsSync(keyboardPath)) {
                const iteKeyboardDevices: string[] = getSymbolicLinks(
                    keyboardPath
                ).filter((name: string): boolean =>
                    fileOK(`${keyboardPath + name}/leds`)
                );

                for (const iteKeyboardDevice of iteKeyboardDevices) {
                    const path: string = `${
                        keyboardPath + iteKeyboardDevice
                    }/leds`;
                    if (fileOK(path)) {
                        ledsPerKey = ledsPerKey.concat(
                            getDirectories(path)
                                .filter((name: string): boolean =>
                                    name.includes("rgb:kbd_backlight")
                                )
                                .sort(
                                    (a: string, b: string): number =>
                                        +a
                                            .replace("rgb:kbd_backlight_", "")
                                            .replace("rgb:kbd_backlight", "0") -
                                        +b
                                            .replace("rgb:kbd_backlight_", "")
                                            .replace("rgb:kbd_backlight", "0")
                                )
                                .map(
                                    (name: string): string => `${path}/${name}`
                                )
                        );
                    }
                }
            }
        }

        if (ledsPerKey?.length > 0) {
            this.ledsRGBZones = ledsPerKey;
        }
    }

    private async setBufferInput(ledPath: string, bufferOn: boolean): Promise<void> {
        const bufferedInputPath: string = `${ledPath}/device/controls/buffer_input`;
        if (await fileOKAsync(bufferedInputPath)) {
            if (bufferOn) {
                await fs.promises.appendFile(bufferedInputPath, '1');
            } else {
                await fs.promises.appendFile(bufferedInputPath, '0');
            }
        }
    }

    protected async setKeyboardBacklightStates(keyboardBacklightStatesNew: Array<KeyboardBacklightStateInterface>,
                                             updateSysFS: boolean = true,
                                             updateSettings: boolean = true,
                                             updateTCC: boolean = true): Promise<void> {
        if (updateSysFS) {
            try {
                await this.sysDBusUPowerKbdBacklightInterface.SetBrightness(keyboardBacklightStatesNew[0].brightness);
            } catch (err: unknown) {
                console.error(`KeyboardBacklightListener: setKeyboardBacklightStates failed => ${err}`)
                // todo: error handling
                if (err instanceof dbus.DBusError) {
                    console.log("Failed to write brightness using UPower: Try restarting upower.service followed by tccd.service using systemctl.")
                }
            }

            if (this.ledsRGBZones?.length > 0) {
                this.setBufferInput(this.ledsRGBZones[0], true)
            }
            for (let i: number = 0; i < this.ledsRGBZones?.length ; ++i) {
                if (this.ledsRGBZones[i]) {
                    if (await fileOKAsync(`${this.ledsRGBZones[i]}/multi_intensity`)) {
                        if (keyboardBacklightStatesNew && keyboardBacklightStatesNew[i]) {
                            const red: string = keyboardBacklightStatesNew[i].red.toString();
                            const green: string = keyboardBacklightStatesNew[i].green.toString();
                            const blue: string = keyboardBacklightStatesNew[i].blue.toString();

                            await fs.promises.appendFile(`${this.ledsRGBZones[i]}/multi_intensity`,`${red} ${green} ${blue}`);
                        }
                    }
                }
            }
            if (this.ledsRGBZones?.length > 0) {
                this.setBufferInput(this.ledsRGBZones[0], false);
            }
        }

        if (updateSettings) {
            this.tccd.settings.keyboardBacklightStates = keyboardBacklightStatesNew;
            await this.tccd.config.writeSettingsAsync(this.tccd.settings);
        }

        if (updateTCC) {
            this.tccd.dbusData.keyboardBacklightStatesJSON = JSON.stringify(keyboardBacklightStatesNew);
        }
    }
}