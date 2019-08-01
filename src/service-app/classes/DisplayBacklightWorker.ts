import { DaemonWorker } from './DaemonWorker';
import { DisplayBacklightController } from '../../common/classes/DisplayBacklightController';

import * as path from 'path';
import { TuxedoControlCenterDaemon } from './TuxedoControlCenterDaemon';

export class DisplayBacklightWorker extends DaemonWorker {

    private controllers: DisplayBacklightController[] = [];
    private basePath = '/sys/class/backlight';

    constructor(tccd: TuxedoControlCenterDaemon) {
        super(3000, tccd);
    }

    public onStart(): void {
        // Find drivers
        const displayDrivers = DisplayBacklightController.getDeviceList(this.basePath);
        displayDrivers.forEach((driverName) => {
            this.controllers.push(new DisplayBacklightController(path.join(this.basePath, driverName)));
        });

        const currentProfile = this.tccd.getCurrentProfile();
        // Try all possible drivers to be on the safe side, fail silently if they do not work
        this.controllers.forEach((controller) => {
            let setScreenBrightness: number;
            try {
                if (!currentProfile.display.useBrightness || currentProfile.display.brightness === undefined) {
                    if (this.tccd.settings.lastBrightnessDisplay === undefined) {
                        setScreenBrightness = controller.maxBrightness.readValue();
                    } else {
                        setScreenBrightness = this.tccd.settings.lastBrightnessDisplay;
                    }
                } else {
                    setScreenBrightness = Math.round((currentProfile.display.brightness * controller.maxBrightness.readValue()) / 100);
                }
                controller.brightness.writeValue(setScreenBrightness);
                this.tccd.logLine('Set display brightness ' + setScreenBrightness + ' on ' + controller.basePath);
            } catch (err) {
                this.tccd.logLine('Failed to set display brightness ' + setScreenBrightness + ' on ' + controller.basePath);
            }
        });
    }

    public onWork(): void {
        // Possibly save brightness regularly
    }

    public onExit(): void {
        this.controllers.forEach((controller) => {
            let value: number;
            let maxBrightness: number;
            try {
                value = controller.brightness.readValue();
                maxBrightness = controller.maxBrightness.readValue();
                this.tccd.logLine('Saved display brightness on exit');
            } catch (err) {
                this.tccd.logLine('Failed to save display brightness on exit from ' + controller.basePath);
            }
            if (value !== undefined) {
                this.tccd.settings.lastBrightnessDisplay = Math.round((value * 100) / maxBrightness);
            }
        });
    }

}
