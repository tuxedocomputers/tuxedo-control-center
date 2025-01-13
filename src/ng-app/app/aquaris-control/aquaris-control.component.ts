/*!
 * Copyright (c) 2022 TUXEDO Computers GmbH <tux@tuxedocomputers.com>
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

import { AfterContentInit, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormControl } from '@angular/forms';
import { DeviceInfo as AquarisDeviceInfo, RGBState } from '../../../e-app/LCT21001';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { DialogInputTextComponent } from '../dialog-input-text/dialog-input-text.component';
import { UtilsService } from '../utils.service';
import { IAquarisClientAPI } from 'src/e-app/preloadAPIs/AquarisClientAPI';
import { AquarisState } from 'src/common/models/IAquarisAPI';
import { ConfirmDialogResult } from '../dialog-confirm/dialog-confirm.component';

interface FanPreset {
    name: string;
    value: number;
}

@Component({
    selector: 'app-aquaris-control',
    templateUrl: './aquaris-control.component.html',
    styleUrls: ['./aquaris-control.component.scss'],
    standalone: false
})
export class AquarisControlComponent implements OnInit, AfterContentInit, OnDestroy {

    private aquaris: IAquarisClientAPI = window.aquarisAPI;

    private connectedTimeout: NodeJS.Timeout;

    public deviceList: AquarisDeviceInfo[] = [];
    public deviceNameMap: Map<string, string> = new Map<string, string>();

    public stateInitialized: boolean = false;

    public ctrlDeviceList: FormControl = new FormControl();
    public selectedDeviceUUID: string;

    public ctrlLedToggle: FormControl = new FormControl();
    public ctrlLedRed: FormControl = new FormControl();
    public ctrlLedGreen: FormControl = new FormControl;
    public ctrlLedBlue: FormControl = new FormControl();

    public selectedLedTab: number = 0;
    public ctrlLedBreathe: FormControl = new FormControl();
    public ctrlLedStaticOrRainbow: FormControl = new FormControl();

    public chosenColorHex;

    public ctrlFanToggle: FormControl = new FormControl();
    public ctrlFanDutyCycle: FormControl = new FormControl();
    public ctrlFanDutyCycleTextInput: FormControl = new FormControl();

    public fanPresets: Map<string, FanPreset> = new Map();

    public ctrlPumpToggle: FormControl = new FormControl();
    public ctrlPumpDutyCycle: FormControl = new FormControl();
    public ctrlPumpVoltage: FormControl = new FormControl();

    public fwVersion: string = '';

    public showPumpControls: boolean = false;

    public readonly TAB_COLORPICKER: number = 0;
    public readonly TAB_ANIMATION: number = 1;

    public hasBluetooth: boolean = true;

    constructor(
        public dialog: MatDialog,
        private utils: UtilsService) {
        this.fanPresets.set('slow', {
            name: $localize `:@@aqFanPresetSlowLabel:Slow`,
            value: 50
        }).set('medium', {
            name: $localize `:@@aqFanPresetMediumLabel:Medium`,
            value: 65
        }).set('fast', {
            name: $localize `:@@aqFanPresetFastLabel:Fast`,
            value: 80
        });
        this.aquaris = window.aquarisAPI;
    }

    ngOnInit(): void {
        setTimeout(async (): Promise<void> => {
            window.ipc.showTccWindow();
        }, 200);
    }

    ngAfterContentInit(): void {
        this.initCommunication();
    }

    async initCommunication(): Promise<void> {
        this.deviceNameMap = await this.getUserDeviceNames();
        this.isConnected = await this.aquaris.isConnected();
        if (!this.isConnected) {
            this.aquaris.startDiscover();
        }
        await this.updateState();
        await this.periodicUpdate();

        this.connectedTimeout = setInterval(async (): Promise<void> => { await this.periodicUpdate(); }, 3000);
    }

    ngOnDestroy(): void {
        if (this.connectedTimeout !== undefined) {
            clearInterval(this.connectedTimeout);
        }
    }

    public isUpdatingDevices: boolean = false;

    private async discoverUpdate(): Promise<void> {
        this.isUpdatingDevices = true;
        this.deviceList = await this.aquaris.getDevices();

        if (this.selectedDeviceUUID === undefined) {
            this.selectedDeviceUUID = this.findDefaultSelectedDevice();
        }

        if (this.selectedDeviceUUID !== undefined) {
            this.ctrlDeviceList.setValue([this.selectedDeviceUUID]);
        }
        this.isUpdatingDevices = false;
    }

    private findDefaultSelectedDevice(): string {
        let defaultDeviceUUID: string;

        // First default list selection: first device with an assigned name
        let uuidWithAssignedName: string;
        for (let device of this.deviceList) {
            if (this.deviceNameMap.get(device.uuid) !== undefined) {
                uuidWithAssignedName = device.uuid;
                break;
            }
        }
        if (uuidWithAssignedName !== undefined) {
            defaultDeviceUUID = uuidWithAssignedName;
        }

        // Second default list selection: last connected device
        if (defaultDeviceUUID === undefined) {
            let lastConnectedUUID: string = localStorage.getItem('aquarisLastConnected');
            if (lastConnectedUUID !== null) {
                for (let device of this.deviceList) {
                    if (device.uuid === lastConnectedUUID) {
                        defaultDeviceUUID = lastConnectedUUID;
                        break;
                    }
                }
            }
        }

        return defaultDeviceUUID;
    }

    public rgbToHex(red: number, green: number, blue: number): string {
        return '#' + red.toString(16).padStart(2, '0') + green.toString(16).padStart(2, '0') + blue.toString(16).padStart(2, '0');
    }

    public hexToRed(hex: string): number {
        return parseInt(hex.slice(1, 3), 16);
    }

    public hexToGreen(hex: string): number {
        return parseInt(hex.slice(3, 5), 16);
    }

    public hexToBlue(hex: string): number {
        return parseInt(hex.slice(5, 7), 16);
    }

    private async updateState(): Promise<void> {
        const state: AquarisState = await this.aquaris.getState();
        if (state !== undefined) {
            if (this.isConnected) {
                this.selectedDeviceUUID = state.deviceUUID;
            }

            this.ctrlLedToggle.setValue(state.ledOn);
            this.ctrlLedRed.setValue(state.red);
            this.ctrlLedGreen.setValue(state.green);
            this.ctrlLedBlue.setValue(state.blue);
            this.chosenColorHex = this.rgbToHex(state.red, state.green, state.blue);

            this.ctrlFanToggle.setValue(state.fanOn);
            this.ctrlFanDutyCycle.setValue(state.fanDutyCycle);

            this.ctrlPumpToggle.setValue(state.pumpOn);
            this.ctrlPumpDutyCycle.setValue(state.pumpDutyCycle);
            this.ctrlPumpVoltage.setValue(state.pumpVoltage);

            switch (state.ledMode) {
                case RGBState.Static:
                    this.selectedLedTab = this.TAB_COLORPICKER;
                    this.ctrlLedStaticOrRainbow.setValue('static');
                    this.ctrlLedBreathe.setValue(false);
                    break;
                case RGBState.Breathe:
                    this.selectedLedTab = this.TAB_COLORPICKER;
                    this.ctrlLedStaticOrRainbow.setValue('static');
                    this.ctrlLedBreathe.setValue(true);
                    break;
                case RGBState.Colorful:
                    this.selectedLedTab = this.TAB_ANIMATION;
                    this.ctrlLedStaticOrRainbow.setValue('rainbow');
                    this.ctrlLedBreathe.setValue(false);
                    break;
                case RGBState.BreatheColor:
                    this.selectedLedTab = this.TAB_ANIMATION;
                    this.ctrlLedStaticOrRainbow.setValue('rainbow');
                    this.ctrlLedBreathe.setValue(true);
                    break;
            }

            this.stateInitialized = true;
        }
    }

    private async periodicUpdate(): Promise<void> {
        this.isConnected = await this.aquaris.isConnected();
        this.hasBluetooth = await this.aquaris.hasBluetooth();

        if (!this.isConnected && !this.isConnecting && !this.isDisconnecting) {
            await this.discoverUpdate();
        }
    }

    public inputColor(): void {
        const red: number = this.hexToRed(this.chosenColorHex);
        const green: number = this.hexToGreen(this.chosenColorHex);
        const blue: number = this.hexToBlue(this.chosenColorHex);

        this.ctrlLedRed.setValue(red);
        this.ctrlLedGreen.setValue(green);
        this.ctrlLedBlue.setValue(blue);
        this.ledUpdate(red, green, blue);
    }

    public inputSlider(red: number, green: number, blue: number): void {
        this.chosenColorHex = this.rgbToHex(red, green, blue);
        this.ledUpdate(red, green, blue);
    }

    public async ledUpdate(red: number, green: number, blue: number): Promise<void> {
        const ledToggle: boolean = this.ctrlLedToggle.value;
        let ledMode: RGBState;
        const isBreathing = this.ctrlLedBreathe.value as boolean;
        const staticOrRainbow = this.ctrlLedStaticOrRainbow.value as string;
        if (staticOrRainbow === 'static') {
            if (isBreathing) {
                ledMode = RGBState.Breathe;
            } else {
                ledMode = RGBState.Static;
            }
        } else {
            if (isBreathing) {
                ledMode = RGBState.BreatheColor;
            } else {
                ledMode = RGBState.Colorful;
            }
        }

        if (this.isConnected) {
            try {
                if (ledToggle) {
                    this.aquaris.updateLED(red, green, blue, ledMode);
                } else {
                    this.aquaris.writeRGBOff();
                }
            } catch (err: unknown) {
                console.error("aquaris-control: failed writing led state =>", err);
            }
            await this.triggerSave();
        }
    }

    public async sliderFanInput(fanSpeed: number): Promise<void> {
        const fanToggle: boolean = this.ctrlFanToggle.value;

        if (this.isConnected) {
            try {
                if (fanToggle) {
                    this.aquaris.writeFanMode(fanSpeed);
                } else {
                    this.aquaris.writeFanOff();
                }
            } catch (err: unknown) {
                console.error("aquaris-control: failed writing fan state =>", err);
            }
            await this.triggerSave();
        }

        if (this.ctrlFanDutyCycleTextInput.dirty) {
            this.ctrlFanDutyCycleTextInput.reset();
        }
    }

    // todo: function is empty
    public async sliderFanChange(fanSpeed: number): Promise<void> {

    }

    public async selectFanPreset(fanPresetId: string): Promise<void> {
        const fanPreset = this.fanPresets.get(fanPresetId);

        if (fanPreset.value !== undefined) {
            await this.setCustomFanSpeed(fanPreset.value)
        }
    }

    public async setCustomFanSpeed(speed: number): Promise<void> {
        this.ctrlFanDutyCycle.setValue(speed);
        await this.sliderFanInput(speed);
    }

    public async fanSpeedTextInput(): Promise<void> {
        const textSpeed: number = parseInt(this.ctrlFanDutyCycleTextInput.value);
        if (!isNaN(textSpeed) && textSpeed >= 0 && textSpeed <= 100) {
            await this.setCustomFanSpeed(textSpeed);
            this.ctrlFanDutyCycleTextInput.reset();
        }
    }

    public async pumpInput(): Promise<void> {
        const pumpToggle: boolean = this.ctrlPumpToggle.value;
        const dutyCycle: number = parseInt(this.ctrlPumpDutyCycle.value);
        const voltage: number = parseInt(this.ctrlPumpVoltage.value);

        if (this.isConnected) {
            try {
                if (pumpToggle) {
                    this.aquaris.writePumpMode(dutyCycle, voltage);
                } else {
                    this.aquaris.writePumpOff();
                }
            } catch (err: unknown) {
                console.error("aquaris-control: writePumpMode failed =>", err)
            }
            await this.triggerSave();
        }
    }

    public isConnecting: boolean = false;
    public isConnected: boolean = false;

    public async connectionToggle(): Promise<void> {
        if (this.isConnecting || this.isDisconnecting) {
            return;
        }

        const deviceUUID: string = this.selectedDeviceUUID;

        if (!this.isConnected) {
            await this.buttonConnect(deviceUUID);
        } else {
            await this.buttonDisconnect();
        }
    }

    public aquarisInfoUrlHref: string = $localize `:@@aqDialogConnectLinkHref:https\://www.tuxedocomputers.com/en/TUXEDO-Aquaris.tuxedo`;

    public async buttonConnect(deviceUUID: string): Promise<void> {
        if (deviceUUID === undefined) {
            return;
        }

        const connectNoticeDisable: string = localStorage.getItem('connectNoticeDisable');
        if (connectNoticeDisable === null || connectNoticeDisable === 'false') {
            const askToClose: ConfirmDialogResult = await this.utils.confirmDialog({
                title: $localize `:@@aqDialogConnectTitle:Are you ready to connect to your Aquaris?`,
                description: $localize `:@@aqDialogConnectDescription:Please ensure that your Aquaris' watercooling tubes are plugged into your TUXEDO before pressing the 'Connect' button!`,
                linkLabel: $localize `:@@aqDialogConnectLinkLabel:Instructions`,
                linkHref: this.aquarisInfoUrlHref,
                buttonAbortLabel: $localize `:@@aqDialogButtonAbortConnectLabel:Do not connect`,
                buttonConfirmLabel: $localize `:@@aqDialogButtonConfirmConnectLabel:Connect`,
                checkboxNoBotherLabel: $localize `:@@aqDialogCheckboxNoBotherLabel:Don't ask again`,
                showCheckboxNoBother: true
            });
            if (askToClose.noBother) {
                localStorage.setItem('connectNoticeDisable', 'true');
            }
            if (!askToClose.confirm) return;
        }

        this.isConnecting = true;

        const sleep: (ms: number) => Promise<void> = (ms: number): Promise<void> => { return new Promise<void>((resolve: () => void): NodeJS.Timeout => setTimeout(resolve, ms)); }

        while (this.isUpdatingDevices) { await sleep(10); }

        try {
            this.aquaris.connect(deviceUUID);
            this.isConnected = await this.aquaris.isConnected();
            await this.updateState();
            localStorage.setItem('aquarisLastConnected', deviceUUID);
        } catch (err: unknown) {
            console.error("aquaris-control: buttonConnect failed =>", err)
            this.aquaris.disconnect();
            this.isConnected = false;
        } finally {
            this.isConnecting = false;
        }
    }

    public isDisconnecting: boolean = false;

    public async buttonDisconnect(): Promise<void> {
        const disconnectNoticeDisable: string = localStorage.getItem('disconnectNoticeDisable');
        if (disconnectNoticeDisable === null || disconnectNoticeDisable === 'false') {
            const askToClose: ConfirmDialogResult = await this.utils.confirmDialog({
                title: $localize `:@@aqDialogDisconnectTitle:Do you want to disconnect your Aquaris?`,
                description: $localize `:@@aqDialogDisconnectDescription:Please ensure to follow our instructions carefully in case you want to unplug your Aquaris from your TUXEDO.`,
                linkLabel: $localize `:@@aqDialogDisconnectLinkLabel:Instructions`,
                linkHref: $localize `:@@aqDialogDisconnectLinkHref:https\://www.tuxedocomputers.com/en/TUXEDO-Aquaris.tuxedo`,
                buttonAbortLabel: $localize `:@@aqDialogButtonAbortLabel:Stay connected`,
                buttonConfirmLabel: $localize `:@@aqDialogButtonConfirmLabel:Disconnect`,
                checkboxNoBotherLabel: $localize `:@@aqDialogCheckboxNoBotherLabel:Don't ask again`,
                showCheckboxNoBother: true
            });
            if (askToClose.noBother) {
                localStorage.setItem('disconnectNoticeDisable', 'true');
            }
            if (!askToClose.confirm) return;
        }

        this.isDisconnecting = true;
        try {
            this.aquaris.saveState();
            this.aquaris.disconnect();
            this.isConnected = await this.aquaris.isConnected();
            this.selectedDeviceUUID = this.findDefaultSelectedDevice();
            if (this.selectedDeviceUUID === undefined) {
                this.ctrlDeviceList.reset();
            } else {
                this.ctrlDeviceList.setValue([this.selectedDeviceUUID]);
            }
        } catch (err: unknown) {
            console.error("aquaris-control: disconnect failed =>", err);
        } finally {
            this.isDisconnecting = false;
        }
    }

    public async buttonLedStop(): Promise<void> {
        this.aquaris.writeRGBOff();
    }

    public async buttonFanStop(): Promise<void> {
        this.aquaris.writeFanOff();
    }

    public async buttonPumpStop(): Promise<void> {
        this.aquaris.writePumpOff();
    }

    public selectDevice(deviceUUID: string): void {
        this.selectedDeviceUUID = deviceUUID;
    }

    public connectedStatusString(): string {
        if (!this.hasBluetooth) {
            return $localize `:aqConnectionStatusNoBluetooth:Bluetooth not available`;
        } else if (this.isConnecting) {
            return $localize `:aqConnectionStatusConnecting:Connecting...`;
        } else if (this.isDisconnecting) {
            return $localize `:aqConnectionStatusDisconnecting:Disconnecting...`;
        } else if (this.isConnected) {
            return $localize `:aqConnectionStatusConnectedTo:Connected to`;
        } else {
            return $localize `:aqConnectionStatusLookingForDevices:Looking for devices...`;
        }
    }

    public connectedDisplayName(): string {
        const chosenName: string = this.deviceNameMap.get(this.selectedDeviceUUID);
        let displayName: string;
        if (chosenName === undefined) {
            displayName = this.selectedDeviceUUID;
        } else {
            displayName = chosenName;
        }

        return displayName;
    }

    private buttonRepeatTimer: NodeJS.Timeout;
    public buttonRepeatDown(action: () => void): void {
        if (this.buttonRepeatTimer !== undefined) { clearInterval(this.buttonRepeatTimer); }
        const repeatDelayMS = 200;

        action();

        this.buttonRepeatTimer = setInterval((): void => {
            action();
        }, repeatDelayMS);
    }

    public buttonRepeatUp(): void {
        clearInterval(this.buttonRepeatTimer);
    }

    public modifyFanSliderInputFunc(slider: FormControl, offset: number, min: number, max: number): () => void {
        return (): void => {
            this.modifySliderInput(slider, offset, min, max);
            this.sliderFanInput(slider.value);
        }
    }

    public modifySliderInput(slider: FormControl, offset: number, min: number, max: number): void {
            let newValue: number = slider.value + offset;
            if (newValue < min) {
                newValue = min;
            } else if (newValue > max) {
                newValue = max;
            }
            slider.setValue(newValue);
    }

    public async getUserDeviceNames(): Promise<Map<string, string>> {
        let deviceNamesSerialized: string = localStorage.getItem('aquarisUserDeviceNames');
        let deviceNames: Map<string, string>;
        if (deviceNamesSerialized === null) {
            deviceNames = new Map<string, string>();
        } else {
            deviceNames = new Map(JSON.parse(deviceNamesSerialized));
        }

        return deviceNames;
    }

    public async setUserDeviceNames(deviceNames: Map<string, string>): Promise<void> {
        localStorage.setItem('aquarisUserDeviceNames', JSON.stringify(Array.from(deviceNames.entries())));
    }

    public async inputTextDialog(): Promise<void> {
        if (!this.isConnected || this.isConnecting || this.isDisconnecting) { return; }

        const deviceNamesCheck: Map<string, string> = await this.getUserDeviceNames();
        const chosenName: string = deviceNamesCheck.get(this.selectedDeviceUUID);
        const hasName: boolean = chosenName !== undefined;
        const dialogRef: MatDialogRef<DialogInputTextComponent, any> = this.dialog.open(DialogInputTextComponent, {
            minWidth: 350,
            data: {
                title: $localize `:@@aqDialogSelectNameTitle:Device name`,
                description: $localize `:@@aqDialogSelectNameDescription:A descriptive name for the device`,
                prefill: hasName ? chosenName : ''
            }
        });
        return dialogRef.afterClosed().toPromise().then(async chosenName => {
            if (chosenName !== undefined) {
                const deviceNames: Map<string, string> = await this.getUserDeviceNames();
                if (chosenName.trim() === '') {
                    deviceNames.delete(this.selectedDeviceUUID);
                } else {
                    deviceNames.set(this.selectedDeviceUUID, chosenName);
                }
                await this.setUserDeviceNames(deviceNames);
                this.deviceNameMap = deviceNames;
            }
        });
    }

    private saveOnTheWay: boolean = false;

    public async triggerSave(): Promise<void> {
        if (!this.saveOnTheWay && this.isConnected && !this.isConnecting && !this.isDisconnecting) {
            this.saveOnTheWay = true;
            const waitForSaveMs = 1000;
            await new Promise<void>((resolve: () => void): NodeJS.Timeout => setTimeout(resolve, waitForSaveMs));
            this.aquaris.saveState();
            this.saveOnTheWay = false;
        }
    }

    public async openExternalUrl(url: string): Promise<void> {
        await this.utils.openExternal(url);
    }
}