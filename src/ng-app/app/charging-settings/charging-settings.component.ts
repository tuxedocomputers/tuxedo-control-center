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

import { Component, EventEmitter, OnDestroy, OnInit, Output } from "@angular/core";
import { UtilsService } from "../utils.service";
import { FormControl } from "@angular/forms";
import { MatCheckboxChange } from "@angular/material/checkbox";
import { ChargeType } from "src/common/classes/PowerSupplyController";
import { MatRadioChange } from "@angular/material/radio";
import { GridParamsSettings, IGridParams } from "src/common/models/IGridParams";
import { ConfirmDialogData } from "../dialog-confirm/dialog-confirm.component";

class ThresholdPresets {
    constructor(
        public start: number,
        public end: number,
    ) {}
}

enum BatteryThresholdOptions {
    HighCapacity = 'high_capacity',
    Balanced = 'balanced',
    Stationary = 'stationary',
    Custom = 'custom',
}

@Component({
    selector: 'app-charging-settings',
    templateUrl: './charging-settings.component.html',
    styleUrls: ['./charging-settings.component.scss'],
    standalone: false
})
export class ChargingSettingsComponent implements OnInit, OnDestroy {

    @Output() hasFeature: EventEmitter<boolean> = new EventEmitter<boolean>();

    public chargingPriosAvailable: string[] = [];
    public chargingProfilesAvailable: string[] = [];

    public currentChargingProfile: string = '';
    public currentChargingPriority: string = '';

    public chargingProfileProgress: boolean = false;
    public chargingPriorityProgress: boolean = false;

    public chargeStartAvailableThresholds: number[] = [];
    public chargeEndAvailableThresholds: number[] = [];
    public chargeStartThreshold: number;
    public chargeEndThreshold: number;
    public setChargeStartThreshold: number;
    public setChargeEndThreshold: number;

    public chargeType: string;
    public chargeThresholdsEnabled: boolean = false;

    public ctrlChargeStartThreshold: FormControl = new FormControl(null);
    public ctrlChargeEndThreshold: FormControl = new FormControl(null);
    public ctrlEnableThresholds: FormControl = new FormControl(null);
    public ctrlChargingThresholdGroup: FormControl = new FormControl(null);
    public chargingThresholdsProgress: boolean = false;
    public thresholdPresets: Map<String, ThresholdPresets> = new Map<String, ThresholdPresets>();

    private updateInterval: number = 1000;
    private timeout;

    public gridParams: IGridParams = GridParamsSettings;


    public chargingProfileLabels: Map<string, string> = new Map();
    public chargingProfileDescriptions: Map<string, string> = new Map();
    public chargingPriorityLabels: Map<string, string> = new Map();
    public chargingPriorityDescriptions: Map<string, string> = new Map();


    constructor(
        private utils: UtilsService
    ) {
        this.chargingProfileLabels.set('high_capacity', $localize `:@@chargingProfileHighCapacityLabel:Full capacity`);
        this.chargingProfileLabels.set('balanced', $localize `:@@chargingProfileBalancedLabel:Reduced capacity`);
        this.chargingProfileLabels.set('stationary', $localize `:@@chargingProfileStationaryLabel:Stationary use`);

        this.chargingProfileDescriptions.set('high_capacity', $localize `:@@chargingProfileHighCapacityDescription:This is the default setting. Fastest charging speed and 100% battery capacity for best possible runtimes.`);
        this.chargingProfileDescriptions.set('balanced', $localize `:@@chargingProfileBalancedDescription:Reduced charging speed and battery capacity (~90 %) for better battery lifespan.`);
        this.chargingProfileDescriptions.set('stationary', $localize `:@@chargingProfileStationaryDescription:Very significant reduced charging speed and battery capacity (~80 %) for best possible battery lifespan. This is recommended if you use your TUXEDO almost only stationary connected to a wall outlet.`);

        this.chargingPriorityLabels.set('charge_battery', $localize `:@@chargingPriorityChargeBatteryLabel:Priorize battery charging speed`);
        this.chargingPriorityLabels.set('performance', $localize `:@@chargingPriorityPerformanceLabel:Priorize performance`);

        this.chargingPriorityDescriptions.set('charge_battery', $localize `:@@chargingPriorityChargeBatteryDescription:Fast battery charging is priorized at the expense of system performance. Once the battery is charged, full performance is available.`);
        this.chargingPriorityDescriptions.set('performance', $localize `:@@chargingPriorityPerformanceDescription:Performance is priorized over battery charging speed. Under high system load charging speed is reduced for best performance. At low loads full charging speed is available.`);

        this.thresholdPresets.set(BatteryThresholdOptions.Balanced, new ThresholdPresets(60, 90));
        this.thresholdPresets.set(BatteryThresholdOptions.Stationary, new ThresholdPresets(40, 80));
    }

    public async ngOnInit(): Promise<void> {
        await this.readAvailableSettings();

        const featureAvailable: boolean =
            (this.chargingPriosAvailable?.length > 0 || this.chargingProfilesAvailable?.length > 0) ||
            (this.chargeStartAvailableThresholds?.length > 0 || this.chargeEndAvailableThresholds?.length > 0);

        if (featureAvailable) {
            this.hasFeature.emit(true);
        }
    }

    public ngOnDestroy(): void {
        if (this.timeout !== undefined) {
            clearInterval(this.timeout);
        }
    }

    public async readAvailableSettings(resetControls: boolean = false): Promise<boolean> {

        this.chargingProfilesAvailable = await window.dbusAPI.getChargingProfilesAvailable();
        this.currentChargingProfile = await window.dbusAPI.getCurrentChargingProfile();

        this.chargingPriosAvailable = await window.dbusAPI.getChargingPrioritiesAvailable();
        this.currentChargingPriority = await window.dbusAPI.getCurrentChargingPriority();

        this.chargeStartAvailableThresholds = await window.dbusAPI.getChargeStartAvailableThresholds();
        this.chargeEndAvailableThresholds = await window.dbusAPI.getChargeEndAvailableThresholds();
        this.chargeStartThreshold = await window.dbusAPI.getChargeStartThreshold();
        this.chargeEndThreshold = await window.dbusAPI.getChargeEndThreshold();
        this.chargeType = await window.dbusAPI.getChargeType();
        this.chargeThresholdsEnabled = this.chargeType === ChargeType.Custom;

        if (this.ctrlEnableThresholds.value === null || resetControls) {
            this.ctrlEnableThresholds.setValue(this.chargeThresholdsEnabled);
        }
        if (this.ctrlChargeEndThreshold.value === null || resetControls) {
            this.ctrlChargeEndThreshold.setValue(this.chargeEndThreshold);
        }
        if (this.ctrlChargeStartThreshold.value === null || resetControls) {
            this.ctrlChargeStartThreshold.setValue(this.chargeStartThreshold);
        }
        if (this.ctrlChargingThresholdGroup.value === null || resetControls) {
            this.ctrlChargingThresholdGroup.setValue(this.getThresholdOptionFromData())
        }

        return true;
    }

    private getThresholdOptionFromData(): BatteryThresholdOptions {
        let thresholdOption: BatteryThresholdOptions;
        if (!this.chargeThresholdsEnabled) {
            thresholdOption = BatteryThresholdOptions.HighCapacity;
        } else if (this.chargeStartThreshold === this.thresholdPresets.get(BatteryThresholdOptions.Balanced).start &&
                   this.chargeEndThreshold === this.thresholdPresets.get(BatteryThresholdOptions.Balanced).end) {
            thresholdOption = BatteryThresholdOptions.Balanced;
        } else if (this.chargeStartThreshold === this.thresholdPresets.get(BatteryThresholdOptions.Stationary).start &&
                   this.chargeEndThreshold === this.thresholdPresets.get(BatteryThresholdOptions.Stationary).end) {
            thresholdOption = BatteryThresholdOptions.Stationary;
        } else {
            thresholdOption = BatteryThresholdOptions.Custom;
        }

        return thresholdOption;
    }

    public async setChargingProfile(chargingProfileDescriptor: string): Promise<boolean> {
        this.chargingProfileProgress = true;
        const result: boolean = await window.dbusAPI.setChargingProfile(chargingProfileDescriptor);
        await this.readAvailableSettings();
        this.chargingProfileProgress = false;

        return result;
    }

    public async setChargingPriority(chargingPriorityDescriptor: string): Promise<boolean> {
        this.chargingPriorityProgress = true;
        const result: boolean = await window.dbusAPI.setChargingPriority(chargingPriorityDescriptor);
        await this.readAvailableSettings();
        this.chargingPriorityProgress = false;

        return result;
    }
    
    public findClosest(value: number, arr: number[]): number {
        if (!arr || arr?.length === 0) {
            return 0;
        }

        let closest: number = arr[0];
        for (let i: number = 1; i < arr?.length; ++i) {
            if (Math.abs(arr[i] - value) < Math.abs(closest - value)) {
                closest = arr[i];
            }
        }        return closest;
    }

    public async thresholdChange(): Promise<void> {
        if (this.chargeStartThreshold >= this.chargeEndThreshold) {
            const config: ConfirmDialogData = {
                // todo: translation
                title: "Invalid configuration",
                description: "To proceed, ensure the end threshold is higher than the start threshold.",
                buttonConfirmLabel: $localize`:@@dialogContinue:Continue`,
            };
            await this.utils.confirmDialog(config);
            return;
        }
        
        this.setChargeStartThreshold = this.chargeStartThreshold
        this.setChargeEndThreshold = this.chargeEndThreshold
        
        await window.dbusAPI.setChargeStartThreshold(this.chargeStartThreshold);
        await window.dbusAPI.setChargeEndThreshold(this.chargeEndThreshold);
        await this.readAvailableSettings(true);
        
        if (this.chargeStartThreshold !== this.setChargeStartThreshold ||
            this.chargeEndThreshold !== this.setChargeEndThreshold) {
            const config: ConfirmDialogData = {
                // todo: translation
                title: "Error",
                description: "The start and end battery thresholds did not apply correctly. Please try again.",
                buttonConfirmLabel: $localize`:@@dialogContinue:Continue`,
            };
            await this.utils.confirmDialog(config);
            return;
        }

        const config: ConfirmDialogData = {
            // todo: translation
            title: "Success",
            description: "The start and end battery thresholds have been updated.",
            buttonConfirmLabel: $localize`:@@dialogContinue:Continue`,
        };
        await this.utils.confirmDialog(config);
    }
    
    public async checkboxEnableThresholdsChange(changeEvent: MatCheckboxChange): Promise<void> {
        this.chargingThresholdsProgress = true;

        let nextChargeType: ChargeType;
        if (changeEvent.checked) {
            nextChargeType = ChargeType.Custom;
        } else {
            nextChargeType = ChargeType.Standard;
        }

        await window.dbusAPI.setChargeType(nextChargeType);
        await this.readAvailableSettings(true);
        this.chargingThresholdsProgress = false;
    }

    public async thresholdRadioGroupChange(event: MatRadioChange): Promise<void> {

        this.chargingThresholdsProgress = true;

        if (event.value === BatteryThresholdOptions.HighCapacity) {
            await window.dbusAPI.setChargeType(ChargeType.Standard);
        } else if (event.value === BatteryThresholdOptions.Balanced) {
            await window.dbusAPI.setChargeType(ChargeType.Custom);
            await window.dbusAPI.setChargeEndThreshold(this.thresholdPresets.get(BatteryThresholdOptions.Balanced).end);
            await window.dbusAPI.setChargeStartThreshold(this.thresholdPresets.get(BatteryThresholdOptions.Balanced).start);
        } else if (event.value === BatteryThresholdOptions.Stationary) {
            await window.dbusAPI.setChargeType(ChargeType.Custom);
            await window.dbusAPI.setChargeEndThreshold(this.thresholdPresets.get(BatteryThresholdOptions.Stationary).end);
            await window.dbusAPI.setChargeStartThreshold(this.thresholdPresets.get(BatteryThresholdOptions.Stationary).start);
        } else if (event.value === BatteryThresholdOptions.Custom) {
            await window.dbusAPI.setChargeType(ChargeType.Custom);
        }

        await this.readAvailableSettings();
        this.chargingThresholdsProgress = false;
    }
}
