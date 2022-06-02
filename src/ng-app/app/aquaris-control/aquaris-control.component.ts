import { Component, OnDestroy, OnInit } from '@angular/core';
import { ElectronService } from 'ngx-electron';
import { aquarisAPIHandle, ClientAPI } from '../../../e-app/AquarisAPI';
import { FormControl } from '@angular/forms';
import { DeviceInfo as AquarisDeviceInfo } from '../../../e-app/LCT21001';

@Component({
    selector: 'app-aquaris-control',
    templateUrl: './aquaris-control.component.html',
    styleUrls: ['./aquaris-control.component.scss']
})
export class AquarisControlComponent implements OnInit, OnDestroy {

    private aquaris: ClientAPI;

    private connectedTimeout: NodeJS.Timeout;

    public deviceList: AquarisDeviceInfo[] = [];

    public stateInitialized = false;

    public ctrlConnectionToggle = new FormControl();
    public ctrlDeviceList = new FormControl();
    public selectedDeviceUUID: string;

    public ctrlLedToggle = new FormControl();
    public ctrlLedRed = new FormControl();
    public ctrlLedGreen = new FormControl;
    public ctrlLedBlue = new FormControl();
    public ctrlLedMode = new FormControl();

    public chosenColorHex;

    public ctrlFanToggle = new FormControl();
    public ctrlFanDutyCycle = new FormControl();

    public ctrlPumpToggle = new FormControl();
    public ctrlPumpDutyCycle = new FormControl();
    public ctrlPumpVoltage = new FormControl();

    public fwVersion: string = '';

    public showPumpControls = false;
    
    constructor(private electron: ElectronService) {
        this.aquaris = new ClientAPI(this.electron.ipcRenderer, aquarisAPIHandle);
    }

    ngOnInit() {
        this.initCommunication();
    }

    async initCommunication() {
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
        if (this.selectedDeviceUUID !== undefined) {
            this.ctrlDeviceList.setValue([this.selectedDeviceUUID]);
        }
        this.isUpdatingDevices = false;
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
            this.ctrlLedToggle.setValue(state.ledOn);
            this.ctrlLedRed.setValue(state.red);
            this.ctrlLedGreen.setValue(state.green);
            this.ctrlLedBlue.setValue(state.blue);
            this.ctrlLedMode.setValue(state.ledMode);
            this.chosenColorHex = this.rgbToHex(state.red, state.green, state.blue);
            
            this.ctrlFanToggle.setValue(state.fanOn);
            this.ctrlFanDutyCycle.setValue(state.fanDutyCycle);

            this.ctrlPumpToggle.setValue(state.pumpOn);
            this.ctrlPumpDutyCycle.setValue(state.pumpDutyCycle);
            this.ctrlPumpVoltage.setValue(state.pumpVoltage);

            this.stateInitialized = true;
        }
    }

    private async periodicUpdate() {
        this.isConnected = await this.aquaris.isConnected();

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
        const ledMode = parseInt(this.ctrlLedMode.value);

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

        this.ctrlConnectionToggle.setValue(this.isConnected);
    }

    public async buttonConnect(deviceUUID: string) {
        if (deviceUUID === undefined) {
            return;
        }

        this.isConnecting = true;

        const sleep = (ms: number) => { return new Promise(resolve => setTimeout(resolve, ms)); }
        while (this.isUpdatingDevices) { await sleep(10); }

        try {
            await this.aquaris.connect(deviceUUID);
            this.isConnected = await this.aquaris.isConnected();
            await this.updateState();
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
        this.isDisconnecting = true;
        try {
            await this.aquaris.disconnect();
            this.isConnected = await this.aquaris.isConnected();
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
}
