/*!
 * Copyright (c) 2019-2022 TUXEDO Computers GmbH <tux@tuxedocomputers.com>
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
import { Component, OnInit, Input, OnDestroy, ViewChild, Output, EventEmitter } from '@angular/core';
import { ITccProfile, TccProfile } from '../../../common/models/TccProfile';
import { UtilsService } from '../utils.service';
import { ITccSettings } from '../../../common/models/TccSettings';
import { ConfigService } from '../config.service';
import { StateService, IStateInfo } from '../state.service';
import { SysFsService, IGeneralCPUInfo } from '../sys-fs.service';
import { Subscription } from 'rxjs';
import { FormGroup, FormBuilder, Validators, FormControl, ValidatorFn, AbstractControl, FormArray } from '@angular/forms';
import { DBusService } from '../dbus.service';
import { MatInput } from '@angular/material/input';
import { CompatibilityService } from '../compatibility.service';
import { TccDBusClientService } from '../tcc-dbus-client.service';
import { TDPInfo } from '../../../native-lib/TuxedoIOAPI';
import { MatTabChangeEvent, MatTabGroup } from '@angular/material/tabs';
import { IDisplayFreqRes, IDisplayMode } from 'src/common/models/DisplayFreqRes';
import { displayPartsToString } from 'typescript';

function minControlValidator(comparisonControl: AbstractControl): ValidatorFn {
    return (thisControl: AbstractControl): { [key: string]: any } | null => {
        let errors = null;
        if (thisControl.value < comparisonControl.value) {
            errors = { min: comparisonControl.value, actual: thisControl.value };
        }
        return errors;
    };
}

function maxControlValidator(comparisonControl: AbstractControl): ValidatorFn {
    return (thisControl: AbstractControl): { [key: string]: any } | null => {
        let errors = null;
        if (thisControl.value > comparisonControl.value) {
            errors = { max: comparisonControl.value, actual: thisControl.value };
        }
        return errors;
    };
}

@Component({
    selector: 'app-profile-details-edit',
    templateUrl: './profile-details-edit.component.html',
    styleUrls: ['./profile-details-edit.component.scss']
})
export class ProfileDetailsEditComponent implements OnInit, OnDestroy {

    public viewProfile: ITccProfile;

    @Input()
    set profile(profile: ITccProfile) {
        this.viewProfile = profile;

        if (profile === undefined) { return; }

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

        this.editProfile = (this.config.getCustomProfileById(profile.id) !== undefined);

        this.setActiveTab();
    }

    @Input()
    get profileDirty(): boolean { return this.profileFormGroup.dirty || this.selectStateControl.dirty; }

    @Output() scrollTo = new EventEmitter<number>();

    public gridParams = {
        cols: 9,
        headerSpan: 4,
        valueSpan: 2,
        inputSpan: 3
    };

    public gridProfileSettings = {
        cols: 9,
        headerSpan: 4,
        valueSpan: 0,
        inputSpan: 5
    };

    public selectStateControl: FormControl;
    public profileFormGroup: FormGroup;
    public profileFormProgress = false;

    private subscriptions: Subscription = new Subscription();
    private fansMinSpeedSubscription: Subscription = new Subscription();
    private fansOffAvailableSubscription: Subscription = new Subscription();
    public cpuInfo: IGeneralCPUInfo;
    public editProfile: boolean;
    public stateInputArray: IStateInfo[];

    public selectableFrequencies;

    public odmProfileNames: string[] = [];
    public odmProfileToName: Map<string, string> = new Map();

    public odmPowerLimitInfos: TDPInfo[] = [];
    public displayModes: IDisplayFreqRes;

    private tdpLabels: Map<string, string>;

    public showFanGraphs = false;

    public showCPUTabsCircles;

    public infoTooltipShowDelay = 700;

    public fansMinSpeed = 0;
    public fansOffAvailable = true;

    public get hasMaxFreqWorkaround() { return this.compat.hasMissingMaxFreqBoostWorkaround; }

    @ViewChild('inputName') inputName: MatInput;

    public selectedCPUTabIndex: number = 0;

    constructor(
        private utils: UtilsService,
        private config: ConfigService,
        private state: StateService,
        private sysfs: SysFsService,
        private fb: FormBuilder,
        private dbus: DBusService,
        private tccDBus: TccDBusClientService,
        public compat: CompatibilityService
    ) { }

    ngOnInit() {
        if (this.viewProfile === undefined) { return; }
        this.subscriptions.add(this.sysfs.generalCpuInfo.subscribe(generalCpuInfo => {
            this.cpuInfo = generalCpuInfo;
            this.selectableFrequencies = generalCpuInfo.scalingAvailableFrequencies;
        }));

        this.stateInputArray = this.state.getStateInputs();

        const odmProfileLEDNames: Map<string, string> = new Map();
        odmProfileLEDNames.set('power_save', $localize `:@@odmLEDNone:all LEDs off`);
        odmProfileLEDNames.set('enthusiast', $localize `:@@odmLEDOne:one LED on`);
        odmProfileLEDNames.set('overboost', $localize `:@@odmLEDTwo:two LEDs on`);

        this.subscriptions.add(this.tccDBus.odmProfilesAvailable.subscribe(nextAvailableODMProfiles => {
            this.odmProfileNames = nextAvailableODMProfiles;

            // Update ODM profile name map
            this.odmProfileToName.clear();
            for (const profileName of this.odmProfileNames) {
                if (profileName.length > 0) {
                    if (this.compat.uwLEDOnlyMode) {
                        this.odmProfileToName.set(profileName, odmProfileLEDNames.get(profileName));
                    } else {
                        this.odmProfileToName.set(profileName, profileName.charAt(0).toUpperCase() + profileName.replace('_', ' ').slice(1));
                    }
                }
            }
        }));

        this.fansMinSpeedSubscription.add(this.tccDBus.fansMinSpeed.subscribe(
            fansMinSpeed => {
                if (fansMinSpeed !== undefined) {
                    this.fansMinSpeedSubscription.unsubscribe();
                    this.fansMinSpeed = fansMinSpeed;
                    this.clampCurrentMinimumFanSpeedToHWCapabilities()
                }
            }
        ));

        this.fansOffAvailableSubscription.add(this.tccDBus.fansOffAvailable.subscribe(
            fansOffAvailable => {
                if (fansOffAvailable != undefined) {
                    this.fansOffAvailableSubscription.unsubscribe();
                    this.fansOffAvailable = fansOffAvailable;
                    this.clampCurrentMinimumFanSpeedToHWCapabilities()
                }
            }
        ));
        this.subscriptions.add(this.tccDBus.odmPowerLimits.subscribe(nextODMPowerLimits => {
            if (JSON.stringify(nextODMPowerLimits) !== JSON.stringify(this.odmPowerLimitInfos)) {
                this.odmPowerLimitInfos = nextODMPowerLimits;
                this.setActiveTab();
            }
        }));

        this.subscriptions.add(this.tccDBus.displayModes.subscribe(nextdisplayModes => {
            if (JSON.stringify(nextdisplayModes) !== JSON.stringify(this.displayModes)) {
                this.displayModes = nextdisplayModes;
            }
        }));

        this.tdpLabels = new Map();
        this.tdpLabels.set('pl1', $localize `:@@tdpLabelsPL1:Sustained Power Limit (PL1)`);
        this.tdpLabels.set('pl2', $localize `:@@tdpLabelsPL2:Short-term (max. 28 sec) Power Limit (PL2)`);
        this.tdpLabels.set('pl4', $localize `:@@tdpLabelsPL4:Peak (max. 8 sec) Power Limit (PL4)`);

        this.showCPUTabsCircles = this.compat.hasODMPowerLimitControl;
    }

    ngOnDestroy() {
        this.subscriptions.unsubscribe();
    }

    private clampCurrentMinimumFanSpeedToHWCapabilities() {
        if (!this.fansOffAvailable) {
            let minimumFanspeedValue = this.profileFormGroup.get('fan.minimumFanspeed').value
            this.profileFormGroup.patchValue({fan: {minimumFanspeed: minimumFanspeedValue < this.fansMinSpeed ? this.fansMinSpeed : minimumFanspeedValue}});
            this.viewProfile.fan.minimumFanspeed = this.viewProfile.fan.minimumFanspeed < this.fansMinSpeed ? this.fansMinSpeed : this.viewProfile.fan.minimumFanspeed;
        }
    }

    public getStateInputs(): IStateInfo[] {
        return this.state.getStateInputs();
    }

    public getSettings(): ITccSettings {
        return this.config.getSettings();
    }

    public submitFormInput() {
        this.profileFormProgress = true;
        this.utils.pageDisabled = true;

        const defaultProfile = this.config.getDefaultValuesProfile();

        // Reset non chosen CPU tab to defaults on save
        if (this.compat.hasODMPowerLimitControl) {
            if (this.selectedCPUTabIndex === 0) {
                this.setFormGroupValue('cpu', defaultProfile.cpu);
            } else if (this.selectedCPUTabIndex === 1) {
                this.setFormGroupValue('odmPowerLimits', defaultProfile.odmPowerLimits);
            }
        }

        if (this.profileFormGroup.valid) {
            const formProfileData: ITccProfile = this.profileFormGroup.value;
            // Note: state selection disabled on profile edit for now
            const newProfileStateAssignments = this.selectStateControl.value;
            this.config.writeProfile(this.viewProfile.id, formProfileData, newProfileStateAssignments).then(success => {
                if (success) {
                    this.profileFormGroup.markAsPristine();
                    this.selectStateControl.markAsPristine();
                    this.profile = formProfileData;
                }
                this.profileFormProgress = false;
                this.utils.pageDisabled = false;
            });
        } else {
            this.profileFormProgress = false;
            this.utils.pageDisabled = false;
        }
    }

    public discardFormInput() {
        this.profileFormGroup.reset(this.viewProfile);
        this.setActiveTab();
        this.selectStateControl.reset(this.state.getProfileStates(this.viewProfile.id));
        // Also restore brightness to active profile if applicable
        if (!this.dbus.displayBrightnessNotSupported) {
            const activeProfile = this.state.getActiveProfile();
            if (activeProfile.display.useBrightness) {
                this.dbus.setDisplayBrightness(activeProfile.display.brightness);
            }
        }
    }

    private createProfileFormGroup(profile: ITccProfile) {

        const displayGroup: FormGroup = this.fb.group(profile.display);
        const cpuGroup: FormGroup = this.fb.group(profile.cpu);
        const webcamGroup: FormGroup = this.fb.group(profile.webcam);
        const fanControlGroup: FormGroup = this.fb.group(profile.fan);
        const odmProfileGroup: FormGroup = this.fb.group(profile.odmProfile);

        const odmTDPValuesArray: FormArray = this.fb.array(profile.odmPowerLimits.tdpValues.map(e => this.fb.control(e)));
        const odmPowerLimits: FormGroup = this.fb.group({
            tdpValues: odmTDPValuesArray
        });

        cpuGroup.controls.scalingMinFrequency.setValidators([maxControlValidator(cpuGroup.controls.scalingMaxFrequency)]);
        cpuGroup.controls.scalingMaxFrequency.setValidators([minControlValidator(cpuGroup.controls.scalingMinFrequency)]);

        for (let i = 1; i < odmTDPValuesArray.controls.length; ++i) {
            odmTDPValuesArray.controls[i].setValidators([minControlValidator(odmTDPValuesArray.controls[i - 1])]);
        }

        for (let i = 0; i < odmTDPValuesArray.controls.length - 1; ++i) {
            odmTDPValuesArray.controls[i].setValidators([maxControlValidator(odmTDPValuesArray.controls[i + 1])]);
        }

        const fg = this.fb.group({
            name: profile.name,
            description: profile.description,
            display: displayGroup,
            cpu: cpuGroup,
            webcam: webcamGroup,
            fan: fanControlGroup,
            odmProfile: odmProfileGroup,
            odmPowerLimits: odmPowerLimits
        });

        fg.controls.name.setValidators([Validators.required, Validators.minLength(1), Validators.maxLength(50)]);

        return fg;
    }

    public findClosestValue(value: number, array: number[]): number {
        if (array === undefined) { return value; }

        let closest: number;
        let closestDiff: number;
        for (const arrayNumber of array) {
            const diff = Math.abs(value - arrayNumber);
            if (closestDiff === undefined || diff < closestDiff) {
                closest = arrayNumber;
                closestDiff = diff;
            }
        }
        return closest;
    }

    public sliderMinFreqChange() {
        const cpuGroup: FormGroup = this.profileFormGroup.controls.cpu as FormGroup;
        let newValue: number = cpuGroup.controls.scalingMinFrequency.value;

        // Ensure it's below chosen max value
        if (newValue > cpuGroup.controls.scalingMaxFrequency.value) {
            newValue = cpuGroup.controls.scalingMaxFrequency.value;
        }

        // If 'scaling_available_frequencies' exist, ensure it's one of them
        if (this.selectableFrequencies !== undefined) {
            const minSelectableFrequencies = this.selectableFrequencies.filter(value => value <= cpuGroup.controls.scalingMaxFrequency.value);
            newValue = this.findClosestValue(newValue, minSelectableFrequencies);
        }

        if (newValue !== undefined) {
            cpuGroup.controls.scalingMinFrequency.setValue(newValue);
        }
    }

    public sliderMaxFreqChange() {
        const cpuGroup: FormGroup = this.profileFormGroup.controls.cpu as FormGroup;
        let newValue: number = cpuGroup.controls.scalingMaxFrequency.value;

        // Ensure it's above chosen min value
        if (newValue < cpuGroup.controls.scalingMinFrequency.value) {
            newValue = cpuGroup.controls.scalingMinFrequency.value;
        }

        // If 'scaling_available_frequencies' exist, ensure it's one of them
        if (this.selectableFrequencies !== undefined) {
            const maxSelectableFrequencies = this.selectableFrequencies.filter(value => value >= cpuGroup.controls.scalingMinFrequency.value);
            newValue = this.findClosestValue(newValue, maxSelectableFrequencies);
        }

        if (newValue !== undefined) {
            cpuGroup.controls.scalingMaxFrequency.setValue(newValue);
        }
    }

    get getODMTDPControls() {
        const odmPowerLimits: FormGroup = this.profileFormGroup.controls.odmPowerLimits as FormGroup;
        const tdpValues: FormArray = odmPowerLimits.controls.tdpValues as FormArray;
        return tdpValues.controls;
    }

    public sliderODMPowerLimitMinValue(sliderIndex: number): number {
        const odmPowerLimits: FormGroup = this.profileFormGroup.controls.odmPowerLimits as FormGroup;
        const tdpValues: FormArray = odmPowerLimits.controls.tdpValues as FormArray;

        // Find largest allowed min value
        let minValue = this.odmPowerLimitInfos[sliderIndex].min;

        for (let i = 0; i < sliderIndex; ++i) {
            if (minValue === undefined || tdpValues.controls[i].value > minValue) {
                minValue = tdpValues.controls[i].value;
            }
        }

        return minValue;
    }

    public sliderODMPowerLimitMaxValue(sliderIndex: number): number {
        const odmPowerLimits: FormGroup = this.profileFormGroup.controls.odmPowerLimits as FormGroup;
        const tdpValues: FormArray = odmPowerLimits.controls.tdpValues as FormArray;

        // Find smallest allowed max value
        let maxValue = this.odmPowerLimitInfos[sliderIndex].max;

        for (let i = sliderIndex + 1; i < tdpValues.controls.length; ++i) {
            if (maxValue === undefined || tdpValues.controls[i].value < maxValue) {
                maxValue = tdpValues.controls[i].value;
            }
        }

        return maxValue;
    }

    public sliderODMPowerLimitChange(movedSliderIndex: number) {
        const odmPowerLimits: FormGroup = this.profileFormGroup.controls.odmPowerLimits as FormGroup;
        const tdpValues: FormArray = odmPowerLimits.controls.tdpValues as FormArray;
        let newValue: number = tdpValues.controls[movedSliderIndex].value;


        let minValue = this.sliderODMPowerLimitMinValue(movedSliderIndex);
        let maxValue = this.sliderODMPowerLimitMaxValue(movedSliderIndex);

        // Ensure new value is above chosen min value
        if (newValue < minValue) {
            newValue = minValue;
        }

        // Ensure new value is below chosen max value
        if (newValue > maxValue) {
            newValue = maxValue;
        }

        if (newValue !== undefined) {
            tdpValues.controls[movedSliderIndex].setValue(newValue);

            // Update LED choice (if available) on first TDP change
            // Note: Deactivated update
            const updateLEDChoice = false &&
                movedSliderIndex === 0 &&
                this.compat.uwLEDOnlyMode
                // Also make sure three profiles are available
                this.odmProfileNames.length === 3;

            if (updateLEDChoice) {
                const sliderMax = this.odmPowerLimitInfos[movedSliderIndex].max;
                const sliderMin = this.odmPowerLimitInfos[movedSliderIndex].min;
                const tdpPercentage = Math.round((newValue - sliderMin) / (sliderMax - sliderMin) * 100);
                const odmProfileGroup: FormGroup = this.profileFormGroup.controls.odmProfile as FormGroup;
                const profileNameControl: FormControl = odmProfileGroup.controls.name as FormControl;
                if (tdpPercentage < 25) {
                    profileNameControl.setValue(this.odmProfileNames[0]);
                } else if ( tdpPercentage < 75) {
                    profileNameControl.setValue(this.odmProfileNames[1]);
                } else {
                    profileNameControl.setValue(this.odmProfileNames[2]);
                }
            }
        }

    }

    public inputDisplayBrightnessChange(newValue: number) {
        if (!this.dbus.displayBrightnessNotSupported) {
            this.dbus.setDisplayBrightness(newValue);
        }
    }

    public inputDisplayBrightnessOffsetFunc(slider, offset: number) {
        return () => {
            let newValue = slider.value + offset;
            if (newValue < 0) {
                newValue = 0;
            } else if (newValue > 100) {
                newValue = 100;
            }
            slider.setValue(newValue);
            this.inputDisplayBrightnessChange(newValue);
        }
    }

    public formatFrequency(frequency: number): string {
        return this.utils.formatFrequency(frequency);
    }

    public getFanProfileNames(): string[] {
        return this.config.getFanProfiles().map(fanProfile => fanProfile.name);
    }

    public getActiveDisplayModeRate(): number
    {
        if(this.displayModes != undefined)   
       {
        return this.displayModes.activeMode.refreshRates[0];
       } 
       else
       {
        return 0;
       }
    }

    public getDisplayModesString(): string[]
    {
        let displayModesString = [];
        let displayModes = this.getDisplayModes();
        for (let i = 0; i < displayModes.length; i++)
        {
            displayModesString.push("" + displayModes[i].xResolution + "x" + displayModes[i].yResolution);
        }
        return displayModesString;
    }

    public getActiveDisplayModeString(): string
    {
        if(this.displayModes != undefined)   
       {
        return "" + this.displayModes.activeMode.xResolution + "x" + this.displayModes.activeMode.yResolution;
       } 
       else
       {
        return "";
       }
    }

    public getDisplayModes(): IDisplayMode[]
    {
        return this.displayModes.displayModes;
    }

    public getRefreshRates(): number[]
    {
        for (let i = 0; i < this.displayModes.displayModes.length; i++)
        {
            let mode = this.displayModes.displayModes[i];
            if (mode.xResolution === this.displayModes.activeMode.xResolution && mode.yResolution === this.displayModes.activeMode.yResolution)
            {
                return mode.refreshRates;
            }
        }
    }

    public governorSelectionChange() {
        // Energy performance preference setting chosen based on governor
        const cpuGroup: FormGroup = this.profileFormGroup.controls.cpu as FormGroup;
        if (cpuGroup.controls.governor.value === 'performance') {
            cpuGroup.controls.energyPerformancePreference.setValue('performance');
        } else {
            cpuGroup.controls.energyPerformancePreference.setValue('power');
        }
    }

    public stateButtonTooltip(stateTooltip: string, stateValue: string): string {
        const strAlreadySet = $localize `:@@cProfMgrDetailsStateSelectButtonAlreadySet: (already set)`;
        return stateTooltip + (this.getSettings().stateMap[stateValue] === this.viewProfile.id ? strAlreadySet : '');
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

    public modifySliderInputFunc(slider, offset: number, min: number, max: number) {
        return () => {
            this.modifySliderInput(slider, offset, min, max);
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

    @ViewChild('fancontrolHeader') fancontrolHeaderE;
    public toggleFanGraphs() {
        if (!this.showFanGraphs) {
            this.showFanGraphs = true;
            this.scrollTo.emit(this.fancontrolHeaderE.nativeElement.offsetTop - 50);
        } else {
            this.showFanGraphs = false;
        }
    }

    public odmTDPLabel(tdpDescriptor: string) {
        const result = this.tdpLabels.get(tdpDescriptor);
        if (result === undefined) {
            return tdpDescriptor;
        } else {
            return result;
        }
    }

    public buttonODMPowerLimitUndo(sliderIndex: number) {
        const odmPowerLimits: FormGroup = this.profileFormGroup.controls.odmPowerLimits as FormGroup;
        const tdpValues: FormArray = odmPowerLimits.controls.tdpValues as FormArray;
        tdpValues.controls[sliderIndex].reset(this.viewProfile.odmPowerLimits.tdpValues[sliderIndex]);
        const wantedValue = tdpValues.controls[sliderIndex].value;
        this.sliderODMPowerLimitChange(sliderIndex);
        const correctedValue = tdpValues.controls[sliderIndex].value;
        if (correctedValue !== wantedValue) {
            tdpValues.controls[sliderIndex].markAsDirty();
        }
    }

    private setFormGroupValue(groupName, value): boolean {
        let valueChanged = false;
        if (JSON.stringify(value) !== JSON.stringify(this.viewProfile[groupName])) {
            valueChanged = true;
        }
        this.profileFormGroup.get(groupName).setValue(value);
        if (valueChanged) {
            this.profileFormGroup.get(groupName).markAsDirty();
        }
        return valueChanged;
    }

    @ViewChild('cpuSettingsTabGroup', { static: false }) cpuTabGroup: MatTabGroup;
    public setActiveTab(index?: number) {
        const defaultProfile = this.config.getDefaultValuesProfile();
        const powerNotDefault = JSON.stringify(this.viewProfile.odmPowerLimits) !== JSON.stringify(defaultProfile.odmPowerLimits);
        const cpufreqNotDefault = JSON.stringify(this.viewProfile.cpu) !== JSON.stringify(defaultProfile.cpu);

        const INDEX_ODMCPUTDP = 0;
        const INDEX_CPUFREQ = 1;

        // Choose either index automatically or manually selectd
        if (index !== undefined) {
            this.selectedCPUTabIndex = index;
        } else if (powerNotDefault) {
            this.selectedCPUTabIndex = INDEX_ODMCPUTDP;
        } else if (cpufreqNotDefault) {
            this.selectedCPUTabIndex = INDEX_CPUFREQ;
        } else {
            this.selectedCPUTabIndex = 0;
        }

        // Reset not chosen tab to default
        const resetNonChosenTabWhenNotSelected = false;
        if (resetNonChosenTabWhenNotSelected) {
            if (this.selectedCPUTabIndex === INDEX_ODMCPUTDP) {
                this.setFormGroupValue('cpu', defaultProfile.cpu);
            } else if (this.selectedCPUTabIndex === INDEX_CPUFREQ) {
                this.setFormGroupValue('odmPowerLimits', defaultProfile.odmPowerLimits);
            }
        }
    }

    public tabChange(event: MatTabChangeEvent) {
        this.setActiveTab(event.index);
    }
}
