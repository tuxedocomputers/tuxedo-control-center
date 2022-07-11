import { AfterContentInit, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ElectronService } from 'ngx-electron';
import { aquarisAPIHandle, ClientAPI } from '../../../e-app/AquarisAPI';
import { FormControl } from '@angular/forms';
import { DeviceInfo as AquarisDeviceInfo, RGBState } from '../../../e-app/LCT21001';
import { MatDialog } from '@angular/material/dialog';
import { DialogInputTextComponent } from '../dialog-input-text/dialog-input-text.component';
import { ConfirmDialogData, ConfirmDialogResult, DialogConfirmComponent } from '../dialog-confirm/dialog-confirm.component';
import { UtilsService } from '../utils.service';

interface FanPreset {
    name: string;
    value: number;
}

@Component({
    selector: 'app-aquaris-control',
    templateUrl: './aquaris-control.component.html',
    styleUrls: ['./aquaris-control.component.scss']
})
export class AquarisControlComponent implements OnInit, AfterContentInit, OnDestroy {

    private aquaris: ClientAPI;

    private connectedTimeout: NodeJS.Timeout;

    public deviceList: AquarisDeviceInfo[] = [];
    public deviceNameMap = new Map<string, string>();

    public stateInitialized = false;

    public ctrlDeviceList = new FormControl();
    public selectedDeviceUUID: string;

    public ctrlLedToggle = new FormControl();
    public ctrlLedRed = new FormControl();
    public ctrlLedGreen = new FormControl;
    public ctrlLedBlue = new FormControl();

    public selectedLedTab = 0;
    public ctrlLedBreathe = new FormControl();
    public ctrlLedStaticOrRainbow = new FormControl();

    public chosenColorHex;

    public ctrlFanToggle = new FormControl();
    public ctrlFanDutyCycle = new FormControl();
    public ctrlFanDutyCycleTextInput = new FormControl();

    public fanPresets: Map<string, FanPreset> = new Map();

    public ctrlPumpToggle = new FormControl();
    public ctrlPumpDutyCycle = new FormControl();
    public ctrlPumpVoltage = new FormControl();

    public fwVersion: string = '';

    public showPumpControls = false;

    public readonly TAB_COLORPICKER = 0;
    public readonly TAB_ANIMATION = 1;

    public hasBluetooth = true;
    
    constructor(
        private electron: ElectronService,
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
        this.aquaris = new ClientAPI(this.electron.ipcRenderer, aquarisAPIHandle);
    }

    ngOnInit() {
        
    }

    ngAfterContentInit(): void {
        this.initCommunication();
    }

    async initCommunication() {
        this.deviceNameMap = await this.getUserDeviceNames();
        this.isConnected = await this.aquaris.isConnected();
        if (!this.isConnected) {
            await this.aquaris.startDiscover();
        }
        await this.updateState();
        await this.periodicUpdate();

        this.connectedTimeout = setInterval(async () => { await this.periodicUpdate(); }, 3000);
    }

    ngOnDestroy() {
        if (this.connectedTimeout !== undefined) {
            clearInterval(this.connectedTimeout);
        }
    }

    public isUpdatingDevices = false;

    private async discoverUpdate() {
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

    private findDefaultSelectedDevice() {
        let defaultDeviceUUID;

        // First default list selection: first device with an assigned name
        let uuidWithAssignedName;
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
            let lastConnectedUUID = localStorage.getItem('aquarisLastConnected');
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

    public rgbToHex(red: number, green: number, blue: number) {
        return '#' + red.toString(16).padStart(2, '0') + green.toString(16).padStart(2, '0') + blue.toString(16).padStart(2, '0');
    }

    public hexToRed(hex: string) {
        return parseInt(hex.slice(1, 3), 16);
    }

    public hexToGreen(hex: string) {
        return parseInt(hex.slice(3, 5), 16);
    }

    public hexToBlue(hex: string) {
        return parseInt(hex.slice(5, 7), 16);
    }

    private async updateState() {
        const state = await this.aquaris.getState();
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

    private async periodicUpdate() {
        this.isConnected = await this.aquaris.isConnected();
        this.hasBluetooth = await this.aquaris.hasBluetooth();

        if (!this.isConnected && !this.isConnecting && !this.isDisconnecting) {
            await this.discoverUpdate();
        }
    }

    public inputColor() {
        const red = this.hexToRed(this.chosenColorHex);
        const green = this.hexToGreen(this.chosenColorHex);
        const blue = this.hexToBlue(this.chosenColorHex);

        this.ctrlLedRed.setValue(red);
        this.ctrlLedGreen.setValue(green);
        this.ctrlLedBlue.setValue(blue);
        this.ledUpdate(red, green, blue);
    }

    public inputSlider(red: number, green: number, blue: number) {
        this.chosenColorHex = this.rgbToHex(red, green, blue);
        this.ledUpdate(red, green, blue);
    }

    public async ledUpdate(red: number, green: number, blue: number) {
        const ledToggle = this.ctrlLedToggle.value;
        let ledMode;
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
                    await this.aquaris.updateLED(red, green, blue, ledMode);
                } else {
                    await this.aquaris.writeRGBOff();
                }
            } catch (err) {
                console.log('failed writing led state => ' + err);
            }
            await this.triggerSave();
        }
    }

    public async sliderFanInput(fanSpeed: number) {
        const fanToggle = this.ctrlFanToggle.value;

        if (this.isConnected) {
            try {
                if (fanToggle) {
                    await this.aquaris.writeFanMode(fanSpeed);
                } else {
                    await this.aquaris.writeFanOff();
                }
            } catch (err) {
                console.log('failed writing fan state => ' + err);
            }
            await this.triggerSave();
        }

        if (this.ctrlFanDutyCycleTextInput.dirty) {
            this.ctrlFanDutyCycleTextInput.reset();
        }
    }

    public async sliderFanChange(fanSpeed: number) {

    }

    public async selectFanPreset(fanPresetId: string) {
        const fanPreset = this.fanPresets.get(fanPresetId);

        if (fanPreset.value !== undefined) {
            await this.setCustomFanSpeed(fanPreset.value)
        }
    }

    public async setCustomFanSpeed(speed: number) {
        this.ctrlFanDutyCycle.setValue(speed);
        await this.sliderFanInput(speed);
    }

    public async fanSpeedTextInput() {
        const textSpeed = parseInt(this.ctrlFanDutyCycleTextInput.value);
        if (!isNaN(textSpeed) && textSpeed >= 0 && textSpeed <= 100) {
            await this.setCustomFanSpeed(textSpeed);
            this.ctrlFanDutyCycleTextInput.reset();
        }
    }

    public async pumpInput() {
        const pumpToggle = this.ctrlPumpToggle.value;
        const dutyCycle = parseInt(this.ctrlPumpDutyCycle.value);
        const voltage = parseInt(this.ctrlPumpVoltage.value);

        if (this.isConnected) {
            try {
                if (pumpToggle) {
                    await this.aquaris.writePumpMode(dutyCycle, voltage);
                } else {
                    await this.aquaris.writePumpOff();
                }
            } catch (err) {
                console.log('failed writing pump state => ' + err);
            }
            await this.triggerSave();
        }
    }

    public isConnecting = false;
    public isConnected = false;

    public async connectionToggle() {
        if (this.isConnecting || this.isDisconnecting) {
            return;
        }

        const deviceUUID = this.selectedDeviceUUID;

        if (!this.isConnected) {
            await this.buttonConnect(deviceUUID);
        } else {
            await this.buttonDisconnect();
        }
    }

    public async buttonConnect(deviceUUID: string) {
        if (deviceUUID === undefined) {
            return;
        }

        const connectNoticeDisable = localStorage.getItem('connectNoticeDisable');
        if (connectNoticeDisable === null || connectNoticeDisable === 'false') {
            const askToClose = await this.utils.confirmDialog({
                title: $localize `:@@aqDialogConnectTitle:Are you ready to start your Aquaris?`,
                description: $localize `:@@aqDialogConnectDescription:Please ensure that your Aquaris' watercooling tubes are plugged into your TUXEDO before pressing the 'Connect' button!`,
                linkLabel: $localize `:@@aqDialogConnectLinkLabel:Instructions`,
                linkHref: $localize `:@@aqDialogConnectLinkHref:https\://www.tuxedocomputers.com/en/TUXEDO-Aquaris.tuxedo`,
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

        const sleep = (ms: number) => { return new Promise(resolve => setTimeout(resolve, ms)); }
        while (this.isUpdatingDevices) { await sleep(10); }

        try {
            await this.aquaris.connect(deviceUUID);
            this.isConnected = await this.aquaris.isConnected();
            await this.updateState();
            localStorage.setItem('aquarisLastConnected', deviceUUID);
        } catch (err) {
            console.log('connect failed => ' + err);
            await this.aquaris.disconnect();
            this.isConnected = false;
        } finally {
            this.isConnecting = false;
        }
    }

    public isDisconnecting = false;

    public async buttonDisconnect() {
        const disconnectNoticeDisable = localStorage.getItem('disconnectNoticeDisable');
        if (disconnectNoticeDisable === null || disconnectNoticeDisable === 'false') {
            const askToClose = await this.utils.confirmDialog({
                title: $localize `:@@aqDialogDisconnectTitle:Do you want to disconnect your Aquaris?`,
                description: $localize `:@@aqDialogDisconnectDescription:Please ensure to follow our instructions carefully in case you want to unplug your Aquaris from your TUXEDO.`,
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
            await this.aquaris.saveState();
            await this.aquaris.disconnect();
            this.isConnected = await this.aquaris.isConnected();
            this.selectedDeviceUUID = this.findDefaultSelectedDevice();
            if (this.selectedDeviceUUID === undefined) {
                this.ctrlDeviceList.reset();
            } else {
                this.ctrlDeviceList.setValue([this.selectedDeviceUUID]);
            }
        } catch (err) {
            console.log('disconnect failed => ' + err);
        } finally {
            this.isDisconnecting = false;
        }
    }

    public async buttonLedStop() {
        await this.aquaris.writeRGBOff();
    }

    public async buttonFanStop() {
        await this.aquaris.writeFanOff();
    }
    
    public async buttonPumpStop() {
        await this.aquaris.writePumpOff();
    }

    public selectDevice(deviceUUID) {
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

    public connectedDisplayName() {
        const chosenName = this.deviceNameMap.get(this.selectedDeviceUUID);
        let displayName;
        if (chosenName === undefined) {
            displayName = this.selectedDeviceUUID;
        } else {
            displayName = chosenName;
        }

        return displayName;
    }

    private buttonRepeatTimer: NodeJS.Timeout;
    public buttonRepeatDown(action: () => void) {
        if (this.buttonRepeatTimer !== undefined) { clearInterval(this.buttonRepeatTimer); }
        const repeatDelayMS = 200;

        action();
        
        this.buttonRepeatTimer = setInterval(() => {
            action();
        }, repeatDelayMS);
    }

    public buttonRepeatUp() {
        clearInterval(this.buttonRepeatTimer);
    }

    public modifyFanSliderInputFunc(slider, offset: number, min: number, max: number) {
        return () => {
            this.modifySliderInput(slider, offset, min, max);
            this.sliderFanInput(slider.value);
        }
    }

    public modifySliderInput(slider, offset: number, min: number, max: number) {
            let newValue = slider.value += offset;
            if (newValue < min) {
                newValue = min;
            } else if (newValue > max) {
                newValue = max;
            }
            slider.setValue(newValue);
    }

    public async getUserDeviceNames() {
        let deviceNamesSerialized = localStorage.getItem('aquarisUserDeviceNames');
        let deviceNames: Map<string, string>;
        if (deviceNamesSerialized === null) {
            deviceNames = new Map<string, string>();
        } else {
            deviceNames = new Map(JSON.parse(deviceNamesSerialized));
        }
        
        return deviceNames;
    }

    public async setUserDeviceNames(deviceNames: Map<string, string>) {
        localStorage.setItem('aquarisUserDeviceNames', JSON.stringify(Array.from(deviceNames.entries())));
    }

    public async inputTextDialog() {
        if (!this.isConnected || this.isConnecting || this.isDisconnecting) { return; }

        const deviceNamesCheck = await this.getUserDeviceNames();
        const chosenName = deviceNamesCheck.get(this.selectedDeviceUUID);
        const hasName = chosenName !== undefined;
        const dialogRef = this.dialog.open(DialogInputTextComponent, {
            minWidth: 350,
            data: {
                title: $localize `:@@aqDialogSelectNameTitle:Device name`,
                description: $localize `:@@aqDialogSelectNameDescription:A descriptive name for the device`,
                prefill: hasName ? chosenName : ''
            }
        });
        return dialogRef.afterClosed().toPromise().then(async chosenName => {
            if (chosenName !== undefined) {
                const deviceNames = await this.getUserDeviceNames();
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

    private saveOnTheWay = false;

    public async triggerSave() {
        if (!this.saveOnTheWay && this.isConnected && !this.isConnecting && !this.isDisconnecting) {
            this.saveOnTheWay = true;
            const waitForSaveMs = 1000;
            await new Promise(resolve => setTimeout(resolve, waitForSaveMs));
            await this.aquaris.saveState();
            this.saveOnTheWay = false;
        }
    }
}
