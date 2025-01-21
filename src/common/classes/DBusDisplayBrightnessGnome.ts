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

import { execCommandSync } from "./Utils";
import * as dbus from 'dbus-next';

export type OnChangedFunction = (value: number) => void;

export class DBusDisplayBrightnessGnome {

    private interface: any;

    private destination: string = 'org.gnome.SettingsDaemon.Power';
    private path: string = '/org/gnome/SettingsDaemon/Power';

    private propertyInterface: string = 'org.gnome.SettingsDaemon.Power.Screen';
    private methodName: string = 'Brightness';
    private methodReturnType: string = 'i';

    private customOnPropertiesChanged: OnChangedFunction;
    private eventEmitter: NodeJS.EventEmitter;

    constructor(private bus: dbus.MessageBus) {
        if (this.isGnome()) {
            this.getInterface().then((iface: DBusDisplayBrightnessGnome["interface"]): void => {
                if (iface === undefined) { return; }
                this.eventEmitter = iface.on('PropertiesChanged', (interfaceString: string, changed: any, invalidated: any): void => {
                    const changedValueExists: boolean = changed.hasOwnProperty('Brightness') && changed.Brightness.hasOwnProperty('value');
                    const interfaceMatch: boolean = interfaceString === this.propertyInterface;
                    const callbackDefined: boolean = this.customOnPropertiesChanged !== undefined;
                    if (interfaceMatch && changedValueExists && callbackDefined) {
                        this.customOnPropertiesChanged(changed.Brightness.value);
                    }
                });
            }).catch((err: unknown): void => {
                console.error("DBusDisplayBrightnessGnome: constructor failed =>", err)
            });
        }
    }

    // todo: shouldn't be a function, but a variable instead
    public getDescriptiveString(): string {
        return 'org.gnome.SettingsDaemon';
    }

    private isGnome(): boolean {
        const xdgDesktop: string = execCommandSync("echo $XDG_CURRENT_DESKTOP")
        if (xdgDesktop.includes("GNOME")) {
            return true
        }
        return false
    }

    public async isAvailable(): Promise<boolean> {

        return new Promise<boolean>(async (resolve: (value: boolean | PromiseLike<boolean>) => void): Promise<void> => {
            try {
                const isGnome: boolean = this.isGnome()

                if (isGnome) {
                    const iface: DBusDisplayBrightnessGnome["interface"] = await this.getInterface();
                    if (iface === undefined) {
                        resolve(false);
                    } else {
                        resolve(true);
                    }
                }
                resolve(false);
            } catch (err: unknown) {
                console.error("DBusDisplayBrightnessGnome: isAvailable failed =>", err)
                resolve(false);
            }
        });
    }

    public setOnPropertiesChanged(f: OnChangedFunction): void {
        this.customOnPropertiesChanged = f;
    }

    public cleanUp(): void {
        if (this.eventEmitter !== undefined) {
            this.eventEmitter.removeAllListeners();
        }
    }

    public async getInterface(): Promise<DBusDisplayBrightnessGnome["interface"]> {
        return new Promise<DBusDisplayBrightnessGnome["interface"]>((resolve: (value: DBusDisplayBrightnessGnome["interface"]) => void): void => {
            if (this.interface !== undefined) { resolve(this.interface); return; }
            // Initialize interface
            this.bus.getProxyObject(this.destination, this.path).then(
                (proxyObject: any): void => {
                    this.interface = proxyObject.getInterface('org.freedesktop.DBus.Properties');
                    resolve(this.interface);
                }
            ).catch((err: unknown): void => {
                console.error("DBusDisplayBrightnessGnome: getInterface failed =>", err)
                this.interface = undefined;
                resolve(this.interface);
            });
        });
    }

    public async getBrightness(): Promise<number> {
        return new Promise<number>(async (resolve: (value: number | PromiseLike<number>) => void, reject: (reason?: unknown) => void): Promise<void> => {
            try {
                const iface: any = await this.getInterface();
                if (iface !== undefined) {
                    const result: any = await iface.Get(this.propertyInterface, this.methodName);
                    resolve(result.value);
                } else {
                    reject(new Error('Interface not available'));
                }
            } catch (err: unknown) {
                console.error("DBusDisplayBrightnessGnome: getBrightness failed =>", err)
                reject(err);
            }
        });
    }
    public async setBrightness(valuePercent: number): Promise<void> {
        return new Promise<void>(async (resolve: (value?: void) => void, reject: (reason?: unknown) => void): Promise<void> => {
            try {
                const iface: any = await this.getInterface();
                if (iface !== undefined) {
                    await iface.Set(this.propertyInterface, this.methodName, new dbus.Variant(this.methodReturnType, valuePercent));
                    resolve();
                } else {
                    reject(new Error('Interface not available'));
                }
            } catch (err: unknown) {
                console.error("DBusDisplayBrightnessGnome: setBrightness failed =>", err)
                reject(err);
            }
        });
    }
}
