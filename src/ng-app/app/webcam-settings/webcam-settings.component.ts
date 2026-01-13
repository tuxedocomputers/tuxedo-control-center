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

import { Component, type OnInit } from '@angular/core';
import { type AbstractControl, FormControl, FormGroup, type ValidationErrors, type ValidatorFn } from '@angular/forms';
import { MatOptionSelectionChange } from '@angular/material/core';
import type { MatTab } from '@angular/material/tabs';
import { Mutex } from 'async-mutex';
import { TccPaths } from '../../../common/classes/TccPaths';
import { GridParamsSettings, type IGridParams } from '../../../common/models/IGridParams';
import type {
    WebcamConstraints,
    WebcamDevice,
    WebcamDeviceInformation,
    WebcamPath,
    WebcamPreset,
    WebcamPresetValues,
} from '../../../common/models/TccWebcamSettings';
import { environment } from '../../environments/environment';
import type { ChoiceDialogData, ConfirmChoiceResult } from '../dialog-choice/dialog-choice.component';
import type { ConfirmDialogData, ConfirmDialogResult } from '../dialog-confirm/dialog-confirm.component';
import type { InputDialogData } from '../dialog-input-text/dialog-input-text.component';
// biome-ignore lint: injection token
import { UtilsService } from '../utils.service';
// biome-ignore lint: injection token
import { WebcamSettingsGuard } from '../webcam.guard';
// biome-ignore lint: injection token
import { WebcamService } from '../webcam.service';

// todo: move dialog functions into a new file
@Component({
    selector: 'app-webcam-settings',
    templateUrl: './webcam-settings.component.html',
    styleUrls: ['./webcam-settings.component.scss'],
    standalone: false,
})
export class WebcamSettingsComponent implements OnInit {
    public gridParams: IGridParams = GridParamsSettings;

    public video: HTMLVideoElement;

    private timer: NodeJS.Timeout = null;
    private mutex: Mutex = new Mutex();

    public spinnerActive: boolean = false;
    public webcamDropdownData: WebcamDevice[] = [];
    public webcamInitComplete: boolean = false;
    private webcamPresetsOtherDevices: WebcamPreset[] = [];
    private webcamPresetsCurrentDevice: WebcamPreset[] = [];
    public webcamCategories: string[] = [];

    private allPresetData: WebcamPreset[] = [];
    private defaultPreset: WebcamPreset;
    public selectedPreset: WebcamPreset;

    private defaultSettings: WebcamPresetValues;
    public viewWebcam: WebcamPresetValues = {};
    public noWebcams: boolean = false;

    private activePreset: WebcamPreset;

    public easyOptions: string[] = ['brightness', 'contrast', 'resolution'];
    public easyModeActive: boolean = true;

    public selectedModeTabIndex: string = 'Simple';

    private v4l2Renames: string[][];

    private warnedOnceWebcamAccessError: boolean = false;

    constructor(
        private utils: UtilsService,
        private webcamGuard: WebcamSettingsGuard,
        public webcamService: WebcamService,
    ) {}

    public set selectedWebcam(selectedWebcam: WebcamDevice) {
        this.webcamService.setSelectedWebcam(selectedWebcam);
    }

    public get selectedWebcam(): WebcamDevice {
        return this.webcamService.getSelectedWebcam();
    }

    public set webcamFormGroup(webcamFormGroup: FormGroup<{}>) {
        this.webcamService.setWebcamFormGroup(webcamFormGroup);
    }

    public get webcamFormGroup(): FormGroup<{}> {
        return this.webcamService.getWebcamFormGroup();
    }

    public get mediaStream(): MediaStream {
        return this.webcamService.getMediaStream();
    }

    public set presetSettings(presetSettings: WebcamDeviceInformation[]) {
        this.webcamService.setPresetSettings(presetSettings);
    }
    public get presetSettings(): WebcamDeviceInformation[] {
        return this.webcamService.getPresetSettings();
    }

    public get getWebcamSettingNames(): string[] {
        return Object.keys(this.webcamFormGroup.getRawValue());
    }

    public async ngOnInit(): Promise<void> {
        const video = document.getElementById('video');

        if (video instanceof HTMLVideoElement) {
            this.video = video;
        }

        this.webcamGuard.setLoadingStatus(true);
        // register callback for IPC signal from main
        window.webcam.onApplyControls(async (): Promise<void> => {
            await this.executeWebcamCtrlsList(this.webcamFormGroup.getRawValue());
        });

        window.webcam.onExternalWebcamPreviewClosed((): void => {
            this.webcamService.setDetachedWebcamWindowActive(false);

            document.getElementById('hidden').style.display = 'flex';
            this.applyPreset(this.webcamFormGroup.getRawValue());
        });

        window.webcam.onVideoEnded((): void => {
            this.handleVideoEnded();
        });

        await this.reloadWebcamList();
    }

    public async reloadWebcamList(webcamDeviceReference?: WebcamDevice): Promise<void> {
        if (this.mutex.isLocked()) return;

        this.mutex.runExclusive(async (): Promise<void> => {
            const webcamData: WebcamDevice[] = await this.setWebcamDeviceInformation();
            this.webcamDropdownData = webcamData;
            if (webcamData?.length === 0) {
                this.stopWebcam();
                this.webcamInitComplete = false;
                this.webcamGuard.setLoadingStatus(false);
                this.noWebcams = true;
                return;
            } else {
                if (webcamDeviceReference === undefined) {
                    this.selectedWebcam = webcamData[0];
                }
                if (webcamDeviceReference !== undefined) {
                    this.selectedWebcam = webcamData.find(
                        (webcamDevice: WebcamDevice): boolean =>
                            webcamDevice.deviceId === webcamDeviceReference.deviceId,
                    );
                }
                await this.loadingPresetData();
                this.noWebcams = false;
                this.unsetLoading();
            }
        });
    }

    private getWebcamPaths(): Promise<WebcamPath> {
        return new Promise<WebcamPath>(
            (
                resolve: (value: WebcamPath | PromiseLike<WebcamPath>) => void,
                reject: (reason?: unknown) => void,
            ): void => {
                window.webcamAPI
                    .getWebcamPaths()
                    .then((data: string): void => {
                        resolve(JSON.parse(data.toString()));
                    })
                    .catch((err: unknown): void => {
                        console.error(`webcam-settings: getWebcamPaths failed => ${err}`);
                        resolve(null);
                    });
            },
        );
    }

    private getWebcamDevices(): Promise<(InputDeviceInfo | MediaDeviceInfo)[]> {
        return new Promise<(InputDeviceInfo | MediaDeviceInfo)[]>(
            (
                resolve: (
                    value: (InputDeviceInfo | MediaDeviceInfo)[] | PromiseLike<(InputDeviceInfo | MediaDeviceInfo)[]>,
                ) => void,
                reject: (reason?: unknown) => void,
            ): void => {
                navigator.mediaDevices
                    .enumerateDevices()
                    .then(async (devices: (InputDeviceInfo | MediaDeviceInfo)[]): Promise<void> => {
                        const filteredDevices: (InputDeviceInfo | MediaDeviceInfo)[] = devices.filter(
                            (device: InputDeviceInfo | MediaDeviceInfo): boolean => device.kind === 'videoinput',
                        );
                        resolve(filteredDevices);
                    });
            },
        );
    }

    private getDeviceData(devices: (InputDeviceInfo | MediaDeviceInfo)[], webcamId: string): [string, string] {
        for (const device of devices) {
            const deviceId: string = device.label.match(/\((.*:.*)\)/)[1];
            if (deviceId === webcamId) {
                const index: number = devices.indexOf(device, 0);
                if (index > -1) {
                    devices.splice(index, 1);
                }
                return [device.label, device.deviceId];
            }
        }
    }

    private async setWebcamDeviceInformation(): Promise<WebcamDevice[]> {
        const devices: (InputDeviceInfo | MediaDeviceInfo)[] = await this.getWebcamDevices();

        const dropdownData: WebcamDevice[] = [];
        const webcamPaths: WebcamPath = await this.getWebcamPaths();
        if (devices?.length !== 0 && webcamPaths !== null) {
            for (const [webcamPath, webcamId] of Object.entries(webcamPaths)) {
                const [label, deviceId] = this.getDeviceData(devices, webcamId);
                dropdownData.push({
                    label: label,
                    deviceId: deviceId,
                    id: webcamId,
                    path: webcamPath,
                });
            }
        }
        return dropdownData;
    }

    private async webcamNotAvailabledDialog(): Promise<void> {
        const config: ConfirmDialogData = {
            title: $localize`:@@webcamDialogNotAvailableTitle:Access error`,
            description: $localize`:@@webcamDialogNotAvailableDescription:Webcam can not be accessed. Reloading all webcams.`,
            buttonConfirmLabel: $localize`:@@dialogContinue:Continue`,
        };
        this.utils.confirmDialog(config).then();
    }

    private async getWebcamSettings(): Promise<string> {
        try {
            return window.webcamAPI.getSelectedWebcamSettings(this.selectedWebcam.path);
        } catch (err: unknown) {
            console.error(`webcam-settings: getWebcamSettings failed => ${err}`);
            this.mutex.release();
            this.webcamNotAvailabledDialog();
            await this.reloadWebcamList(undefined);
        }
    }

    private handleVideoEnded(): void {
        this.webcamNotAvailabledDialog();
        this.reloadWebcamList();
    }

    private stopWebcam(): void {
        this.video.pause();
        if (this.webcamService.getMediaStream() !== undefined && this.webcamService.getMediaStream() !== null) {
            for (const track of this.webcamService.getMediaStream().getTracks()) {
                track.stop();
            }
        }
        this.video.srcObject = null;
    }

    private setLoading(): void {
        this.webcamService.setSpinnerStatus(true);
        this.webcamGuard.setLoadingStatus(true);
    }

    public async setWebcam(webcamPreset: WebcamDevice): Promise<void> {
        this.setLoading();
        this.stopWebcam();

        this.selectedWebcam = webcamPreset;

        await this.reloadConfigValues();
        this.filterPresetsForCurrentDevice();
        await this.checkAllPresetsForCurrentDevice();

        let preset: WebcamPresetValues = this.defaultSettings;
        const filtered: WebcamPreset[] = this.webcamPresetsCurrentDevice.filter(
            (webcamPreset: WebcamPreset): boolean =>
                webcamPreset.presetName !== 'Default' && webcamPreset.active === true,
        );

        if (filtered?.length > 0) {
            this.selectedPreset = filtered[0];
            preset = filtered[0].webcamSettings;
        }

        this.activePreset = this.selectedPreset;
        await this.applyPreset(preset, false, true);
    }

    private getCurrentWebcamConstraints(): WebcamConstraints {
        const [webcamWidth, webcamHeight]: [string, string] = this.webcamFormGroup
            .getRawValue()
            ['resolution'].split('x');
        const fps: string = this.webcamFormGroup.getRawValue()['fps'];
        return {
            deviceId: { exact: this.selectedWebcam.deviceId },
            width: { exact: Number(webcamWidth) },
            height: { exact: Number(webcamHeight) },
            frameRate: { exact: Number(fps) },
        };
    }

    public async openWindow(): Promise<void> {
        this.stopWebcam();
        document.getElementById('hidden').style.display = 'none';
        const webcamConfig: WebcamConstraints = this.getCurrentWebcamConstraints();
        window.webcamAPI.createWebcamPreview(webcamConfig);
        this.webcamService.setDetachedWebcamWindowActive(true);
    }

    // using list with matching ids instead of one path value in case multiple devices have same id
    private getPathsWithId(id: string): string[] {
        const webcamPaths: string[] = [];
        this.webcamDropdownData.forEach((webcamDevice: WebcamDevice): void => {
            if (webcamDevice.id === id) {
                webcamPaths.push(webcamDevice.path);
            }
        });
        return webcamPaths;
    }

    public async setSliderValue(sliderValue: number, configParameter: string): Promise<void> {
        this.mutex.runExclusive((): void => {
            this.executeWebcamCtrls(configParameter, sliderValue);
        });
    }

    private async executeWebcamCtrls(parameter: string, value: number | string): Promise<void> {
        const webcamPaths: string[] = this.getPathsWithId(this.selectedWebcam.id);

        for (const devicePath of webcamPaths) {
            try {
                await window.webcamAPI.executeWebcamCtrls(devicePath, parameter, value);
            } catch (err: unknown) {
                console.error(`webcam-settings: executeWebcamCtrls failed => ${err}`);
                this.mutex.release();
                this.webcamNotAvailabledDialog();
                await this.reloadWebcamList(undefined);
            }
        }
    }

    private async executeWebcamCtrlsList(controls: WebcamPresetValues): Promise<void> {
        const filteredControls: string = Object.entries(controls)
            .filter(
                ([key, value]: [string, string | boolean | number]): boolean =>
                    value !== undefined && key !== 'fps' && key !== 'resolution',
            )
            .map(([key, value]: [string, string | boolean | number]): string => `${key}=${value}`)
            .join(',');

        const webcamPaths: string[] = this.getPathsWithId(this.selectedWebcam.id);

        if (filteredControls) {
            for (const devicePath of webcamPaths) {
                try {
                    await window.webcamAPI.executeFilteredCtrls(devicePath, filteredControls);
                } catch (err: unknown) {
                    console.error(`webcam-settings: executeWebcamCtrlsList failed => ${err}`);
                    this.mutex.release();
                    this.webcamNotAvailabledDialog();
                    await this.reloadWebcamList(undefined);
                }
            }
        }
    }

    public async setCheckboxValue(checked: boolean, configParameter: string): Promise<void> {
        this.mutex.runExclusive(async (): Promise<void> => {
            await this.executeWebcamCtrls(configParameter, String(Number(checked)));
            this.setSliderEnabledStatus();
            // white_balance_temperature must be set after disabling auto to take effect and small delay required
            if (
                (configParameter === 'white_balance_temperature_auto' ||
                    configParameter === 'white_balance_automatic') &&
                checked === false &&
                this.webcamFormGroup.get('white_balance_temperature') !== null
            ) {
                await this.setTimeout(250);
                await this.executeWebcamCtrls(
                    'white_balance_temperature',
                    this.webcamFormGroup.get('white_balance_temperature').value,
                );
            }
        });
    }

    public async setMenuConfigValue(configParameter: string, option: string): Promise<void> {
        await this.executeWebcamCtrls(configParameter, option);

        // absolute exposure must be set after disabling auto to take effect
        if (configParameter === 'exposure_auto' && option === 'manual_mode') {
            await this.executeWebcamCtrls('exposure_absolute', this.webcamFormGroup.get('exposure_absolute').value);
        }
        if (configParameter === 'auto_exposure' && option === 'manual_mode') {
            await this.executeWebcamCtrls(
                'exposure_time_absolute',
                this.webcamFormGroup.get('exposure_time_absolute').value,
            );
        }
    }

    public async setOptionsMenuValue(
        event: MatOptionSelectionChange | PointerEvent,
        configParameter: string,
        option: string,
    ): Promise<void> {
        if (event instanceof PointerEvent || (event instanceof MatOptionSelectionChange && event.isUserInput)) {
            this.mutex.runExclusive(async (): Promise<void> => {
                this.setLoading();
                this.webcamFormGroup.get(configParameter).markAsDirty();
                this.webcamFormGroup.get(configParameter).setValue(option);

                this.setSliderEnabledStatus();
                await this.applyPreset(this.webcamFormGroup.getRawValue());
            });
        }
    }

    private getWebcamPreset(presetName: string): WebcamPreset {
        return {
            presetName: presetName,
            active: true,
            webcamId: this.selectedWebcam.id,
            webcamSettings: this.webcamFormGroup.getRawValue(),
        };
    }

    private setFormgroupValidator(setting: WebcamDeviceInformation): ValidatorFn {
        return (control: AbstractControl): ValidationErrors | null => {
            let errors: { min?: number; max?: number; type?: string; options?: number[] | string[]; actual: unknown } =
                null;
            const value: boolean | number | string = control.value;

            if (setting.type === 'slider') {
                if (typeof value !== 'number') {
                    errors = { type: 'number', actual: typeof value };
                }
                if (typeof value === 'number' && value < setting.min) {
                    errors = { min: setting.min, actual: value };
                }
                if (typeof value === 'number' && value > setting.max) {
                    errors = { max: setting.max, actual: value };
                }
            }
            if (setting.type === 'bool') {
                if (typeof value !== 'boolean') errors = { type: 'boolean', actual: typeof value };
            }
            if (setting.type === 'menu') {
                if (
                    (typeof value === 'number' && !(setting.options as number[]).includes(value)) ||
                    (typeof value === 'string' && !(setting.options as string[]).includes(value))
                ) {
                    errors = { options: setting.options, actual: value };
                }
            }

            return errors;
        };
    }

    private convertSettingsToFormGroup(settings: WebcamDeviceInformation[]): FormGroup {
        this.presetSettings = settings;
        const group: {} = {};
        const categories: string[] = [];
        settings.forEach((setting: WebcamDeviceInformation): void => {
            group[setting.name] = new FormControl(
                {
                    value: setting.current,
                    disabled: !setting.active,
                },
                this.setFormgroupValidator(setting),
            );
            categories.push(setting.category);
        });
        this.webcamCategories = [...new Set(categories)];
        return new FormGroup(group);
    }

    private async webcamNotAvailableOtherAccessDialog(): Promise<void> {
        const config: ConfirmDialogData = {
            title: $localize`:@@webcamDialogNotAvailableTitle:Access error`,
            description: $localize`:@@webcamDialogNotAvailableOtherAccessDescription:Current Webcam can not be accessed. Another application is most likely accessing your webcam. Resolution and frames per second settings only apply for TCC preview.`,
            buttonConfirmLabel: $localize`:@@dialogContinue:Continue`,
        };
        this.utils.confirmDialog(config).then();
    }

    private async setWebcamWithConfig(config: WebcamConstraints): Promise<void> {
        await navigator.mediaDevices
            .getUserMedia({
                video: config,
            })
            .then(
                async (stream: MediaStream): Promise<void> => {
                    document.getElementById('hidden').style.display = 'flex';
                    this.video.srcObject = stream;

                    this.webcamService.setMediaStream(stream);
                },
                async (error: unknown): Promise<void> => {
                    console.error(error);
                    document.getElementById('hidden').style.display = 'none';
                    if (!this.warnedOnceWebcamAccessError) {
                        this.warnedOnceWebcamAccessError = true;
                        await this.webcamNotAvailableOtherAccessDialog();
                        await this.reloadWebcamList();
                    }
                },
            );

        if (this.webcamService.getMediaStream()) {
            this.webcamService.getMediaStream().getVideoTracks()[0].onended = (): void => {
                this.handleVideoEnded();
            };
        }
    }

    private unsetLoading(initComplete: boolean = false): void {
        if (initComplete) {
            this.webcamInitComplete = true;
        }
        this.webcamService.setSpinnerStatus(false);
        this.webcamGuard.setLoadingStatus(false);
        this.utils.pageDisabled = false;
    }

    private checkIfPresetNameAvailable(checkPresetName: string): boolean {
        const presetNames: string[] = [];
        this.webcamPresetsCurrentDevice.forEach((preset: WebcamPreset): void => {
            presetNames.push(preset.presetName);
        });
        return !presetNames.includes(checkPresetName);
    }

    // some configurations depend on each other and while one is active, another can't be active
    private setSliderEnabledStatus(): void {
        const webcamFormGroupValue: WebcamPresetValues = this.webcamFormGroup.getRawValue();

        if (
            (webcamFormGroupValue?.white_balance_temperature_auto || webcamFormGroupValue?.white_balance_automatic) &&
            'white_balance_temperature' in this.webcamFormGroup.getRawValue()
        ) {
            this.webcamFormGroup.get('white_balance_temperature').disable();
        }
        if (
            !(webcamFormGroupValue?.white_balance_temperature_auto || webcamFormGroupValue?.white_balance_automatic) &&
            'white_balance_temperature' in this.webcamFormGroup.getRawValue()
        ) {
            this.webcamFormGroup.get('white_balance_temperature').enable();
        }

        if (
            'exposure_auto_priority' in this.webcamFormGroup.getRawValue() &&
            'exposure_absolute' in this.webcamFormGroup.getRawValue()
        ) {
            if (webcamFormGroupValue?.exposure_auto === 'aperture_priority_mode') {
                this.webcamFormGroup.get('exposure_absolute').disable();
            }
            if (webcamFormGroupValue?.exposure_auto !== 'aperture_priority_mode') {
                this.webcamFormGroup.get('exposure_absolute').enable();
            }
        }

        if (
            'auto_exposure' in this.webcamFormGroup.getRawValue() &&
            'exposure_time_absolute' in this.webcamFormGroup.getRawValue()
        ) {
            if (webcamFormGroupValue?.auto_exposure === 'aperture_priority_mode') {
                this.webcamFormGroup.get('exposure_time_absolute').disable();
            }
            if (webcamFormGroupValue?.auto_exposure !== 'aperture_priority_mode') {
                this.webcamFormGroup.get('exposure_time_absolute').enable();
            }
        }
    }

    private checkIfFormgroupValid(): boolean {
        let valid: boolean = true;
        Object.keys(this.webcamFormGroup.controls).forEach((key: string): void => {
            const controlErrors: ValidationErrors = this.webcamFormGroup.get(key).errors;
            if (controlErrors !== null) {
                valid = false;
            }
        });
        return valid;
    }

    private notValidPresetDialog(): void {
        const config: ConfirmDialogData = {
            title: $localize`:@@webcamDialogNotValidPresetTitle:Webcam preset faulty`,
            description: $localize`:@@webcamDialogNotValidPresetDialog:The webcam preset contains invalid configurations and therefore won't be applied. Reverting to default preset.`,
            buttonConfirmLabel: $localize`:@@dialogContinue:Continue`,
        };
        this.utils.confirmDialog(config).then();
    }

    private createWebcamConfig(config: WebcamPresetValues): WebcamConstraints {
        const [webcamWidth, webcamHeight] = config['resolution'].split('x');
        return {
            deviceId: { exact: this.selectedWebcam.deviceId },
            width: { exact: Number(webcamWidth) },
            height: { exact: Number(webcamHeight) },
            frameRate: { exact: Number(config['fps']) },
        };
    }

    private async configMismatchDialog(): Promise<boolean> {
        const config: ConfirmDialogData = {
            title: $localize`:@@webcamDialogMismatchConfigValuesTitle:Mismatch of config values`,
            description: $localize`:@@webcamDialogMismatchConfigValuesDialog:Unknown values detected. Want to resave all presets with adjusted values for compatibility? This may alter presets. If you decline, they'll be adjusted next time you save. If not a config file issue, ensure latest TCC. Otherwise, contact Tuxedo with kernel and device details.`,
            buttonConfirmLabel: $localize`:@@dialogSaveAdjustedPresets:Save adjusted presets`,
            buttonAbortLabel: $localize`:@@dialogAbort:Cancel`,
        };
        return this.utils.confirmDialog(config).then((result: ConfirmDialogResult): boolean => {
            return result.confirm;
        });
    }

    // config names can change with a different linux kernel version
    private async checkConfig(preset: WebcamPreset): Promise<boolean> {
        const formGroupKeys: string[] = Object.keys(this.webcamFormGroup.getRawValue());
        const configKeys: string[] = Object.keys(preset.webcamSettings);

        let unknown: boolean = false;
        const renamedKeys: string[] = [];
        this.v4l2Renames.forEach((knownRename: string[]): void => {
            const includedFormGroupKey: string = knownRename.find((configName: string): boolean =>
                formGroupKeys.includes(configName),
            );

            const includedConfigKey: string = knownRename.find((configName: string): boolean =>
                configKeys.includes(configName),
            );

            if (includedFormGroupKey && includedConfigKey) {
                if (includedFormGroupKey !== includedConfigKey) {
                    const value: string | number | boolean = preset.webcamSettings[includedConfigKey];
                    delete preset.webcamSettings[includedConfigKey];
                    preset.webcamSettings[includedFormGroupKey] = value;
                    renamedKeys.push(includedConfigKey);
                }
            }
            if ((includedFormGroupKey && !includedConfigKey) || (!includedFormGroupKey && includedConfigKey)) {
                delete preset.webcamSettings[includedConfigKey];
                unknown = true;
            }
        });

        const unresolvedKeys: string[] = configKeys
            .filter((item: string): boolean => formGroupKeys.indexOf(item) < 0)
            .filter((item: string): boolean => renamedKeys.indexOf(item) < 0);
        if (unresolvedKeys?.length > 0) {
            unknown = true;
        }

        return unknown;
    }

    private async checkAllPresetsForCurrentDevice(): Promise<void> {
        this.mutex.runExclusive(async (): Promise<void> => {
            const configErrorStatusArray: boolean[] = [];

            // todo: this should be in main.ts
            if (environment.production) {
                this.v4l2Renames = await window.webcamAPI.readV4l2Names('');
            } else {
                this.v4l2Renames = await window.webcamAPI.readV4l2NamesCWD('/src/cameractrls/v4l2_kernel_names.json');
            }

            for (const profile of this.webcamPresetsCurrentDevice) {
                const status: boolean = await this.checkConfig(profile);
                configErrorStatusArray.push(status);
            }

            if (configErrorStatusArray.includes(true)) {
                if (await this.configMismatchDialog()) {
                    await this.savePreset(this.selectedPreset.presetName, true, false);
                }
            }
        });
    }

    public async applyPreset(
        config: WebcamPresetValues,
        markAsPristine: boolean = false,
        setViewWebcam: boolean = false,
    ): Promise<void> {
        this.mutex.runExclusive(async (): Promise<void> => {
            this.unsetLoading(false);
            this.setLoading();
            this.stopWebcam();

            if (markAsPristine) {
                this.webcamFormGroup.markAsPristine();
            }

            if (!this.webcamService.getDetachedWebcamWindowActive()) {
                document.getElementById('video').style.visibility = 'hidden';
            }

            this.webcamFormGroup.patchValue(config);
            if (!this.checkIfFormgroupValid()) {
                this.notValidPresetDialog();
                this.applyPreset(this.defaultSettings);
                return;
            }

            const webcamConfig: WebcamConstraints = this.createWebcamConfig(config);
            this.setSliderEnabledStatus();

            if (!this.webcamService.getDetachedWebcamWindowActive()) {
                await this.setWebcamWithConfig(webcamConfig);
                await this.executeWebcamCtrlsList(config);
                await this.setTimeout(1000);

                document.getElementById('video').style.visibility = 'visible';
            }

            if (this.webcamService.getDetachedWebcamWindowActive()) {
                window.webcamAPI.setWebcamWithLoading(webcamConfig);
            }
            if (setViewWebcam) {
                this.viewWebcam = config;
            }

            this.unsetLoading(true);
        });
    }

    private setDefaultSettings(settings: WebcamDeviceInformation[]): void {
        this.defaultSettings = {};
        settings.forEach((setting: WebcamDeviceInformation): void => {
            if (setting.default !== undefined) {
                this.defaultSettings[setting.name] = setting.default;
            } else {
                this.defaultSettings[setting.name] = setting.current;
            }
        });
    }

    private async reloadConfigValues(): Promise<void> {
        await this.getWebcamSettings().then(async (data: string): Promise<void> => {
            this.webcamFormGroup = this.convertSettingsToFormGroup(JSON.parse(data));
            this.viewWebcam = this.webcamFormGroup.getRawValue();
            this.setDefaultSettings(JSON.parse(data));
        });
    }

    private filterPresetsForCurrentDevice(): void {
        this.webcamPresetsCurrentDevice = [];
        this.webcamPresetsOtherDevices = [];
        this.setDefaultPreset();

        if (this.allPresetData !== undefined) {
            this.allPresetData = this.allPresetData.filter(
                (webcamPreset: WebcamPreset): boolean => webcamPreset.presetName !== 'Default',
            );
            this.allPresetData.forEach((config: WebcamPreset): void => {
                if (config.webcamId === this.selectedWebcam.id) {
                    this.webcamPresetsCurrentDevice.push(config);
                } else {
                    this.webcamPresetsOtherDevices.push(config);
                }
            });
        }
    }

    private askOverwritePreset(presetName: string): void {
        const config: ConfirmDialogData = {
            title: $localize`:@@webcamDialogAskOverwriteTitle:Webcam preset not avaiable`,
            description: $localize`:@@webcamDialogAskOverwriteDescription:Do you want to overwrite the webcam preset?`,
            buttonAbortLabel: $localize`:@@dialogAbort:Cancel`,
            buttonConfirmLabel: $localize`:@@dialogContinue:Continue`,
        };
        this.utils.confirmDialog(config).then((confirm: ConfirmDialogResult): void => {
            if (confirm) {
                this.savePreset(presetName);
            }
        });
    }

    public async savePreset(
        presetName: string,
        overwrite: boolean = false,
        setActive: boolean = true,
    ): Promise<boolean> {
        let saveComplete: boolean = false;
        this.utils.pageDisabled = true;
        const currentPreset: WebcamPreset = this.getWebcamPreset(presetName);

        let webcamConfigs: WebcamPreset[] = this.webcamPresetsCurrentDevice.filter(
            (webcamPreset: WebcamPreset): boolean => webcamPreset.presetName !== 'Default',
        );
        if (overwrite) {
            webcamConfigs.forEach((preset: WebcamPreset): void => {
                if (setActive) {
                    preset.active = false;
                    if (preset.presetName === presetName) {
                        preset.active = true;
                        preset.webcamSettings = currentPreset.webcamSettings;
                    }
                }

                if (!setActive) {
                    if (preset.presetName === presetName) {
                        preset.webcamSettings = currentPreset.webcamSettings;
                    }
                }
            });

            webcamConfigs = webcamConfigs.concat(this.webcamPresetsOtherDevices);
        }
        if (!overwrite) {
            webcamConfigs.forEach((preset: WebcamPreset): boolean => (preset.active = false));
            webcamConfigs = webcamConfigs.concat(currentPreset, this.webcamPresetsOtherDevices);
        }

        await window.webcamAPI.pkexecWriteWebcamConfigAsync(webcamConfigs).then((confirm: boolean): void => {
            if (confirm) {
                if (setActive) {
                    this.activePreset = currentPreset;
                    this.selectedPreset = currentPreset;
                }

                this.viewWebcam = this.webcamFormGroup.getRawValue();
                this.webcamFormGroup.markAsPristine();

                if (overwrite) {
                    this.webcamPresetsCurrentDevice.forEach((preset: WebcamPreset): void => {
                        if (preset.presetName === presetName) {
                            preset.webcamSettings = currentPreset.webcamSettings;
                        }
                    });
                    this.allPresetData.forEach((preset: WebcamPreset): void => {
                        if (preset.presetName === presetName) {
                            preset.webcamSettings = currentPreset.webcamSettings;
                        }
                    });
                }
                if (!overwrite) {
                    this.webcamPresetsCurrentDevice.push(currentPreset);
                    this.allPresetData.push(currentPreset);
                }
                saveComplete = true;
            }
        });

        this.utils.pageDisabled = false;
        return saveComplete;
    }

    private noPresetNameWarningDialog(): void {
        const config: ConfirmDialogData = {
            title: $localize`:@@webcamDialogPresetNameUnsetTitle:The webcam preset was not saved`,
            description: $localize`:@@webcamDialogPresetNameUnsetDescription:The webcam preset name was no set and thus the preset was not saved.`,
            buttonConfirmLabel: $localize`:@@dialogContinue:Continue`,
        };
        this.utils.confirmDialog(config).then();
    }

    private defaultOverwriteNotAllowed(): void {
        const config: ConfirmDialogData = {
            title: $localize`:@@webcamDialogDefaultCanNotOverwriteTitle:Overwriting default settings failed`,
            description: $localize`:@@webcamDialogDefaultCanNotOverwriteDescription:Please select a different name for your webcam preset.`,
            buttonConfirmLabel: $localize`:@@dialogContinue:Continue`,
        };
        this.utils.confirmDialog(config).then();
    }

    private async askOverwriteOrNewPreset(): Promise<string | undefined> {
        const config: ChoiceDialogData = {
            title: $localize`:@@webcamDialogAskPresetOverwriteTitle:Overwrite webcam preset?`,
            description: $localize`:@@webcamDialogAskPresetOverwriteDescription:Do you want to overwrite the current webcam preset or create a new one?`,
            labelData: [
                {
                    label: $localize`:@@dialogOverwrite:Overwrite`,
                    value: 'OVERWRITE',
                },
                {
                    label: $localize`:@@dialogNewPreset:New webcam preset`,
                    value: 'NEW',
                },
            ],
        };
        return this.utils.choiceDialog(config).then((dialogResult: ConfirmChoiceResult): string => {
            return dialogResult['value'];
        });
    }

    private async askPresetNameDialog(): Promise<string> {
        const config: InputDialogData = {
            title: $localize`:@@webcamDialogAskPresetNameTitle:Saving webcam preset`,
            description: $localize`:@@webcamDialogAskPresetNameDescription:Set name for webcam preset.`,
            prefill: '',
            buttonAbortLabel: $localize`:@@dialogAbort:Cancel`,
            buttonConfirmLabel: $localize`:@@dialogContinue:Continue`,
        };
        return this.utils.inputTextDialog(config).then((x: string): string => {
            return x;
        });
    }

    public async handlePresetName(): Promise<void> {
        const presetName: string = await this.askPresetNameDialog();
        if (presetName === undefined || presetName === '') {
            this.noPresetNameWarningDialog();
            return;
        }
        if (presetName === 'Default') {
            this.defaultOverwriteNotAllowed();
            return;
        }
        if (this.checkIfPresetNameAvailable(presetName)) {
            this.savePreset(presetName);
        } else {
            this.askOverwritePreset(presetName);
        }
    }

    public async savingWebcamPreset(): Promise<void> {
        if (this.selectedPreset.presetName === 'Default') {
            await this.handlePresetName();
            return;
        }
        const selection: string | undefined = await this.askOverwriteOrNewPreset();
        if (selection === undefined) {
            return;
        }
        if (selection === 'OVERWRITE') {
            this.savePreset(this.selectedPreset.presetName, true);
        }
        if (selection === 'NEW') {
            await this.handlePresetName();
        }
    }

    public mouseup(): void {
        this.mutex.runExclusive((): void => {
            if (this.timer) {
                clearInterval(this.timer);
            }
        });
    }

    private async valueOffsetFunc(configParameter: string, offset: number): Promise<void> {
        this.webcamFormGroup.get(configParameter).markAsDirty();

        const min: string | number = this.getOptionValue(configParameter, 'min');
        const max: string | number = this.getOptionValue(configParameter, 'max');
        let newValue: string | number = this.webcamFormGroup.controls[configParameter]?.value + offset;
        if (newValue < min) {
            newValue = min;
        } else if (newValue > max) {
            newValue = max;
        }

        this.webcamFormGroup.controls[configParameter].setValue(newValue);
        await this.executeWebcamCtrls(configParameter, newValue);
    }

    public mousedown(configParameter: string, offset: number): void {
        this.mutex.runExclusive((): void => {
            this.valueOffsetFunc(configParameter, offset);
            this.timer = setInterval((): void => {
                this.valueOffsetFunc(configParameter, offset);
            }, 200);
        });
    }

    public showAdvancedSettings(): void {
        this.easyModeActive = false;
    }

    public disableAdvancedSettings(): void {
        this.easyModeActive = true;
    }

    public getOptionValue(configName: string, configVar: string): number | string {
        let value: number | string;
        this.presetSettings.forEach((webcamDeviceInformationEntry: WebcamDeviceInformation): void => {
            if (webcamDeviceInformationEntry.name === configName) {
                value = webcamDeviceInformationEntry[configVar];
            }
        });
        return value;
    }

    private setDefaultPreset(active: boolean = false): void {
        this.defaultPreset = {
            presetName: 'Default',
            active: active,
            webcamId: this.selectedWebcam.id,
            webcamSettings: this.defaultSettings,
        };
        this.selectedPreset = this.defaultPreset;

        this.webcamPresetsCurrentDevice = this.webcamPresetsCurrentDevice.filter(
            (webcamPreset: WebcamPreset): boolean => webcamPreset.presetName !== 'Default',
        );
        this.webcamPresetsCurrentDevice.unshift(this.defaultPreset);
    }

    public applyConfigAllowed(): boolean {
        if (this.activePreset !== this.selectedPreset && !this.webcamFormGroup.dirty) {
            return true;
        }
        return false;
    }

    private async loadingPresetData(): Promise<void> {
        await this.reloadConfigValues();
        // todo: make async
        if (window.fs.existsSync(TccPaths.WEBCAM_FILE)) {
            this.allPresetData = await window.webcamAPI.readWebcamSettings();
            this.filterPresetsForCurrentDevice();

            await this.checkAllPresetsForCurrentDevice();

            const activePresets: WebcamPreset[] = this.webcamPresetsCurrentDevice.filter(
                (webcamPreset: WebcamPreset): boolean => webcamPreset.active === true,
            );

            if (activePresets?.length > 0) {
                this.activePreset = this.selectedPreset = activePresets[0];
                await this.applyPreset(activePresets[0].webcamSettings, false, true);
            }
            if (activePresets?.length === 0) {
                this.setDefaultPreset(true);
                this.activePreset = this.defaultPreset;
                await this.applyPreset(this.defaultSettings, false, true);
            }
        } else {
            this.setDefaultPreset(true);
            this.activePreset = this.defaultPreset;
            await this.applyPreset(this.defaultSettings, false, true);
        }
    }

    private defaultPresetWarningDialog(): void {
        const config: ConfirmDialogData = {
            title: $localize`:@@webcamDialogDefaultCanNotDeleteTitle:Deleting default webcam preset failed`,
            description: $localize`:@@webcamDialogDefaultCanNotDeleteDescription:The default preset cannot be deleted.`,
            buttonConfirmLabel: $localize`:@@dialogContinue:Continue`,
        };
        this.utils.confirmDialog(config).then();
    }

    private async presetDeleteConfirmDialog(): Promise<boolean> {
        const config: ConfirmDialogData = {
            title: $localize`:@@webcamDialogDeletePresetConfirmTitle:Deleting webcam preset`,
            description: $localize`:@@webcamDialogDeletePresetConfirmDescription:Are you sure that you want to delete this webcam preset?`,
            buttonAbortLabel: $localize`:@@dialogAbort:Cancel`,
            buttonConfirmLabel: $localize`:@@dialogContinue:Continue`,
        };
        return this.utils.confirmDialog(config).then((dialogResult: ConfirmDialogResult): boolean => {
            return dialogResult['confirm'];
        });
    }

    public async deletePreset(): Promise<void> {
        this.mutex.runExclusive(async (): Promise<void> => {
            if (this.selectedPreset.presetName === 'Default') {
                this.defaultPresetWarningDialog();
                return;
            }
            const confirmed: boolean = await this.presetDeleteConfirmDialog();
            if (confirmed) {
                if (this.selectedPreset.presetName === 'Default') {
                    this.defaultPresetWarningDialog();
                    return;
                }

                this.utils.pageDisabled = true;

                const currentConfigs: WebcamPreset[] = this.webcamPresetsCurrentDevice.filter(
                    (webcamPreset: WebcamPreset): boolean =>
                        webcamPreset.presetName !== this.selectedPreset.presetName &&
                        webcamPreset.presetName !== 'Default',
                );
                const webcamConfigs: WebcamPreset[] = currentConfigs.concat(this.webcamPresetsOtherDevices);

                await window.webcamAPI.pkexecWriteWebcamConfigAsync(webcamConfigs).then((confirm: boolean): void => {
                    if (confirm) {
                        this.activePreset = this.defaultPreset;

                        this.webcamPresetsCurrentDevice = currentConfigs;
                        this.webcamPresetsCurrentDevice.unshift(this.defaultPreset);

                        this.allPresetData = webcamConfigs;
                        this.webcamFormGroup.markAsPristine();
                        this.selectedPreset = this.defaultPreset;
                        this.applyPreset(this.defaultSettings, false, true);
                    }
                });
                this.utils.pageDisabled = false;
            }
        });
    }

    public getPercentValue(preset: string): string {
        const { max, min } = this.getMinMaxOptionValues(preset);
        const current: number = Number(this.webcamFormGroup?.get(preset)?.value);

        if (max !== undefined && min !== undefined && current !== undefined) {
            const roundingDigits: number = this.getRoundingDigits(preset);
            return this.calculatePercentValue(current, min, max, roundingDigits);
        }
    }

    private getMinMaxOptionValues(preset: string): {
        max: number;
        min: number;
    } {
        const max: number = Number(this.getOptionValue(preset, 'max'));
        const min: number = Number(this.getOptionValue(preset, 'min'));
        return { max, min };
    }

    private getRoundingDigits(preset: string): number {
        return preset === 'exposure_time_absolute' || preset === 'exposure_absolute' ? 2 : 1;
    }

    private calculatePercentValue(current: number, min: number, max: number, roundingDigits: number): string {
        const percent: number = ((current - min) * 100) / (max - min);
        return percent.toFixed(roundingDigits);
    }

    public async discardFormInput(): Promise<void> {
        this.webcamFormGroup.markAsPristine();
        this.applyPreset(this.viewWebcam);
    }

    public comparePresets(preset1: WebcamPreset, preset2: WebcamPreset): boolean {
        return preset1 && preset2 ? preset1.presetName === preset2.presetName : preset1 === preset2;
    }

    public compareWebcams(webcam1: WebcamDevice, webcam2: WebcamDevice): boolean {
        return webcam1 && webcam2 && webcam1.label === webcam2.label && webcam1.id === webcam2.id;
    }

    private setTimeout(delay: number): Promise<void> {
        return new Promise<void>((resolve: () => void): NodeJS.Timeout => setTimeout(resolve, delay));
    }

    public modeSelectionTriggered(mode: MatTab): void {
        if (mode.textLabel === 'Simple') {
            this.disableAdvancedSettings();
            this.selectedModeTabIndex = 'Simple';
        }
        if (mode.textLabel === 'Advanced') {
            this.showAdvancedSettings();
            this.selectedModeTabIndex = 'Advanced';
        }
    }

    public checkValid(setting: string): boolean {
        return this.webcamFormGroup.get(setting)?.status === 'VALID';
    }

    public getConfigTranslation(configText: string): string {
        if (configText === 'exposure_auto' || configText === 'auto_exposure') {
            return $localize`:@@webcamExposureAuto:Exposure, Auto`;
        }
        if (configText === 'exposure_time_absolute') {
            return $localize`:@@webcamExposureTimeAbsolute:Exposure time (absolute)`;
        }
        if (configText === 'exposure_dynamic_framerate') {
            return $localize`:@@webcamExposureDynamicFramerate:Exposure dynamic framerate`;
        }
        if (configText === 'exposure_absolute') {
            return $localize`:@@webcamExposureAbsolute:Exposure (Absolute)`;
        }
        if (configText === 'exposure_auto_priority') {
            return $localize`:@@webcamExposureAutoPriority:Exposure, Auto Priority`;
        }
        if (configText === 'gain') {
            return $localize`:@@webcamGain:Gain`;
        }
        if (configText === 'backlight_compensation') {
            return $localize`:@@webcamBacklightCompensation:Backlight Compensation`;
        }
        if (configText === 'white_balance_automatic') {
            return $localize`:@@webcamWhiteBalanceAutomatic:White Balance, Auto`;
        }
        if (configText === 'white_balance_temperature_auto') {
            return $localize`:@@webcamWhiteBalanceTemperatureAuto:White Balance Temperature, Auto`;
        }
        if (configText === 'white_balance_temperature') {
            return $localize`:@@whiteBalanceTemperature:White Balance Temperature`;
        }
        if (configText === 'brightness') {
            return $localize`:@@webcamBrightness:Brightness`;
        }
        if (configText === 'contrast') {
            return $localize`:@@webcamContrast:Contrast`;
        }
        if (configText === 'saturation') {
            return $localize`:@@webcamSaturation:Saturation`;
        }
        if (configText === 'sharpness') {
            return $localize`:@@webcamSharpness:Sharpness`;
        }
        if (configText === 'hue') {
            return $localize`:@@webcamHue:Hue`;
        }
        if (configText === 'gamma') {
            return $localize`:@@webcamGamma:Gamma`;
        }
        if (configText === 'resolution') {
            return $localize`:@@webcamResolution:Resolution`;
        }
        if (configText === 'fps') {
            return $localize`:@@webcamFps:Frames per Second`;
        }
        if (configText === 'aperture_priority_mode') {
            return $localize`:@@webcamAperturePriorityMode:Aperture Priority Mode`;
        }
        if (configText === 'manual_mode') {
            return $localize`:@@webcamManualMode:Manual Mode`;
        }
        return configText;
    }

    public getTitleTranslation(configText: string): string {
        if (configText === 'General') {
            return $localize`:@@webcamTitleGeneral:General`;
        }
        if (configText === 'Exposure') {
            return $localize`:@@webcamTitleExposure:Exposure`;
        }
        if (configText === 'Dynamic Range') {
            return $localize`:@@webcamTitleDynamicRange:Dynamic Range`;
        }
        if (configText === 'Balance') {
            return $localize`:@@webcamTitleBalance:Balance`;
        }
        if (configText === 'Color') {
            return $localize`:@@webcamTitleColor:Color`;
        }
        if (configText === 'Capture') {
            return $localize`:@@webcamTitleCapture:Capture`;
        }
        return configText;
    }

    public ngOnDestroy(): void {
        this.stopWebcam();

        this.webcamService.setMediaStream(null);

        if (this.webcamService.getDetachedWebcamWindowActive()) {
            window.webcamAPI.closeWebcamPreview();
        }
    }
}
