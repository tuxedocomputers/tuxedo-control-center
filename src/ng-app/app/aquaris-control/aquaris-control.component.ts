import { Component, OnDestroy, OnInit } from '@angular/core';
import { ElectronService } from 'ngx-electron';
import { PumpVoltage, RGBState } from '../../../e-app/LCT21001';
import { aquarisAPIHandle, ClientAPI } from '../../../e-app/AquarisAPI';
import { AbstractControl, FormControl } from '@angular/forms';

interface LEDState {
    red: number,
    green: number,
    blue: number
}

@Component({
    selector: 'app-aquaris-control',
    templateUrl: './aquaris-control.component.html',
    styleUrls: ['./aquaris-control.component.scss']
})
export class AquarisControlComponent implements OnInit, OnDestroy {

    private aquaris: ClientAPI;

    private timeout: NodeJS.Timeout;

    public stateInitialized = false;

    public ctrlLedToggle = new FormControl();
    public ctrlLedRed = new FormControl();
    public ctrlLedGreen = new FormControl;
    public ctrlLedBlue = new FormControl();
    public ctrlLedMode = new FormControl();

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
        this.timeout = setInterval(async () => { await this.periodicUpdate(); }, 1000);
        this.updateState().then(() => {
            this.aquaris.readFwVersion().then(fwString => { this.fwVersion = fwString });
        });
    }

    ngOnDestroy() {
        if (this.timeout !== undefined) {
            clearInterval(this.timeout);
        }
    }

    private async updateState() {
        const state = await this.aquaris.getState();
        if (state !== undefined) {
            this.ctrlLedToggle.setValue(state.ledOn);
            this.ctrlLedRed.setValue(state.red);
            this.ctrlLedGreen.setValue(state.green);
            this.ctrlLedBlue.setValue(state.blue);
            this.ctrlLedMode.setValue(state.ledMode);
            
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
    }

    public async ledInput(red: number, green: number, blue: number) {
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

    public async buttonConnect() {
        this.isConnecting = true;
        try {
            await this.aquaris.connect('smth');
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
}
