import { Component, OnDestroy, OnInit } from '@angular/core';
import { ElectronService } from 'ngx-electron';
import { PumpVoltage, RGBState } from '../../../e-app/LCT21001';
import { aquarisAPIHandle, ClientAPI } from '../../../e-app/AquarisAPI';
import { FormControl } from '@angular/forms';

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

    public ioInProgress = false;
    
    constructor(private electron: ElectronService) {
        this.aquaris = new ClientAPI(this.electron.ipcRenderer, aquarisAPIHandle);
    }

    ngOnInit() {
        this.timeout = setInterval(async () => { await this.periodicUpdate(); }, 1000);
    }

    ngOnDestroy() {
        if (this.timeout !== undefined) {
            clearInterval(this.timeout);
        }
    }

    private async periodicUpdate() {
        this.isConnected = await this.aquaris.isConnected();
    }

    public ctrlLedMode = new FormControl(0);

    public async ledInput(red: number, green: number, blue: number) {

        const ledMode = parseInt(this.ctrlLedMode.value);

        if (this.isConnected) {
            try {
                await this.aquaris.updateLED(red, green, blue, ledMode);
            } catch (err) {
                console.log('failed writing led state => ' + err);
            }
        }
    }

    public async sliderFanInput(fanSpeed: number) {
        if (this.isConnected) {
            try {
                await this.aquaris.writeFanMode(fanSpeed);
            } catch (err) {
                console.log('failed writing fan state => ' + err);
            }
        }
    }

    public ctrlPumpDutyCycle = new FormControl(60);
    public ctrlPumpVoltage = new FormControl(3);

    public async pumpInput() {
        const dutyCycle = parseInt(this.ctrlPumpDutyCycle.value);
        const voltage = parseInt(this.ctrlPumpVoltage.value);
        if (this.isConnected) {
            try {
                await this.aquaris.writePumpMode(dutyCycle, voltage);
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
