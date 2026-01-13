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

import { Component, EventEmitter, Input, type OnDestroy, type OnInit, Output, ViewChild } from '@angular/core';
// biome-ignore lint: injection token
import {
    type AbstractControl,
    type FormArray,
    FormBuilder,
    FormControl,
    type FormGroup,
    type ValidatorFn,
    Validators,
} from '@angular/forms';
import type { MatInput } from '@angular/material/input';
import { Subscription } from 'rxjs';
import type { IDisplayFreqRes, IDisplayMode } from '../../../common/models/DisplayFreqRes';
import type { IGeneralCPUInfo } from '../../../common/models/ICpuInfos';
import { GridParamsProfileSettings, GridParamsSettings, type IGridParams } from '../../../common/models/IGridParams';
import type { SystemProfileInfo } from '../../../common/models/ISystemProfileInfo';
import type { ITccFanProfile } from '../../../common/models/TccFanTable';
import type { ITccProfile, ITccProfileDisplay } from '../../../common/models/TccProfile';
import type { ITccSettings } from '../../../common/models/TccSettings';
import type { TDPInfo } from '../../../native-lib/TuxedoIOAPI';
// biome-ignore lint: injection token
import { CompatibilityService } from '../compatibility.service';
// biome-ignore lint: injection token
import { ConfigService } from '../config.service';
import { FanCustomChartComponent } from '../fan-custom-chart/fan-custom-chart.component';
// biome-ignore lint: injection token
import { type IStateInfo, StateService } from '../state.service';
// biome-ignore lint: injection token
import { SysFsService } from '../sys-fs.service';
// biome-ignore lint: injection token
import { TccDBusClientService } from '../tcc-dbus-client.service';
// biome-ignore lint: injection token
import { UtilsService } from '../utils.service';

function minControlValidator(comparisonControl: AbstractControl): ValidatorFn {
    return (thisControl: AbstractControl): { min: number; actual: unknown } | null => {
        let errors: { min: number; actual: string } = null;
        if (thisControl.value < comparisonControl.value) {
            errors = { min: comparisonControl.value, actual: thisControl.value };
        }
        return errors;
    };
}

function maxControlValidator(comparisonControl: AbstractControl): ValidatorFn {
    return (thisControl: AbstractControl): { max: number; actual: unknown } | null => {
        let errors: { max: number; actual: string } = null;
        if (thisControl.value > comparisonControl.value) {
            errors = { max: comparisonControl.value, actual: thisControl.value };
        }
        return errors;
    };
}

@Component({
    selector: 'app-profile-details-edit',
    templateUrl: './profile-details-edit.component.html',
    styleUrls: ['./profile-details-edit.component.scss'],
    standalone: false,
})
export class ProfileDetailsEditComponent implements OnInit, OnDestroy {
    public viewProfile: ITccProfile;
    public defaultFanProfiles: ITccFanProfile[];

    @Input()
    public set profile(profile: ITccProfile) {
        this.viewProfile = profile;

        if (profile === undefined) {
            return;
        }

        // Create form group from profile
        if (this.profileFormGroup === undefined) {
            this.profileFormGroup = this.createProfileFormGroup(profile);
        } else {
            this.profileFormGroup.reset(profile);
        }

        if (this.selectStateControl === undefined) {
            this.selectStateControl = new FormControl(this.state.getProfileStates(this.viewProfile.id));
        } else {
            this.selectStateControl.reset(this.state.getProfileStates(this.viewProfile.id));
        }

        this.editProfile = this.config.getCustomProfileById(profile.id) !== undefined;
    }

    @Input()
    public get profileDirty(): boolean {
        return this.profileFormGroup.dirty || this.selectStateControl.dirty;
    }

    @Output() public scrollTo: EventEmitter<number> = new EventEmitter<number>();

    public gridParams: IGridParams = GridParamsSettings;
    public gridParamsProf: IGridParams = GridParamsProfileSettings;

    public selectStateControl: FormControl;
    public profileFormGroup: FormGroup;
    public profileFormProgress: boolean = false;

    private subscriptions: Subscription = new Subscription();
    private fansMinSpeedSubscription: Subscription = new Subscription();
    private fansMaxSpeedSubscription: Subscription = new Subscription();

    private fansOffAvailableSubscription: Subscription = new Subscription();

    public cpuInfo: IGeneralCPUInfo;
    public editProfile: boolean;
    public stateInputArray: IStateInfo[];

    public selectableFrequencies;

    public odmProfileNames: string[] = [];

    public hasDeviceSystemProfileInfo: boolean;
    public deviceSystemProfileInfo: SystemProfileInfo;

    public odmPowerLimitInfos: TDPInfo[] = [];
    public displayModes: IDisplayFreqRes;
    public isX11: number = -1;
    public refreshRate: number;

    private tdpLabels: Map<string, string>;

    public showFanGraphs: boolean = false;
    public showTGPChart: boolean = false;

    public infoTooltipShowDelay: number = 700;

    public fansMinSpeed: number = 0;
    public fansMaxSpeed: number = 100;

    public fansOffAvailable: boolean = true;

    public nvidiaPowerCTRLDefaultPowerLimit: number = 0;
    private nvidiaPowerCTRLMaxPowerLimitEvent: EventEmitter<number> = new EventEmitter();
    private updateTGPChartEvent: EventEmitter<void> = new EventEmitter();
    public nvidiaPowerCTRLMaxPowerLimit: number = 1000;
    public nvidiaPowerCTRLAvailable: boolean = false;
    public isUnsupportedConfigurableTGPDevice: boolean = true;

    public tempCustomFanCurve: ITccFanProfile = undefined;

    public get hasMaxFreqWorkaround(): boolean {
        return this.compat.hasMissingMaxFreqBoostWorkaround;
    }
    public powerLimitSliderIndex: number = undefined;
    public min: (...values: number[]) => number = Math.min;

    @ViewChild('inputName') public inputName: MatInput;

    @ViewChild(FanCustomChartComponent)
    private customChartComponent: FanCustomChartComponent;

    constructor(
        private utils: UtilsService,
        private config: ConfigService,
        private state: StateService,
        private sysfs: SysFsService,
        private fb: FormBuilder,
        private tccDBus: TccDBusClientService,
        public compat: CompatibilityService,
    ) {}

    public ngOnInit(): void {
        // prevents error messages on forced refresh
        this.cpuInfo = {
            availableCores: 0,
            minFreq: 0,
            maxFreq: 0,
            scalingAvailableFrequencies: [],
            scalingAvailableGovernors: [],
            energyPerformanceAvailablePreferences: [],
            reducedAvailableFreq: 0,
            boost: false,
        };
        this.defaultFanProfiles = this.config.getFanProfiles();
        if (this.viewProfile === undefined) {
            return;
        }
        this.subscriptions.add(
            this.sysfs.generalCpuInfo.subscribe((generalCpuInfo: IGeneralCPUInfo): void => {
                // prevents everything from breaking on forced refresh
                if (generalCpuInfo) {
                    this.cpuInfo = generalCpuInfo;
                    this.selectableFrequencies = generalCpuInfo.scalingAvailableFrequencies;
                }
            }),
        );

        this.stateInputArray = this.state.getStateInputs();

        const odmProfileLEDNames: Map<string, string> = new Map();
        odmProfileLEDNames.set('power_save', $localize`:@@odmLEDNone:all LEDs off`);
        odmProfileLEDNames.set('enthusiast', $localize`:@@odmLEDOne:one LED on`);
        odmProfileLEDNames.set('overboost', $localize`:@@odmLEDTwo:two LEDs on`);

        this.hasDeviceSystemProfileInfo = this.compat.getHasSystemProfileInfo();
        this.deviceSystemProfileInfo = this.compat.getSystemProfileInfo();

        this.resetPowerLimitSliderIndex();

        this.subscriptions.add(
            this.tccDBus.odmProfilesAvailable.subscribe((nextAvailableODMProfiles: string[]): void => {
                this.odmProfileNames = nextAvailableODMProfiles;

                this.utils.setODMProfileNames(nextAvailableODMProfiles, this.compat.uwLEDOnlyMode, odmProfileLEDNames);
            }),
        );

        this.fansMinSpeedSubscription.add(
            this.tccDBus.fansMinSpeed.subscribe((fansMinSpeed: number): void => {
                if (fansMinSpeed !== undefined && fansMinSpeed !== -1) {
                    this.fansMinSpeedSubscription.unsubscribe();
                    this.fansMinSpeed = fansMinSpeed;
                    this.clampCurrentMinimumFanSpeedToHWCapabilities();
                }
            }),
        );

        this.fansOffAvailableSubscription.add(
            this.tccDBus.fansOffAvailable.subscribe((fansOffAvailable: boolean): void => {
                if (fansOffAvailable !== undefined) {
                    this.fansOffAvailableSubscription.unsubscribe();
                    this.fansOffAvailable = fansOffAvailable;
                    this.clampCurrentMinimumFanSpeedToHWCapabilities();
                }
            }),
        );
        this.subscriptions.add(
            this.tccDBus.odmPowerLimits.subscribe((nextODMPowerLimits: TDPInfo[]): void => {
                if (JSON.stringify(nextODMPowerLimits) !== JSON.stringify(this.odmPowerLimitInfos)) {
                    this.odmPowerLimitInfos = nextODMPowerLimits;
                }
            }),
        );

        this.subscriptions.add(
            this.tccDBus.displayModes.subscribe((nextdisplayModes: IDisplayFreqRes): void => {
                if (JSON.stringify(nextdisplayModes) !== JSON.stringify(this.displayModes)) {
                    this.displayModes = nextdisplayModes;
                }
                this.overwriteDefaultRefreshRateValue();
            }),
        );

        this.subscriptions.add(
            this.tccDBus.isX11.subscribe((nextIsX11: number): void => {
                if (nextIsX11 !== this.isX11) {
                    this.isX11 = nextIsX11;
                }
            }),
        );

        this.subscriptions.add(
            this.tccDBus.nvidiaPowerCTRLDefaultPowerLimit.subscribe((nextNVIDIAPowerCTRLDefaultPowerLimit) => {
                if (
                    nextNVIDIAPowerCTRLDefaultPowerLimit !== undefined &&
                    nextNVIDIAPowerCTRLDefaultPowerLimit !== this.nvidiaPowerCTRLDefaultPowerLimit
                ) {
                    this.nvidiaPowerCTRLDefaultPowerLimit = nextNVIDIAPowerCTRLDefaultPowerLimit;
                }
            }),
        );

        this.subscriptions.add(
            this.tccDBus.nvidiaPowerCTRLMaxPowerLimit.subscribe((nextNVIDIAPowerCTRLMaxPowerLimit) => {
                if (
                    nextNVIDIAPowerCTRLMaxPowerLimit !== undefined &&
                    nextNVIDIAPowerCTRLMaxPowerLimit !== this.nvidiaPowerCTRLMaxPowerLimit
                ) {
                    this.nvidiaPowerCTRLMaxPowerLimit = nextNVIDIAPowerCTRLMaxPowerLimit;
                }
            }),
        );

        this.subscriptions.add(
            this.tccDBus.nvidiaPowerCTRLAvailable.subscribe((nextNVIDIAPowerCTRLAvailable) => {
                if (nextNVIDIAPowerCTRLAvailable !== this.nvidiaPowerCTRLAvailable) {
                    this.nvidiaPowerCTRLAvailable = nextNVIDIAPowerCTRLAvailable;
                }
            }),
        );

        this.subscriptions.add(
            this.tccDBus.isUnsupportedConfigurableTGPDevice.subscribe((nextIsUnsupportedConfigurableTGPDevice) => {
                if (nextIsUnsupportedConfigurableTGPDevice !== this.isUnsupportedConfigurableTGPDevice) {
                    this.isUnsupportedConfigurableTGPDevice = nextIsUnsupportedConfigurableTGPDevice;
                }
            }),
        );

        this.tdpLabels = new Map();
        this.tdpLabels.set('pl1', $localize`:@@tdpLabelsPL1:Sustained Power Limit (PL1)`);
        this.tdpLabels.set('pl2', $localize`:@@tdpLabelsPL2:Short-term (max. 28 sec) Power Limit (PL2)`);
        this.tdpLabels.set('pl4', $localize`:@@tdpLabelsPL4:Peak (max. 8 sec) Power Limit (PL4)`);
    }

    public resetPowerLimitSliderIndex(): void {
        if (this.hasDeviceSystemProfileInfo) {
            const profileName: string = this.viewProfile?.odmProfile?.name;

            if (!profileName) {
                return;
            }

            for (let i: number = 0; i < this.deviceSystemProfileInfo.pl?.length; i++) {
                if (this.deviceSystemProfileInfo.pl[i].odmName === profileName) {
                    this.powerLimitSliderIndex = i;
                }
            }
        }
    }

    public getPowerLimitToName(name: string): string {
        for (let i: number = 0; i < this.deviceSystemProfileInfo.pl?.length; i++) {
            if (this.deviceSystemProfileInfo.pl[i].odmName === name) {
                return `${this.deviceSystemProfileInfo.pl[i].limit} W`;
            }
        }
    }

    public getODMprofilePowerLimitID(): number {
        let profile: ITccProfile = this.profile;
        let profileName: string = '';
        if (!profile) {
            profile = this.viewProfile;
        }
        if (!profile) {
            profileName = this.profileFormGroup.controls.odmProfile.value;
        } else {
            profileName = profile.odmProfile.name;
        }
        for (let i: number = 0; i < this.deviceSystemProfileInfo.pl?.length; i++) {
            if (this.deviceSystemProfileInfo.pl[i].odmName === profileName) {
                return i;
            }
        }
    }

    public sliderODMProfileChange(index: number): void {
        const profileInfo: string = this.deviceSystemProfileInfo.pl[index].odmName;
        this.profileFormGroup.patchValue({
            odmProfile: { name: profileInfo },
        });
        this.profileFormGroup.markAsDirty();
    }

    private overwriteDefaultRefreshRateValue(): void {
        const displayFormGroupValue: ITccProfileDisplay = this.profileFormGroup.get('display').value;

        if (displayFormGroupValue.refreshRate === -1) {
            // todo: adding variable checks to avoid access error
            const refreshRate: number = this.displayModes.activeMode?.refreshRates[0];

            displayFormGroupValue.refreshRate = refreshRate;
            this.profileFormGroup.patchValue({
                display: displayFormGroupValue,
            });
            this.viewProfile.display = displayFormGroupValue;
            this.refreshRate = refreshRate;
        }
    }

    private clampCurrentMinimumFanSpeedToHWCapabilities(): void {
        if (!this.fansOffAvailable) {
            const minimumFanspeedValue: number = this.profileFormGroup.get('fan.minimumFanspeed').value;
            this.profileFormGroup.patchValue({
                fan: {
                    minimumFanspeed:
                        minimumFanspeedValue < this.fansMinSpeed ? this.fansMinSpeed : minimumFanspeedValue,
                },
            });
            this.viewProfile.fan.minimumFanspeed =
                this.viewProfile.fan.minimumFanspeed < this.fansMinSpeed
                    ? this.fansMinSpeed
                    : this.viewProfile.fan.minimumFanspeed;
        }
    }

    public getStateInputs(): IStateInfo[] {
        return this.state.getStateInputs();
    }

    public getSettings(): ITccSettings {
        return this.config.getSettings();
    }

    public submitFormInput(): void {
        if (this.customChartComponent) {
            const customFanCurveValues: ITccFanProfile = this.customChartComponent.getFanFormGroupValues();
            this.profileFormGroup.get('fan').get('customFanCurve').patchValue(customFanCurveValues);
        }

        this.profileFormProgress = true;
        this.utils.pageDisabled = true;

        const defaultProfile: ITccProfile = this.config.getDefaultValuesProfile();

        if (this.profileFormGroup.valid) {
            const formProfileData: ITccProfile = this.profileFormGroup.value;
            // Note: state selection disabled on profile edit for now
            const newProfileStateAssignments: string[] = this.selectStateControl.value;

            this.config
                .writeProfile(this.viewProfile.id, formProfileData, newProfileStateAssignments)
                .then((success: boolean): void => {
                    if (success) {
                        this.profileFormGroup.markAsPristine();
                        this.selectStateControl.markAsPristine();
                        this.profile = formProfileData;
                        this.state.initializeProfileNames();
                    }
                    this.profileFormProgress = false;
                    this.utils.pageDisabled = false;
                });
        } else {
            this.profileFormProgress = false;
            this.utils.pageDisabled = false;
        }
    }

    public async discardFormInput(): Promise<void> {
        this.profileFormGroup.reset(this.viewProfile);
        this.selectStateControl.reset(this.state.getProfileStates(this.viewProfile.id));
        // Also restore brightness to active profile if applicable
        if (!this.tccDBus.displayBrightnessNotSupportedGnome()) {
            const activeProfile: ITccProfile = this.state.getActiveProfile();
            if (activeProfile.display.useBrightness) {
                this.tccDBus.setDisplayBrightnessGnome(activeProfile.display.brightness);
            }
        }

        if (this.customChartComponent) {
            const customFanCurveValues: ITccFanProfile = this.profileFormGroup.get('fan').get('customFanCurve').value;
            this.customChartComponent.setFanFormGroupValues(customFanCurveValues);
            await this.customChartComponent.updateFanChartDataset();
            this.customChartComponent.updateChart();
        }

        this.overwriteDefaultRefreshRateValue();
        this.tempCustomFanCurve = undefined;

        this.resetPowerLimitSliderIndex();
        this.updateTGPChart();
    }

    public setCustomFanCurve(tempCustomFanCurve: ITccFanProfile): void {
        this.tempCustomFanCurve = tempCustomFanCurve;
    }

    public setChartToggleStatus(status: boolean): void {
        this.showFanGraphs = status;
    }

    private createProfileFormGroup(profile: ITccProfile): FormGroup {
        const displayGroup: FormGroup = this.fb.group(profile.display);
        const cpuGroup: FormGroup = this.fb.group(profile.cpu);
        const webcamGroup: FormGroup = this.fb.group(profile.webcam);
        const fanControlGroup: FormGroup = this.fb.group(profile.fan);
        const odmProfileGroup: FormGroup = this.fb.group(profile.odmProfile);

        const odmTDPValuesArray: FormArray = this.fb.array(
            profile.odmPowerLimits.tdpValues.map((e: number): FormControl => this.fb.control(e)),
        );
        const odmPowerLimits: FormGroup = this.fb.group({
            tdpValues: odmTDPValuesArray,
        });
        const nvidiaPowerCTRLProfileGroup: FormGroup = this.fb.group(profile.nvidiaPowerCTRLProfile);

        cpuGroup.controls.scalingMinFrequency.setValidators([
            maxControlValidator(cpuGroup.controls.scalingMaxFrequency),
        ]);
        cpuGroup.controls.scalingMaxFrequency.setValidators([
            minControlValidator(cpuGroup.controls.scalingMinFrequency),
        ]);

        for (let i: number = 1; i < odmTDPValuesArray.controls?.length; ++i) {
            odmTDPValuesArray.controls[i].setValidators([minControlValidator(odmTDPValuesArray.controls[i - 1])]);
        }

        for (let i: number = 0; i < odmTDPValuesArray.controls?.length - 1; ++i) {
            odmTDPValuesArray.controls[i].setValidators([maxControlValidator(odmTDPValuesArray.controls[i + 1])]);
        }

        const fg: FormGroup = this.fb.group({
            name: profile.name,
            description: profile.description,
            display: displayGroup,
            cpu: cpuGroup,
            webcam: webcamGroup,
            fan: fanControlGroup,
            odmProfile: odmProfileGroup,
            odmPowerLimits: odmPowerLimits,
            nvidiaPowerCTRLProfile: nvidiaPowerCTRLProfileGroup,
        });

        fg.controls.name.setValidators([Validators.required, Validators.minLength(1), Validators.maxLength(50)]);

        return fg;
    }

    public findClosestValue(value: number, array: number[]): number {
        if (array === undefined) {
            return value;
        }

        let closest: number;
        let closestDiff: number;
        for (const arrayNumber of array) {
            const diff: number = Math.abs(value - arrayNumber);
            if (closestDiff === undefined || diff < closestDiff) {
                closest = arrayNumber;
                closestDiff = diff;
            }
        }
        return closest;
    }

    public sliderMinFreqChange(): void {
        const cpuGroup: FormGroup = this.profileFormGroup.controls.cpu as FormGroup;
        let newValue: number = cpuGroup.controls.scalingMinFrequency.value;

        if (newValue > cpuGroup.controls.scalingMaxFrequency.value) {
            newValue = cpuGroup.controls.scalingMaxFrequency.value;
        }

        // If 'scaling_available_frequencies' exist, ensure it's one of them
        if (this.selectableFrequencies !== undefined) {
            const minSelectableFrequencies: number[] = this.selectableFrequencies.filter(
                (value: number): boolean => value <= cpuGroup.controls.scalingMaxFrequency.value,
            );
            newValue = this.findClosestValue(newValue, minSelectableFrequencies);
        }

        if (newValue !== undefined) {
            cpuGroup.controls.scalingMinFrequency.setValue(newValue);
        }
    }

    public sliderMaxFreqChange(): void {
        const cpuGroup: FormGroup = this.profileFormGroup.controls.cpu as FormGroup;
        let newValue: number = cpuGroup.controls.scalingMaxFrequency.value;

        if (newValue < cpuGroup.controls.scalingMinFrequency.value) {
            newValue = cpuGroup.controls.scalingMinFrequency.value;
        }

        // If 'scaling_available_frequencies' exist, ensure it's one of them
        if (this.selectableFrequencies !== undefined) {
            const maxSelectableFrequencies: number[] = this.selectableFrequencies.filter(
                (value: number): boolean => value >= cpuGroup.controls.scalingMinFrequency.value,
            );
            newValue = this.findClosestValue(newValue, maxSelectableFrequencies);
        }

        if (newValue !== undefined) {
            cpuGroup.controls.scalingMaxFrequency.setValue(newValue);
        }
    }

    public sliderMinFanChange(): void {
        const { minimumFanspeed, maximumFanspeed } = this.profileFormGroup.controls.fan.value;

        if (minimumFanspeed > maximumFanspeed) {
            this.profileFormGroup.patchValue({
                fan: { minimumFanspeed: maximumFanspeed },
            });
        }
    }

    public sliderMaxFanChange(): void {
        const { minimumFanspeed, maximumFanspeed } = this.profileFormGroup.controls.fan.value;

        if (maximumFanspeed < minimumFanspeed) {
            this.profileFormGroup.patchValue({
                fan: { maximumFanspeed: minimumFanspeed },
            });
        }
    }

    public get getODMTDPControls(): AbstractControl[] {
        const odmPowerLimits: FormGroup = this.profileFormGroup.controls.odmPowerLimits as FormGroup;
        const tdpValues: FormArray = odmPowerLimits.controls.tdpValues as FormArray;
        return tdpValues.controls;
    }

    public sliderODMPowerLimitMinValue(sliderIndex: number): number {
        const odmPowerLimits: FormGroup = this.profileFormGroup.controls.odmPowerLimits as FormGroup;
        const tdpValues: FormArray = odmPowerLimits.controls.tdpValues as FormArray;

        const minValue: number = this.odmPowerLimitInfos[sliderIndex].min;

        return minValue;
    }

    public sliderODMPowerLimitMaxValue(sliderIndex: number): number {
        const odmPowerLimits: FormGroup = this.profileFormGroup.controls.odmPowerLimits as FormGroup;
        const tdpValues: FormArray = odmPowerLimits.controls.tdpValues as FormArray;

        const maxValue: number = this.odmPowerLimitInfos[sliderIndex].max;

        return maxValue;
    }

    public sliderODMPowerLimitChange(movedSliderIndex: number): void {
        const odmPowerLimits: FormGroup = this.profileFormGroup.controls.odmPowerLimits as FormGroup;
        const tdpValues: FormArray = odmPowerLimits.controls.tdpValues as FormArray;
        let newValue: number = tdpValues.controls[movedSliderIndex].value;

        const minValue: number = this.sliderODMPowerLimitMinValue(movedSliderIndex);
        const maxValue: number = this.sliderODMPowerLimitMaxValue(movedSliderIndex);

        // Ensure new value is above chosen min value
        if (newValue < minValue) {
            newValue = minValue;
        }

        // Adjust lower sliders
        for (let i: number = 0; i < movedSliderIndex; ++i) {
            if (tdpValues.controls[i].value > newValue) {
                tdpValues.controls[i].setValue(newValue);
                tdpValues.controls[i].markAsDirty();
            }
        }

        // Ensure new value is below chosen max value
        if (newValue > maxValue) {
            newValue = maxValue;
        }

        // Adjust higher sliders
        for (let i: number = movedSliderIndex + 1; i < tdpValues.controls?.length; ++i) {
            if (tdpValues.controls[i].value < newValue) {
                tdpValues.controls[i].setValue(newValue);
                tdpValues.controls[i].markAsDirty();
            }
        }

        if (newValue !== undefined) {
            tdpValues.controls[movedSliderIndex].setValue(newValue);

            // Update LED choice (if available) on first TDP change
            // Note: Deactivated update
            const updateLEDChoice: boolean = false && movedSliderIndex === 0 && this.compat.uwLEDOnlyMode;
            // Also make sure three profiles are available
            this.odmProfileNames?.length === 3;

            if (updateLEDChoice) {
                const sliderMax: number = this.odmPowerLimitInfos[movedSliderIndex].max;
                const sliderMin: number = this.odmPowerLimitInfos[movedSliderIndex].min;
                const tdpPercentage: number = Math.round(((newValue - sliderMin) / (sliderMax - sliderMin)) * 100);
                const odmProfileGroup: FormGroup = this.profileFormGroup.controls.odmProfile as FormGroup;
                const profileNameControl: FormControl = odmProfileGroup.controls.name as FormControl;
                if (tdpPercentage < 25) {
                    profileNameControl.setValue(this.odmProfileNames[0]);
                } else if (tdpPercentage < 75) {
                    profileNameControl.setValue(this.odmProfileNames[1]);
                } else {
                    profileNameControl.setValue(this.odmProfileNames[2]);
                }
            }
        }

        for (let i: number = 0; i < tdpValues.controls.length; i++) {
            // to fix bug of not updated validity of middle slider
            tdpValues.controls[i].updateValueAndValidity();

            if (
                this.viewProfile?.odmPowerLimits?.tdpValues !== undefined &&
                tdpValues.controls[i].value === this.viewProfile?.odmPowerLimits?.tdpValues[i]
            ) {
                tdpValues.controls[i].markAsPristine();
            }
        }
    }

    public inputDisplayBrightnessChange(newValue: number): void {
        if (!this.tccDBus.displayBrightnessNotSupportedGnome()) {
            this.tccDBus.setDisplayBrightnessGnome(newValue);
        }
    }

    public inputDisplayBrightnessOffset(slider: FormControl, offset: number): () => void {
        return (): void => {
            let newValue: number = slider.value + offset;
            if (newValue < 0) {
                newValue = 0;
            } else if (newValue > 100) {
                newValue = 100;
            }
            slider.setValue(newValue);
            this.inputDisplayBrightnessChange(newValue);
        };
    }

    public formatCpuFrequency(frequency: number): string {
        return this.utils.formatCpuFrequency(frequency);
    }

    public getFanProfileNames(): string[] {
        return this.defaultFanProfiles.map((fanProfile: ITccFanProfile): string => fanProfile.name);
    }

    public getDisplayModes(): IDisplayMode[] {
        if (!this.displayModes) {
            return undefined;
        }
        return this.displayModes.displayModes;
    }

    public getRefreshRateNotAvailableTooltipText(): string {
        if (this.isX11) {
            return '';
        } else {
            return $localize`:@@ProfMgrRefreshRatesNotAvailableOnWaylandTooltip:This feature is currently not supported on Wayland`;
        }
    }

    public getCurrentResolutionRefreshRates(): number[] {
        const activeMode: IDisplayMode = this.displayModes?.activeMode;
        if (!activeMode || activeMode.xResolution <= 0 || activeMode.yResolution <= 0) {
            return [-1];
        }
        const { xResolution, yResolution } = activeMode;
        const matchingMode: IDisplayMode = this.getMatchingMode(xResolution, yResolution);
        if (!matchingMode) {
            return [-1];
        }
        return matchingMode?.refreshRates.sort((a: number, b: number): number => b - a);
    }

    public roundValue(value: number): number {
        return Math.round(value);
    }

    public roundDownToNearestMultiple(value: number, multiple: number): number {
        return value - (value % multiple);
    }

    private getMatchingMode(xResolution: number, yResolution: number): IDisplayMode | undefined {
        return this.displayModes?.displayModes.find((mode: IDisplayMode): boolean => {
            return mode.xResolution === xResolution && mode.yResolution === yResolution;
        });
    }

    // returns currently active refresh rate
    public getActiveRefreshRate(): number {
        if (!this.displayModes) {
            return undefined;
        }
        return this.displayModes.activeMode?.refreshRates[0];
    }

    public governorSelectionChange(): void {
        // Energy performance preference setting chosen based on governor
        const cpuGroup: FormGroup = this.profileFormGroup.controls.cpu as FormGroup;
        if (cpuGroup.controls.governor.value === 'performance') {
            cpuGroup.controls.energyPerformancePreference.setValue('performance');
        } else {
            cpuGroup.controls.energyPerformancePreference.setValue('power');
        }
    }

    public stateButtonTooltip(stateTooltip: string, stateValue: string): string {
        const strAlreadySet: string = $localize`:@@cProfMgrDetailsStateSelectButtonAlreadySet: (already set)`;
        return stateTooltip + (this.getSettings().stateMap[stateValue] === this.viewProfile.id ? strAlreadySet : '');
    }

    private buttonRepeatTimer: NodeJS.Timeout;
    public buttonRepeatDown(action: () => void): void {
        if (this.buttonRepeatTimer !== undefined) {
            clearInterval(this.buttonRepeatTimer);
        }
        const repeatDelayMS = 200;

        action();

        this.buttonRepeatTimer = setInterval((): void => {
            action();
        }, repeatDelayMS);
    }

    public buttonRepeatUp(): void {
        clearInterval(this.buttonRepeatTimer);
    }

    public modifySliderInput(
        slider: FormControl,
        offset: number,
        min: number,
        max: number,
        updateFunction?: any,
        updateFunctionArg?: any,
    ): () => void {
        return (): void => {
            let newValue: number = slider.value + offset;
            if (newValue < min) {
                newValue = min;
            } else if (newValue > max) {
                newValue = max;
            }
            slider.setValue(newValue);
            slider.markAsDirty();

            if (updateFunction !== undefined) {
                updateFunction.call(this, updateFunctionArg);
            }
        };
    }

    // only for odm slider that use deviceSystemProfileInfo from ISystemProfileInfo
    public modifyDeviceSpecificODMSlider(offset: number): () => void {
        return (): void => {
            const profileName = this.deviceSystemProfileInfo.pl[this.powerLimitSliderIndex].odmName;
            let newIndex: number = undefined;

            for (let i: number = 0; i < this.deviceSystemProfileInfo.pl?.length; i++) {
                if (this.deviceSystemProfileInfo.pl[i].odmName === profileName) {
                    newIndex = i;
                }
            }

            if (newIndex === undefined) {
                return;
            }

            newIndex += offset;
            newIndex = Math.max(0, Math.min(this.deviceSystemProfileInfo.pl?.length - 1, newIndex));

            this.profileFormGroup.patchValue({
                odmProfile: { name: this.deviceSystemProfileInfo.pl[newIndex].odmName },
            });
            this.profileFormGroup.markAsDirty();

            this.powerLimitSliderIndex = newIndex;
        };
    }

    @ViewChild('fancontrolHeader') fancontrolHeaderE;
    public toggleFanGraphs(): void {
        if (!this.showFanGraphs) {
            this.showFanGraphs = true;
            this.scrollTo.emit(this.fancontrolHeaderE.nativeElement.offsetTop - 50);
        } else {
            this.showFanGraphs = false;
        }
    }

    @ViewChild('nvidiaPowerCTRLHeader') nvidiaPowerCTRLHeaderE;
    public toggleTGPChart() {
        this.showTGPChart = !this.showTGPChart;
        if (this.showTGPChart) {
            // The timeout is required here, because this is at the bottom of
            // the page and the scroll needs to happen after the page already
            // got rendered and is already bigger.
            setTimeout(() => this.scrollTo.emit(this.nvidiaPowerCTRLHeaderE.nativeElement.offsetTop - 50), 10);
        }
    }

    public odmTDPLabel(tdpDescriptor: string): string {
        const result: string = this.tdpLabels.get(tdpDescriptor);
        if (result === undefined) {
            return tdpDescriptor;
        } else {
            return result;
        }
    }

    public buttonODMPowerLimitUndo(sliderIndex: number): void {
        const odmPowerLimits: FormGroup = this.profileFormGroup.controls.odmPowerLimits as FormGroup;
        const tdpValues: FormArray = odmPowerLimits.controls.tdpValues as FormArray;
        tdpValues.controls[sliderIndex].reset(this.viewProfile.odmPowerLimits.tdpValues[sliderIndex]);
        const wantedValue: number = tdpValues.controls[sliderIndex].value;
        this.sliderODMPowerLimitChange(sliderIndex);
        const correctedValue: number = tdpValues.controls[sliderIndex].value;
        if (correctedValue !== wantedValue) {
            tdpValues.controls[sliderIndex].markAsDirty();
        }
    }

    public setCustomChartDirty(): void {
        this.profileFormGroup.get('fan').get('customFanCurve').markAsDirty();
    }

    public nvidiaPowerCTRLMaxPowerLimitChange(): void {
        this.nvidiaPowerCTRLMaxPowerLimitEvent.emit(this.nvidiaPowerCTRLMaxPowerLimit);
    }

    public updateTGPChart(): void {
        this.updateTGPChartEvent.emit();
    }

    public ngOnDestroy(): void {
        this.subscriptions.unsubscribe();
        if (!this.fansMinSpeedSubscription.closed) {
            this.fansMinSpeedSubscription.unsubscribe();
        }
        if (!this.fansOffAvailableSubscription.closed) {
            this.fansOffAvailableSubscription.unsubscribe();
        }
    }
}
