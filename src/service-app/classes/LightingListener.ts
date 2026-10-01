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

import * as fs from 'node:fs';
import * as dbus from 'dbus-next';
import { fileOK, fileOKAsync, getDirectories, getSymbolicLinks } from 'src/common/classes/Utils';
import {
    type KeyboardCapabilitiesInterface,
    KeyboardColorModes,
    type KeyboardStateInterface,
    type LightbarCapabilitiesInterface,
    type LightbarStateInterface,
} from '../../common/models/TccSettings';
import type { TuxedoControlCenterDaemon } from './TuxedoControlCenterDaemon';

export class LightingListener {
    protected ledsWhiteOnly = '/sys/devices/platform/tuxedo_keyboard/leds/white:kbd_backlight';
    protected ledsWhiteOnlyNB05 = '/sys/bus/platform/devices/tuxedo_nb05_kbd_backlight/leds/white:kbd_backlight';

    protected rgbZonePaths = [
        '/sys/devices/platform/tuxedo_keyboard/leds/rgb:kbd_backlight',
        '/sys/devices/platform/tuxedo_keyboard/leds/rgb:kbd_backlight_1',
        '/sys/devices/platform/tuxedo_keyboard/leds/rgb:kbd_backlight_2',
    ];

    protected keyboardCapabilities: KeyboardCapabilitiesInterface = {
        modes: [],
        zones: -1,
        maxBrightness: -1,
        maxRed: -1,
        maxGreen: -1,
        maxBlue: -1,
    };

    protected lightbarPath = '/sys/class/leds/rgb:lightbar';
    protected lightbarCapabilities: LightbarCapabilitiesInterface = {
        maxBrightness: -1,
        maxRed: -1,
        maxGreen: -1,
        maxBlue: -1,
    };

    protected dbusUPowerProps: dbus.ClientInterface = {} as dbus.ClientInterface;
    protected dbusKbdBacklightInterface: dbus.ClientInterface = {} as dbus.ClientInterface;

    protected onStartRetryCount = 10;

    private keyboardUpdatePendingJSON: string | undefined;
    private isKeyboardUpdateInProgress = false;

    private lightbarUpdatePendingJSON: string | undefined;
    private isLightbarUpdateInProgress: boolean = false;

    constructor(private tccd: TuxedoControlCenterDaemon) {
        this.init();
    }

    private async init(): Promise<void> {
        await this.initKeyboard();
        await this.initLightbar();
    }

    private async initKeyboard(): Promise<void> {
        const capabilitiesExist: boolean = await this.detectKeyboard();
        if (!capabilitiesExist && this.onStartRetryCount > 0) {
            console.log('LightingListener: initKeyboard: Could not find keyboard backlight, retrying');
            this.onStartRetryCount--;
            setTimeout(() => this.initKeyboard(), 3000);
            return;
        } else if (!capabilitiesExist) {
            console.log('LightingListener: initKeyboard: Failed to configure keyboard');
            return;
        }

        await this.initKeyboardStates();

        // watching external changes
        const status: boolean = await this.initKeyboardUPower();
        if (!status) {
            console.log('LightingListener: initKeyboard: UPower initialization failed');
            setTimeout(() => this.initKeyboard(), 3000);
            return;
        }
        await this.initSysFSListener();
        console.log('LightingListener: initKeyboard: Keyboard initialization complete');

        this.tccd.dbusData.keyboardStatesPendingJSON.subscribe(this.handleKeyboardUpdate.bind(this));

        const states: KeyboardStateInterface[] = this.tccd.settings.keyboardStates;
        if (states.length > 0 && this.tccd.settings.keyboardBacklightControlEnabled) {
            await this.handleKeyboardUpdate(JSON.stringify(states));
        }
    }

    private async initLightbar(): Promise<void> {
        const capabilitiesExist: boolean = await this.detectLightbar();
        if (!capabilitiesExist) return;

        await this.initLightbarStates();
        console.log('LightingListener: initKeyboard: Lightbar initialization complete');

        this.tccd.dbusData.lightbarStatesPendingJSON.subscribe(this.handleLightbarUpdate.bind(this));

        const states: LightbarStateInterface | null = this.tccd.settings.lightbarStates;
        if (states && this.tccd.settings.keyboardBacklightControlEnabled) {
            await this.handleLightbarUpdate(JSON.stringify(states));
        }
    }

    private async initKeyboardStates(): Promise<void> {
        const zonesCount: number = this.keyboardCapabilities.zones;

        if (this.tccd.settings.keyboardStates?.length === 0) {
            this.tccd.settings.keyboardStates = Array.from({ length: zonesCount }, () => ({
                mode: this.keyboardCapabilities.modes?.[0] ?? KeyboardColorModes.static,
                brightness: this.keyboardCapabilities.maxBrightness,
                red: this.keyboardCapabilities.maxRed ?? -1,
                green: this.keyboardCapabilities.maxGreen ?? -1,
                blue: this.keyboardCapabilities.maxBlue ?? -1,
            }));
        }
    }

    private async initLightbarStates(): Promise<void> {
        const currentStates: LightbarStateInterface | null = this.tccd.settings.lightbarStates;
        const defaultState: LightbarStateInterface = {
            brightness: 0,
            red: this.lightbarCapabilities.maxRed,
            green: this.lightbarCapabilities.maxGreen,
            blue: this.lightbarCapabilities.maxBlue,
        };

        if (!currentStates) {
            this.tccd.settings.lightbarStates = defaultState;
        }
    }

    private async initKeyboardUPower(): Promise<boolean> {
        const bus: dbus.MessageBus = dbus.systemBus();
        const upowerObject: dbus.ProxyObject = await bus.getProxyObject(
            'org.freedesktop.UPower',
            '/org/freedesktop/UPower',
        );
        this.dbusUPowerProps = upowerObject.getInterface('org.freedesktop.DBus.Properties');

        const status: boolean = await this.initKeyboardUPowerInterface(bus);
        if (!status) return false;

        this.registerKeyboardBrightnessChangeListener();
        return true;
    }

    private async initKeyboardUPowerInterface(bus: dbus.MessageBus): Promise<boolean> {
        const paths: {
            path: string;
            name: string;
        }[] = [
            { path: '/org/freedesktop/UPower/KbdBacklight', name: 'org.freedesktop.UPower.KbdBacklight' },
            {
                path: '/org/freedesktop/UPower/KbdBacklight/rgbokbd_backlight',
                name: 'org.freedesktop.UPower.KbdBacklight',
            },
        ];
        for (const { path, name } of paths) {
            try {
                const proxy: dbus.ProxyObject = await bus.getProxyObject('org.freedesktop.UPower', path);
                console.log(`LightingListener: initKeyboardUPowerInterface: Using ${path}`);
                this.dbusKbdBacklightInterface = proxy.getInterface(name);
                return true;
            } catch {}
        }
        return false;
    }

    private registerKeyboardBrightnessChangeListener(): void {
        this.dbusKbdBacklightInterface.on('BrightnessChanged', async (brightness: number) => {
            const lidClosed: boolean = (await this.dbusUPowerProps.Get('org.freedesktop.UPower', 'LidIsClosed')).value;
            if (!lidClosed && this.tccd.settings.keyboardStates) {
                this.tccd.settings.keyboardStates.forEach((state) => {
                    if (state) state.brightness = brightness;
                });
                this.tccd.dbusData.keyboardStatesJSON = JSON.stringify(this.tccd.settings.keyboardStates);
            }
        });
    }

    private async initSysFSListener() {
        if (
            this.keyboardCapabilities.maxRed !== undefined &&
            this.keyboardCapabilities.maxRed !== -1 &&
            this.keyboardCapabilities.maxGreen !== undefined &&
            this.keyboardCapabilities.maxGreen !== -1 &&
            this.keyboardCapabilities.maxBlue !== undefined &&
            this.keyboardCapabilities.maxBlue !== -1
        ) {
            await Promise.all(this.rgbZonePaths.map((_, index: number) => this.watchRgbZoneMultiIntensity(index)));
        }
    }

    private async watchRgbZoneMultiIntensity(index: number): Promise<void> {
        const path: string = `${this.rgbZonePaths[index]}/multi_intensity`;

        if (await fileOKAsync(path)) {
            fs.watch(path, async () => {
                const lidClosed: boolean = (await this.dbusUPowerProps.Get('org.freedesktop.UPower', 'LidIsClosed'))
                    .value;
                if (!lidClosed && this.tccd.settings.keyboardStates?.[index]) {
                    const colors: number[] = (await fs.promises.readFile(path)).toString().split(' ').map(Number);
                    const state: KeyboardStateInterface = this.tccd.settings.keyboardStates[index];
                    [state.red, state.green, state.blue] = colors;

                    this.tccd.dbusData.keyboardStatesJSON = JSON.stringify(this.tccd.settings.keyboardStates);
                }
            });
        }
    }

    private async handleKeyboardUpdate(jsonString: string): Promise<void> {
        if (jsonString && jsonString !== '{}') {
            this.keyboardUpdatePendingJSON = jsonString;
            if (!this.isKeyboardUpdateInProgress) {
                this.isKeyboardUpdateInProgress = true;
                while (this.keyboardUpdatePendingJSON !== undefined) {
                    const states: KeyboardStateInterface[] = JSON.parse(this.keyboardUpdatePendingJSON);
                    this.keyboardUpdatePendingJSON = undefined;
                    await this.writeKeyboardStates(states);

                    this.tccd.settings.keyboardStates = states;
                    this.tccd.dbusData.keyboardStatesJSON = JSON.stringify(states);
                }
                this.isKeyboardUpdateInProgress = false;
            }
        }
    }

    private async handleLightbarUpdate(jsonString: string): Promise<void> {
        if (jsonString && jsonString !== '{}') {
            this.lightbarUpdatePendingJSON = jsonString;
            if (!this.isLightbarUpdateInProgress) {
                this.isLightbarUpdateInProgress = true;
                while (this.lightbarUpdatePendingJSON !== undefined) {
                    const states: LightbarStateInterface = JSON.parse(this.lightbarUpdatePendingJSON);
                    this.lightbarUpdatePendingJSON = undefined;
                    await this.writeLightbarStates(states);

                    this.tccd.settings.lightbarStates = states;
                    this.tccd.dbusData.lightbarStatesJSON = JSON.stringify(states);
                }
                this.isLightbarUpdateInProgress = false;
            }
        }
    }

    private async detectKeyboard(): Promise<boolean> {
        const whitePath: string = await this.getWhiteOnlyLedsPath();
        if (whitePath) {
            console.log('LightingListener: detectKeyboard: Detected white only keyboard backlight');
            this.setWhiteBacklightCapabilities(whitePath);

            this.tccd.dbusData.keyboardCapabilitiesJSON = JSON.stringify(this.keyboardCapabilities);
            return this.keyboardCapabilities.maxBrightness !== -1 && this.keyboardCapabilities.zones !== -1;
        }

        await this.detectRgbBacklightZones();

        if (this.rgbZonePaths.length === 0 || !(await fileOKAsync(`${this.rgbZonePaths[0]}/max_brightness`))) {
            console.log('LightingListener: detectKeyboard: No keyboard detected');
            this.tccd.dbusData.keyboardCapabilitiesJSON = '{}';
            return false;
        }

        const zonesCount: number = this.rgbZonePaths.length;

        if (zonesCount > 4 && (await fileOKAsync(`${this.rgbZonePaths[0]}/max_brightness`))) {
            console.log('LightingListener: detectKeyboard: Detected per-key RGB keyboard backlight');
            this.setPerKeyRgbCapabilities();
        } else if (zonesCount === 4 && (await fileOKAsync(`${this.rgbZonePaths[3]}/max_brightness`))) {
            console.log('LightingListener: detectKeyboard: Detected RGB 4 zone keyboard backlight');
            this.setRgbZoneCapabilities(3);
        } else if (zonesCount === 3 && (await fileOKAsync(`${this.rgbZonePaths[2]}/max_brightness`))) {
            console.log('LightingListener: detectKeyboard: Detected RGB 3 zone keyboard backlight');
            this.setRgbZoneCapabilities(2);
        } else if (zonesCount === 1 && (await fileOKAsync(`${this.rgbZonePaths[0]}/max_brightness`))) {
            console.log('LightingListener: detectKeyboard: Detected keyboard backlight');
            this.setRgbZoneCapabilities(0);
        }

        this.tccd.dbusData.keyboardCapabilitiesJSON = JSON.stringify(this.keyboardCapabilities);

        return (
            this.keyboardCapabilities.maxBrightness !== -1 &&
            this.keyboardCapabilities.zones !== -1 &&
            this.keyboardCapabilities.maxRed !== -1 &&
            this.keyboardCapabilities.maxGreen !== -1 &&
            this.keyboardCapabilities.maxBlue !== -1
        );
    }

    private async detectLightbar(): Promise<boolean> {
        const brightnessPath: string = `${this.lightbarPath}/brightness`;
        const multiIntensityPath: string = `${this.lightbarPath}/multi_intensity`;

        const [brightnessExists, multiExists] = await Promise.all([
            fileOKAsync(brightnessPath),
            fileOKAsync(multiIntensityPath),
        ]);

        const lightbarFilesExist: boolean = brightnessExists && multiExists;

        if (!lightbarFilesExist) {
            console.log('LightingListener: detectLightbar: No lightbar detected');
            return false;
        }
        console.log('LightingListener: detectLightbar: Detected lightbar');

        await this.setLightbarCapabilities();

        return (
            this.lightbarCapabilities.maxBrightness !== -1 &&
            this.lightbarCapabilities.maxRed !== -1 &&
            this.lightbarCapabilities.maxGreen !== -1 &&
            this.lightbarCapabilities.maxBlue !== -1
        );
    }

    private async getWhiteOnlyLedsPath(): Promise<string> {
        return (
            ((await this.checkFileMaxBrightness(this.ledsWhiteOnly)) ||
                (await this.checkFileMaxBrightness(this.ledsWhiteOnlyNB05))) ??
            ''
        );
    }

    private async checkFileMaxBrightness(path: string): Promise<string> {
        return (await fileOKAsync(`${path}/max_brightness`)) ? path : '';
    }

    private setWhiteBacklightCapabilities(path: string): void {
        this.keyboardCapabilities.maxBrightness = Number(fs.readFileSync(`${path}/max_brightness`));
        this.keyboardCapabilities.zones = 1;
    }

    private setRgbZoneCapabilities(zoneIndex: number): void {
        const zonePath = this.rgbZonePaths[zoneIndex];
        this.keyboardCapabilities.maxBrightness = Number(fs.readFileSync(`${zonePath}/max_brightness`));
        this.keyboardCapabilities.maxRed = 0xff;
        this.keyboardCapabilities.maxGreen = 0xff;
        this.keyboardCapabilities.maxBlue = 0xff;
        this.keyboardCapabilities.zones = Math.max(this.keyboardCapabilities.zones || 0, zoneIndex + 1);
    }

    private setPerKeyRgbCapabilities(): void {
        this.keyboardCapabilities.maxBrightness = Number(fs.readFileSync(`${this.rgbZonePaths[0]}/max_brightness`));
        this.keyboardCapabilities.maxRed = 0xff;
        this.keyboardCapabilities.maxGreen = 0xff;
        this.keyboardCapabilities.maxBlue = 0xff;
        this.keyboardCapabilities.zones = this.rgbZonePaths.length;
    }

    private async setLightbarCapabilities(): Promise<void> {
        this.lightbarCapabilities = { maxBrightness: -1, maxRed: -1, maxGreen: -1, maxBlue: -1 };

        if (await fileOKAsync(`${this.lightbarPath}/max_brightness`)) {
            this.lightbarCapabilities.maxBrightness = Number(fs.readFileSync(`${this.lightbarPath}/max_brightness`));
            this.lightbarCapabilities.maxRed = 0xff;
            this.lightbarCapabilities.maxGreen = 0xff;
            this.lightbarCapabilities.maxBlue = 0xff;
            this.tccd.dbusData.lightbarCapabilitiesJSON = JSON.stringify(this.lightbarCapabilities);
        } else {
            this.tccd.dbusData.lightbarCapabilitiesJSON = '{}';
        }
    }

    private async detectRgbBacklightZones(): Promise<void> {
        const keyboardPaths: string[] = [
            '/sys/bus/hid/drivers/tuxedo-keyboard-ite/',
            '/sys/bus/hid/drivers/ite_829x/',
            '/sys/bus/hid/drivers/ite_8291/',
            '/sys/bus/platform/drivers/tuxedo_nb04_kbd_backlight/',
        ];

        const rgbZones: string[] = [];

        for (const path of keyboardPaths) {
            if (fs.existsSync(path)) {
                const deviceLinks: string[] = getSymbolicLinks(path).filter((name) => fileOK(`${path}${name}/leds`));
                for (const deviceLink of deviceLinks) {
                    const ledsPath: string = `${path}${deviceLink}/leds`;
                    if (fileOK(ledsPath)) {
                        const directories: string[] = this.getRgbLedsDirectories(ledsPath);
                        rgbZones.push(...directories.map((name: string) => `${ledsPath}/${name}`));
                    }
                }
            }
        }

        if (rgbZones.length > 0) {
            this.rgbZonePaths = rgbZones;
            return;
        }

        // Polaris Gen 1 does only have rgb:kbd_backlight for example
        const existingPaths: string[] = this.rgbZonePaths.filter((path) => fileOK(path));
        if (existingPaths.length > 0) {
            this.rgbZonePaths = existingPaths;
        }
    }

    private getRgbLedsDirectories(ledsPath: string): string[] {
        const directories: string[] = getDirectories(ledsPath)
            .filter((name: string) => name.includes('rgb:kbd_backlight'))
            .sort((a: string, b: string) => this.extractRgbIndex(a) - this.extractRgbIndex(b));
        return directories;
    }

    private extractRgbIndex(name: string): number {
        const match: RegExpMatchArray | null = name.match(/rgb:kbd_backlight(?:_)?(\d*)/);
        return match?.[1] ? +match[1] : 0;
    }

    private async writeKeyboardStates(states: KeyboardStateInterface[]): Promise<void> {
        try {
            await this.dbusKbdBacklightInterface.SetBrightness(states[0].brightness);
        } catch (err) {
            console.error(`LightingListener: Failed to set brightness via UPower: ${err}`);
            if (err instanceof dbus.DBusError) {
                console.log('LightingListener: writeKeyboardStates: Try restarting upower.service and tccd.service');
            }
            return;
        }

        try {
            if (this.rgbZonePaths.length > 0) {
                await this.setBufferInput(this.rgbZonePaths[0], true);
            }

            for (let i = 0; i < this.rgbZonePaths.length; ++i) {
                const path: string = this.rgbZonePaths[i];
                if (await fileOKAsync(`${path}/multi_intensity`)) {
                    const { red, green, blue } = states[i];
                    await fs.promises.appendFile(`${path}/multi_intensity`, `${red} ${green} ${blue}`);
                }
            }

            if (this.rgbZonePaths.length > 0) {
                await this.setBufferInput(this.rgbZonePaths[0], false);
            }
        } catch (err: unknown) {
            console.log(`LightingListener: writeKeyboardStates: Writing failed => ${err}`);
        }
    }

    private async writeLightbarStates(parsed: LightbarStateInterface): Promise<void> {
        try {
            await Promise.all([
                fs.promises.writeFile(`${this.lightbarPath}/brightness`, parsed.brightness.toString()),
                fs.promises.writeFile(
                    `${this.lightbarPath}/multi_intensity`,
                    `${parsed.red} ${parsed.green} ${parsed.blue}`,
                ),
            ]);
        } catch (err: unknown) {
            console.log(`LightingListener: writeLightbarStates: Writing failed => ${err}`);
        }
    }

    private async setBufferInput(ledPath: string, enableBuffer: boolean): Promise<void> {
        const bufferFilePath: string = `${ledPath}/device/controls/buffer_input`;
        if (await fileOKAsync(bufferFilePath)) {
            await fs.promises.appendFile(bufferFilePath, enableBuffer ? '1' : '0');
        }
    }

    public onActiveProfileChanged(): void {}
}
