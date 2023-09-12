/*!
 * Copyright (c) 2019-2023 TUXEDO Computers GmbH <tux@tuxedocomputers.com>
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

import * as fs from 'fs';
import * as dbus from 'dbus-next';

import { TuxedoControlCenterDaemon } from './TuxedoControlCenterDaemon';
import { KeyboardBacklightColorModes, KeyboardBacklightCapabilitiesInterface, KeyboardBacklightStateInterface } from '../../common/models/TccSettings';
import { fileOK, fileOKAsync, getDirectories, getSymbolicLinks } from '../../common/classes/Utils';

export class KeyboardBacklightListener {
    protected ledsWhiteOnly: string = "/sys/devices/platform/tuxedo_keyboard/leds/white:kbd_backlight";
    protected ledsRGBZones: Array<string> = ["/sys/devices/platform/tuxedo_keyboard/leds/rgb:kbd_backlight",
                                             "/sys/devices/platform/tuxedo_keyboard/leds/rgb:kbd_backlight_1",
                                             "/sys/devices/platform/tuxedo_keyboard/leds/rgb:kbd_backlight_2"];
    protected keyboardBacklightCapabilities: KeyboardBacklightCapabilitiesInterface = {} as KeyboardBacklightCapabilitiesInterface;
    protected sysDBusUPowerProps: dbus.ClientInterface = {} as dbus.ClientInterface;
    protected sysDBusUPowerKbdBacklightInterface: dbus.ClientInterface = {} as dbus.ClientInterface;
    protected onStartRetryCount: number = 5;
    protected skipNextBrightnessChanged: boolean = false;
    protected skipNextColorChanged: Array<boolean> = [false, false, false];

    constructor(private tccd: TuxedoControlCenterDaemon) {
        this.init();
    }

    private async init() {
        this.updateKeyboardBacklightCapabilities();
        if (this.keyboardBacklightCapabilities.zones === undefined && this.onStartRetryCount) {
            console.log("Could not find keyboard backlight. Retrying...");
            --this.onStartRetryCount;
            setTimeout(() => { this.init() }, 1000);
            return;
        }

        // Init state in settings if not yet done or anything is wonky
        if (this.keyboardBacklightCapabilities.zones != this.tccd.settings.keyboardBacklightStates.length) {
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



    // Input from SysFS

    private async initUPower() {
        let sysDBus: dbus.MessageBus = dbus.systemBus();

        // Props to poll LidIsClosed status when required
        let sysDBusUPowerObject: dbus.ProxyObject = await sysDBus.getProxyObject('org.freedesktop.UPower', '/org/freedesktop/UPower');
        this.sysDBusUPowerProps = sysDBusUPowerObject.getInterface('org.freedesktop.DBus.Properties');

        // BrightnessChanged handler
        let sysDBusUPowerKbdBacklightObject: dbus.ProxyObject = await sysDBus.getProxyObject('org.freedesktop.UPower', '/org/freedesktop/UPower/KbdBacklight');
        this.sysDBusUPowerKbdBacklightInterface = sysDBusUPowerKbdBacklightObject.getInterface('org.freedesktop.UPower.KbdBacklight');
        this.sysDBusUPowerKbdBacklightInterface.on('BrightnessChanged', (async function(brightness: number): Promise<void> {
            if (this.skipNextBrightnessChanged) {
                this.skipNextBrightnessChanged = false;
                return;
            }
            let keyboardBacklightStatesNew: KeyboardBacklightStateInterface = this.tccd.settings.keyboardBacklightStates;
            for (let i in keyboardBacklightStatesNew) {
                keyboardBacklightStatesNew[i].brightness = brightness;
            }
            this.setKeyboardBacklightStates(keyboardBacklightStatesNew, false, true, true);
        }).bind(this));
    }

    private async initSysFSListener() {
        if (this.keyboardBacklightCapabilities.maxRed != undefined) {
            for (let i: number = 0; i < this.ledsRGBZones.length ; ++i) {
                if (await fileOKAsync(this.ledsRGBZones[i] + "/multi_intensity")) {
                    (function(i: number): void {
                        fs.watch(this.ledsRGBZones[i] + "/multi_intensity", (async function(): Promise<void> {
                            if (this.skipNextColorChanged[i]) {
                                this.skipNextColorChanged[i] = false;
                                return;
                            }
                            if (!(await this.sysDBusUPowerProps.Get('org.freedesktop.UPower', 'LidIsClosed')).value) {
                                let keyboardBacklightStatesNew: KeyboardBacklightStateInterface = this.tccd.settings.keyboardBacklightStates;
                                let colors = (await fs.promises.readFile(this.ledsRGBZones[i] + "/multi_intensity")).toString().split(' ').map(Number);
                                keyboardBacklightStatesNew[i].red = colors[0];
                                keyboardBacklightStatesNew[i].green = colors[1];
                                keyboardBacklightStatesNew[i].blue = colors[2];
                                this.setKeyboardBacklightStates(keyboardBacklightStatesNew, false, true, true);
                            }
                        }).bind(this));
                    }).bind(this)(i);
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
                    let keyboardBacklightStatesNew = JSON.parse(this.keyboardBacklightStatesPendingNewJSON);
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

        if (fileOK(this.ledsWhiteOnly + "/max_brightness")) {
            console.log("Detected white only keyboard backlight");
            this.keyboardBacklightCapabilities.maxBrightness = Number(fs.readFileSync(this.ledsWhiteOnly + "/max_brightness"));
            this.keyboardBacklightCapabilities.zones = 1;
        }
        else {
            this.updateLEDSRGBZonesForPerKeyKBL();

            if (this.ledsRGBZones.length <= 3 && fileOK(this.ledsRGBZones[0] + "/max_brightness")) {
                console.log("Detected RGB zone keyboard backlight");
                this.keyboardBacklightCapabilities.maxBrightness = Number(fs.readFileSync(this.ledsRGBZones[0] + "/max_brightness"));
                this.keyboardBacklightCapabilities.maxRed = 0xff;
                this.keyboardBacklightCapabilities.maxGreen = 0xff;
                this.keyboardBacklightCapabilities.maxBlue = 0xff;
                this.keyboardBacklightCapabilities.zones = 1;
                if (fileOK(this.ledsRGBZones[1] + "/max_brightness")) {
                    this.keyboardBacklightCapabilities.zones++;
                }
                if (fileOK(this.ledsRGBZones[2] + "/max_brightness")) {
                    console.log("Detected RGB 3 zone keyboard backlight");
                    this.keyboardBacklightCapabilities.zones++;
                }
            }
            else if (this.ledsRGBZones.length > 3 && fileOK(this.ledsRGBZones[0] + "/max_brightness")) {
                console.log("Detected per-key RGB keyboard backlight");
                this.keyboardBacklightCapabilities.maxBrightness = Number(fs.readFileSync(this.ledsRGBZones[0] + "/max_brightness"));
                this.keyboardBacklightCapabilities.maxRed = 0xff;
                this.keyboardBacklightCapabilities.maxGreen = 0xff;
                this.keyboardBacklightCapabilities.maxBlue = 0xff;
                this.keyboardBacklightCapabilities.zones = this.ledsRGBZones.length;
            }
            else {
                console.log("Detected no keyboard backlight");
                this.tccd.dbusData.keyboardBacklightCapabilitiesJSON = JSON.stringify(undefined);
                return;
            }
        }

        this.tccd.dbusData.keyboardBacklightCapabilitiesJSON = JSON.stringify(this.keyboardBacklightCapabilities);
    }

    private updateLEDSRGBZonesForPerKeyKBL(): void {
        let ledsPerKey = [];
        let iteKeyboardDevices: Array<string>;

        iteKeyboardDevices =
            getSymbolicLinks("/sys/bus/hid/drivers/tuxedo-keyboard-ite")
                .filter(name => fileOK("/sys/bus/hid/drivers/tuxedo-keyboard-ite/" + name + "/leds"));
        for (const iteKeyboardDevice of iteKeyboardDevices) {
            let path = "/sys/bus/hid/drivers/tuxedo-keyboard-ite/" + iteKeyboardDevice + "/leds"
            if (fileOK(path)) {
                ledsPerKey = ledsPerKey.concat(
                    getDirectories(path)
                        .filter(name => name.includes("rgb:kbd_backlight"))
                        .sort((a, b) => +a.replace("rgb:kbd_backlight_", "").replace("rgb:kbd_backlight", "0") - +b.replace("rgb:kbd_backlight_", "").replace("rgb:kbd_backlight", "0"))
                        .map(name => path + "/" + name));
            }
        }

        iteKeyboardDevices =
            getSymbolicLinks("/sys/bus/hid/drivers/ite_829x")
                .filter(name => fileOK("/sys/bus/hid/drivers/ite_829x/" + name + "/leds"));
        for (const iteKeyboardDevice of iteKeyboardDevices) {
            let path = "/sys/bus/hid/drivers/ite_829x/" + iteKeyboardDevice + "/leds"
            if (fileOK(path)) {
                ledsPerKey = ledsPerKey.concat(
                    getDirectories(path)
                        .filter(name => name.includes("rgb:kbd_backlight"))
                        .sort((a, b) => +a.replace("rgb:kbd_backlight_", "").replace("rgb:kbd_backlight", "0") - +b.replace("rgb:kbd_backlight_", "").replace("rgb:kbd_backlight", "0"))
                        .map(name => path + "/" + name));
            }
        }

        iteKeyboardDevices =
            getSymbolicLinks("/sys/bus/hid/drivers/ite_8291")
                .filter(name => fileOK("/sys/bus/hid/drivers/ite_8291/" + name + "/leds"));
        for (const iteKeyboardDevice of iteKeyboardDevices) {
            let path = "/sys/bus/hid/drivers/ite_8291/" + iteKeyboardDevice + "/leds"
            if (fileOK(path)) {
                ledsPerKey = ledsPerKey.concat(
                    getDirectories(path)
                        .filter(name => name.includes("rgb:kbd_backlight"))
                        .sort((a, b) => +a.replace("rgb:kbd_backlight_", "").replace("rgb:kbd_backlight", "0") - +b.replace("rgb:kbd_backlight_", "").replace("rgb:kbd_backlight", "0"))
                        .map(name => path + "/" + name));
            }
        }

        if (ledsPerKey.length > 0) {
            this.ledsRGBZones = ledsPerKey;
            this.skipNextColorChanged = [];
            for (let i: number = 0; i < ledsPerKey.length ; ++i) {
                this.skipNextColorChanged.concat(false);
            }
        }
    }

    protected async setKeyboardBacklightStates(keyboardBacklightStatesNew: Array<KeyboardBacklightStateInterface>,
                                             updateSysFS: boolean = true,
                                             updateSettings: boolean = true,
                                             updateTCC: boolean = true): Promise<void> {
        if (updateSysFS) {
            this.skipNextBrightnessChanged = true;
            await this.sysDBusUPowerKbdBacklightInterface.SetBrightness(keyboardBacklightStatesNew[0].brightness);

            for (let i: number = 0; i < this.ledsRGBZones.length ; ++i) {
                if (await fileOKAsync(this.ledsRGBZones[i] + "/multi_intensity")) {
                    this.skipNextColorChanged[i] = true;
                    await fs.promises.appendFile(this.ledsRGBZones[i] + "/multi_intensity",
                                                    keyboardBacklightStatesNew[i].red.toString() + " " + 
                                                    keyboardBacklightStatesNew[i].green.toString() + " " + 
                                                    keyboardBacklightStatesNew[i].blue.toString());
                }
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