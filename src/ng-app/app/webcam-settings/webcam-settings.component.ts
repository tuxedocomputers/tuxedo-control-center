import { Component, ElementRef, OnInit, ViewChild } from "@angular/core";
import { ElectronService } from "ngx-electron";
import { fromEvent, Subscription } from "rxjs";
import {
    WebcamPreset,
    WebcamDeviceInformation,
    WebcamConstraints,
    WebcamDevice,
    WebcamPresetValues,
    WebcamPath,
} from "src/common/models/TccWebcamSettings";
import { UtilsService } from "../utils.service";
import { ChangeDetectorRef } from "@angular/core";
import { WebcamSettingsGuard } from "../webcam.service";
import { setInterval, clearInterval } from "timers";
import {
    AbstractControl,
    FormControl,
    ValidationErrors,
    ValidatorFn,
} from "@angular/forms";
import { FormGroup } from "@angular/forms";
import { ConfigHandler } from "src/common/classes/ConfigHandler";
import { TccPaths } from "src/common/classes/TccPaths";
import { MatOptionSelectionChange } from "@angular/material/core";
import { Mutex } from "async-mutex";
import * as fs from "fs";
import { ConfigService } from "../config.service";
import { environment } from "../../environments/environment";
import { MatTab } from "@angular/material/tabs";

@Component({
    selector: "app-webcam-settings",
    templateUrl: "./webcam-settings.component.html",
    styleUrls: ["./webcam-settings.component.scss"],
})
export class WebcamSettingsComponent implements OnInit {
    gridParams = {
        cols: 9,
        headerSpan: 4,
        valueSpan: 2,
        inputSpan: 3,
    };

    @ViewChild("video", { static: true })
    video: ElementRef;
    mediaDeviceStream: MediaStream;

    timer: NodeJS.Timeout = null;
    subscriptions: Subscription = new Subscription();
    mutex = new Mutex();

    spinnerActive: boolean = false;
    detachedWebcamWindowActive: Boolean = false;

    webcamDropdownData: WebcamDevice[] = [];
    webcamInitComplete: boolean = false;
    webcamPresetsOtherDevices: WebcamPreset[] = [];
    webcamPresetsCurrentDevice: WebcamPreset[] = [];
    webcamFormGroup: FormGroup = new FormGroup({});
    webcamCategories: string[] = [];

    allPresetData: WebcamPreset[] = [];
    presetSettings: WebcamDeviceInformation[];
    defaultPreset: WebcamPreset;
    selectedPreset: WebcamPreset;
    selectedWebcam: WebcamDevice;

    defaultSettings: WebcamPresetValues;
    viewWebcam: WebcamPresetValues;
    noWebcams: boolean = false;

    selectedWebcamMode: string = "Simple";
    activePreset: WebcamPreset;

    easyOptions: string[] = ["brightness", "contrast", "resolution"];
    easyModeActive: boolean = true;

    selectedModeTabIndex: string = "Simple";

    v4l2Renames: string[][];

    warnedOnceWebcamAccessError: boolean = false;

    constructor(
        private electron: ElectronService,
        private utils: UtilsService,
        private cdref: ChangeDetectorRef,
        private webcamGuard: WebcamSettingsGuard,
        private config: ConfigService
    ) {}
    private configHandler: ConfigHandler;

    async ngOnInit() {
        this.webcamGuard.setLoadingStatus(true);

        this.configHandler = new ConfigHandler(
            TccPaths.SETTINGS_FILE,
            TccPaths.PROFILES_FILE,
            TccPaths.WEBCAM_FILE,
            TccPaths.V4L2_NAMES_FILE,
            TccPaths.AUTOSAVE_FILE,
            TccPaths.FANTABLES_FILE
        );

        const webcamApplyObservable = fromEvent(
            this.electron.ipcRenderer,
            "apply-controls"
        );
        this.subscriptions.add(
            webcamApplyObservable.subscribe(async () => {
                await this.executeWebcamCtrlsList(
                    this.webcamFormGroup.getRawValue()
                );
            })
        );

        const webcamWindowObservable = fromEvent(
            this.electron.ipcRenderer,
            "external-webcam-preview-closed"
        );
        this.subscriptions.add(
            webcamWindowObservable.subscribe(() => {
                this.detachedWebcamWindowActive = false;
                document.getElementById("hidden").style.display = "flex";
                this.applyPreset(this.webcamFormGroup.getRawValue());
            })
        );

        const videoEndedObservable = fromEvent(
            this.electron.ipcRenderer,
            "video-ended"
        );
        this.subscriptions.add(
            videoEndedObservable.subscribe(() => {
                this.handleVideoEnded();
            })
        );

        await this.reloadWebcamList();
    }

    public async reloadWebcamList(
        webcamDeviceReference?: WebcamDevice
    ): Promise<void> {
        if (this.mutex.isLocked()) return;

        this.mutex.runExclusive(async () => {
            let webcamData = await this.setWebcamDeviceInformation();
            this.webcamDropdownData = webcamData;
            if (webcamData.length == 0) {
                this.stopWebcam();
                this.webcamInitComplete = false;
                this.webcamGuard.setLoadingStatus(false);
                this.cdref.detectChanges();
                this.noWebcams = true;
                return;
            } else {
                if (webcamDeviceReference == undefined) {
                    this.selectedWebcam = webcamData[0];
                }
                if (webcamDeviceReference != undefined) {
                    this.selectedWebcam = webcamData.find(
                        (webcamDevice) =>
                            webcamDevice.deviceId ==
                            webcamDeviceReference.deviceId
                    );
                }
                await this.loadingPresetData();
                this.noWebcams = false;
                this.unsetLoading();
            }
        });
    }

    ngAfterContentChecked() {
        this.cdref.detectChanges();
    }

    private getWebcamPaths(): Promise<WebcamPath> {
        return new Promise<WebcamPath>((resolve) => {
            this.utils
                .execFile("python3 " + this.getWebcamCtrlPythonPath() + " -i")
                .then((data) => {
                    resolve(JSON.parse(data.toString()));
                })
                .catch((error) => {
                    console.log(error);
                    resolve(null);
                });
        });
    }

    private getWebcamDevices(): Promise<(InputDeviceInfo | MediaDeviceInfo)[]> {
        return new Promise<(InputDeviceInfo | MediaDeviceInfo)[]>((resolve) => {
            navigator.mediaDevices
                .enumerateDevices()
                .then(
                    async (devices: (InputDeviceInfo | MediaDeviceInfo)[]) => {
                        let filteredDevices = devices.filter(
                            (device) => device.kind == "videoinput"
                        );
                        resolve(filteredDevices);
                    }
                );
        });
    }

    private getDeviceData(
        devices: (InputDeviceInfo | MediaDeviceInfo)[],
        webcamId: string
    ): [string, string] {
        for (const device of devices) {
            let deviceId = device.label.match(/\((.*:.*)\)/)[1];
            if (deviceId == webcamId) {
                const index = devices.indexOf(device, 0);
                if (index > -1) {
                    devices.splice(index, 1);
                }
                return [device.label, device.deviceId];
            }
        }
    }

    private async setWebcamDeviceInformation(): Promise<WebcamDevice[]> {
        let devices = await this.getWebcamDevices();
        return new Promise<WebcamDevice[]>(async (resolve) => {
            let dropdownData: WebcamDevice[] = [];
            let webcamPaths = await this.getWebcamPaths();
            if (devices.length !== 0 && webcamPaths != null) {
                for (const [webcamPath, webcamId] of Object.entries(
                    webcamPaths
                )) {
                    let [label, deviceId] = this.getDeviceData(
                        devices,
                        webcamId
                    );
                    dropdownData.push({
                        label: label,
                        deviceId: deviceId,
                        id: webcamId,
                        path: webcamPath,
                    });
                }
            }
            resolve(dropdownData);
        });
    }

    private async webcamNotAvailabledDialog(): Promise<void> {
        let config = {
            title: $localize`:@@webcamDialogNotAvailableTitle:Access error`,
            description: $localize`:@@webcamDialogNotAvailableDescription:Webcam can not be accessed. Reloading all webcams.`,
            buttonConfirmLabel: $localize`:@@dialogContinue:Continue`,
        };
        this.utils.confirmDialog(config).then();
    }

    private getWebcamCtrlPythonPath() {
        let webcamCtrolsPath: String;
        if (environment.production) {
            webcamCtrolsPath = TccPaths.TCCD_PYTHON_CAMERACTRL_FILE;
        } else {
            webcamCtrolsPath =
                this.electron.process.cwd() + "/src/cameractrls/cameractrls.py";
        }
        return webcamCtrolsPath;
    }

    private getWebcamSettings(): Promise<string> {
        return new Promise<string>(async (resolve) => {
            try {
                let data = await this.utils.execCmd(
                    "python3 " +
                        this.getWebcamCtrlPythonPath() +
                        ` -d ${this.selectedWebcam.path} -j`
                );
                resolve(data.toString());
            } catch (error) {
                console.log(error);
                this.mutex.release();
                this.webcamNotAvailabledDialog();
                await this.reloadWebcamList(undefined);
            }
        });
    }

    private handleVideoEnded() {
        this.webcamNotAvailabledDialog();
        this.reloadWebcamList();
    }

    private stopWebcam() {
        this.video.nativeElement.pause();
        if (this.mediaDeviceStream != undefined) {
            for (const track of this.mediaDeviceStream.getTracks()) {
                track.stop();
            }
        }
        this.video.nativeElement.srcObject = null;
    }

    private setLoading() {
        this.spinnerActive = true;
        this.webcamGuard.setLoadingStatus(true);
        this.cdref.detectChanges();
    }

    public async setWebcam(webcamPreset: WebcamDevice): Promise<void> {
        this.setLoading();
        this.stopWebcam();
        await this.reloadConfigValues();
        this.filterPresetsForCurrentDevice();
        await this.checkAllPresetsForCurrentDevice();

        this.selectedWebcam = webcamPreset;

        let preset = this.defaultSettings;
        let filtered = this.webcamPresetsCurrentDevice.filter(
            (webcamPreset) =>
                webcamPreset.presetName != "Default" &&
                webcamPreset.active == true
        );

        if (filtered.length > 0) {
            this.selectedPreset = filtered[0];
            preset = filtered[0].webcamSettings;
        }

        this.activePreset = this.selectedPreset;
        await this.applyPreset(preset, false, true);
    }

    private getCurrentWebcamConstraints(): WebcamConstraints {
        let [webcamWidth, webcamHeight] = this.webcamFormGroup
            .getRawValue()
            ["resolution"].split("x");
        let fps = this.webcamFormGroup.getRawValue()["fps"];
        return {
            deviceId: { exact: this.selectedWebcam.deviceId },
            width: { exact: Number(webcamWidth) },
            height: { exact: Number(webcamHeight) },
            frameRate: { exact: Number(fps) },
        };
    }

    public async openWindow(): Promise<void> {
        this.stopWebcam();
        document.getElementById("hidden").style.display = "none";
        let webcamConfig = this.getCurrentWebcamConstraints();
        this.electron.ipcRenderer.send("create-webcam-preview", webcamConfig);
        this.detachedWebcamWindowActive = true;
    }

    // using list with matching ids instead of one path value in case multiple devices have same id
    private getPathsWithId(id: string): string[] {
        let webcamPaths: string[] = [];
        this.webcamDropdownData.forEach((webcamDevice) => {
            if (webcamDevice.id == id) {
                webcamPaths.push(webcamDevice.path);
            }
        });
        return webcamPaths;
    }

    public async setSliderValue(
        sliderValue: number,
        configParameter: string
    ): Promise<void> {
        this.mutex.runExclusive(() => {
            this.executeWebcamCtrls(configParameter, sliderValue);
        });
    }

    private async executeWebcamCtrls(
        parameter: string,
        value: number | string
    ): Promise<void> {
        let webcamPaths = this.getPathsWithId(this.selectedWebcam.id);

        for (let devicePath of webcamPaths) {
            try {
                await this.utils.execCmd(
                    "python3 " +
                        this.getWebcamCtrlPythonPath() +
                        ` -d ${devicePath} -c ${parameter}=${value}`
                );
            } catch (error) {
                console.log(error);
                this.mutex.release();
                this.webcamNotAvailabledDialog();
                await this.reloadWebcamList(undefined);
            }
        }
    }

    private async executeWebcamCtrlsList(
        controls: WebcamPresetValues
    ): Promise<void> {
        let controlStr = "";
        // todo: make cleaner
        Object.entries(controls).forEach((webcamPresetEntry) => {
            if (
                webcamPresetEntry[1] != undefined &&
                webcamPresetEntry[0] != "fps" &&
                webcamPresetEntry[0] != "resolution"
            ) {
                controlStr =
                    controlStr +
                    `${webcamPresetEntry[0]}=${webcamPresetEntry[1]},`;
            }
        });

        let webcamPaths = this.getPathsWithId(this.selectedWebcam.id);

        for (let devicePath of webcamPaths) {
            try {
                await this.utils.execCmd(
                    "python3 " +
                        this.getWebcamCtrlPythonPath() +
                        ` -d ${devicePath} -c ${controlStr}`
                );
            } catch (error) {
                console.log(error);
                this.mutex.release();
                this.webcamNotAvailabledDialog();
                await this.reloadWebcamList(undefined);
            }
        }
    }

    public async setCheckboxValue(
        checked: Boolean,
        configParameter: string
    ): Promise<void> {
        this.mutex.runExclusive(async () => {
            await this.executeWebcamCtrls(
                configParameter,
                String(Number(checked))
            );
            this.setSliderEnabledStatus();
            // white_balance_temperature must be set after disabling auto to take effect and small delay required
            if (
                (configParameter == "white_balance_temperature_auto" ||
                    configParameter == "white_balance_automatic") &&
                checked == false &&
                this.webcamFormGroup.get("white_balance_temperature") != null
            ) {
                await this.setTimeout(250);
                await this.executeWebcamCtrls(
                    "white_balance_temperature",
                    this.webcamFormGroup.get("white_balance_temperature").value
                );
            }
        });
    }

    public async setMenuConfigValue(
        configParameter: string,
        option: string
    ): Promise<void> {
        await this.executeWebcamCtrls(configParameter, option);

        // absolute exposure must be set after disabling auto to take effect
        if (configParameter == "exposure_auto" && option == "manual_mode") {
            await this.executeWebcamCtrls(
                "exposure_absolute",
                this.webcamFormGroup.get("exposure_absolute").value
            );
        }
        if (configParameter == "auto_exposure" && option == "manual_mode") {
            await this.executeWebcamCtrls(
                "exposure_time_absolute",
                this.webcamFormGroup.get("exposure_time_absolute").value
            );
        }
    }

    public async setOptionsMenuValue(
        event: MatOptionSelectionChange,
        configParameter: string,
        option: string
    ): Promise<void> {
        if (event.isUserInput) {
            this.mutex.runExclusive(async () => {
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

    private setFormgroupValidator(
        setting: WebcamDeviceInformation
    ): ValidatorFn {
        return (control: AbstractControl): ValidationErrors | null => {
            let errors = null;
            const value = control.value;
            if (setting.type == "slider") {
                if (value < setting.min) {
                    errors = { min: setting.min, actual: value };
                }
                if (value > setting.max) {
                    errors = { max: setting.max, actual: value };
                }
            }
            if (setting.type == "bool") {
                if (typeof value != "boolean")
                    errors = { type: "boolean", actual: typeof value };
            }
            if (setting.type == "menu") {
                if (!setting.options.includes(value)) {
                    errors = { options: setting.options, actual: value };
                }
            }
            return errors;
        };
    }

    private convertSettingsToFormGroup(
        settings: WebcamDeviceInformation[]
    ): FormGroup {
        this.presetSettings = settings;
        let group = {};
        let categories = [];
        settings.forEach((setting) => {
            group[setting.name] = new FormControl(
                {
                    value: setting.current,
                    disabled: !setting.active,
                },
                this.setFormgroupValidator(setting)
            );
            categories.push(setting.category);
        });
        this.webcamCategories = [...new Set(categories)];
        return new FormGroup(group);
    }

    private async webcamNotAvailableOtherAccessDialog(): Promise<void> {
        let config = {
            title: $localize`:@@webcamDialogNotAvailableTitle:Access error`,
            description: $localize`:@@webcamDialogNotAvailableOtherAccessDescription:Current Webcam can not be accessed. Another application is most likely accessing your webcam. Resolution and frames per second settings only apply for TCC preview.`,
            buttonConfirmLabel: $localize`:@@dialogContinue:Continue`,
        };
        this.utils.confirmDialog(config).then();
    }

    private async setWebcamWithConfig(
        config: WebcamConstraints
    ): Promise<void> {
        await navigator.mediaDevices
            .getUserMedia({
                video: config,
            })
            .then(
                async (stream) => {
                    document.getElementById("hidden").style.display = "flex";
                    this.video.nativeElement.srcObject = stream;
                    this.mediaDeviceStream = stream;
                },
                async (err) => {
                    document.getElementById("hidden").style.display = "none";
                    if (!this.warnedOnceWebcamAccessError) {
                        this.warnedOnceWebcamAccessError = true;
                        await this.webcamNotAvailableOtherAccessDialog();
                        await this.reloadWebcamList();
                    }
                }
            );

        if (this.mediaDeviceStream) {
            this.mediaDeviceStream.getVideoTracks()[0].onended = () => {
                this.handleVideoEnded();
            };
        }
    }

    private unsetLoading(initComplete: boolean = false) {
        if (initComplete) {
            this.webcamInitComplete = true;
        }
        this.spinnerActive = false;
        this.webcamGuard.setLoadingStatus(false);
        this.utils.pageDisabled = false;
        this.cdref.detectChanges();
    }

    public getWebcamSettingNames(): string[] {
        return Object.keys(this.webcamFormGroup.getRawValue());
    }

    private checkIfPresetNameAvailable(checkPresetName: string): boolean {
        let presetNames: string[] = [];
        this.webcamPresetsCurrentDevice.forEach((preset) => {
            presetNames.push(preset.presetName);
        });
        return !presetNames.includes(checkPresetName);
    }

    // Some configurations depend on each other and while one is active, another can't be active
    private setSliderEnabledStatus() {
        if (
            (this.webcamFormGroup.getRawValue()
                ?.white_balance_temperature_auto ||
                this.webcamFormGroup.getRawValue()?.white_balance_automatic) &&
            "white_balance_temperature" in this.webcamFormGroup.getRawValue()
        ) {
            this.webcamFormGroup.get("white_balance_temperature").disable();
        }
        if (
            !(
                this.webcamFormGroup.getRawValue()
                    ?.white_balance_temperature_auto ||
                this.webcamFormGroup.getRawValue()?.white_balance_automatic
            ) &&
            "white_balance_temperature" in this.webcamFormGroup.getRawValue()
        ) {
            this.webcamFormGroup.get("white_balance_temperature").enable();
        }

        if (
            "exposure_auto_priority" in this.webcamFormGroup.getRawValue() &&
            "exposure_absolute" in this.webcamFormGroup.getRawValue()
        ) {
            if (
                this.webcamFormGroup.getRawValue().exposure_auto ==
                "aperture_priority_mode"
            ) {
                this.webcamFormGroup.get("exposure_absolute").disable();
            }
            if (
                this.webcamFormGroup.getRawValue().exposure_auto !=
                "aperture_priority_mode"
            ) {
                this.webcamFormGroup.get("exposure_absolute").enable();
            }
        }

        if (
            "auto_exposure" in this.webcamFormGroup.getRawValue() &&
            "exposure_time_absolute" in this.webcamFormGroup.getRawValue()
        ) {
            if (
                this.webcamFormGroup.getRawValue().auto_exposure ==
                "aperture_priority_mode"
            ) {
                this.webcamFormGroup.get("exposure_time_absolute").disable();
            }
            if (
                this.webcamFormGroup.getRawValue().auto_exposure !=
                "aperture_priority_mode"
            ) {
                this.webcamFormGroup.get("exposure_time_absolute").enable();
            }
        }
    }

    private checkIfFormgroupValid(): Boolean {
        let valid = true;
        Object.keys(this.webcamFormGroup.controls).forEach((key) => {
            const controlErrors: ValidationErrors =
                this.webcamFormGroup.get(key).errors;
            if (controlErrors != null) {
                valid = false;
            }
        });
        return valid;
    }

    private notValidPresetDialog() {
        let config = {
            title: $localize`:@@webcamDialogNotValidPresetTitle:Webcam preset faulty`,
            description: $localize`:@@webcamDialogNotValidPresetDialog:The webcam preset contains invalid configurations and therefore won't be applied. Reverting to default preset.`,
            buttonConfirmLabel: $localize`:@@dialogContinue:Continue`,
        };
        this.utils.confirmDialog(config).then();
    }

    private createWebcamConfig(config: WebcamPresetValues): WebcamConstraints {
        let [webcamWidth, webcamHeight] = config["resolution"].split("x");
        return {
            deviceId: { exact: this.selectedWebcam.deviceId },
            width: { exact: Number(webcamWidth) },
            height: { exact: Number(webcamHeight) },
            frameRate: { exact: Number(config["fps"]) },
        };
    }

    private async configMismatchDialog() {
        let config = {
            title: $localize`:@@webcamDialogMismatchConfigValuesTitle:Mismatch of config values`,
            description: $localize`:@@webcamDialogMismatchConfigValuesDialog:Due to a recent linux kernel update or due to a misconfigured config file unknown values were found and it can not be guranteed that the preset is unchanged since the last time it was saved. Do you want to resave all presets with adjusted values? This will fix compatibility issues but may result in changed presets. If you decline, the adjusted presets will only be saved the next time you save a preset, because presets need to be adjusted to be fully usable again. If you did not modify the config file manually, make sure that you use the latest version of TCC. If the issue persists, please inform Tuxedo about this and mention the used linux kernel version and devices used.`,
            buttonConfirmLabel: $localize`:@@dialogSaveAdjustedPresets:Save adjusted presets`,
            buttonAbortLabel: $localize`:@@dialogAbort:Cancel`,
        };
        return this.utils.confirmDialog(config).then((result) => {
            return result.confirm;
        });
    }

    // config names depend on linux kernel version and this function adjusts in case rename was found
    private async checkConfig(preset: WebcamPreset) {
        let formGroupKeys = Object.keys(this.webcamFormGroup.getRawValue());
        let configKeys = Object.keys(preset.webcamSettings);

        let renamed: boolean = false;
        let unknown: boolean = false;
        let renamedKeys: string[] = [];

        this.v4l2Renames.forEach((knownRename) => {
            let includedFormGroupKey = knownRename.find((configName) =>
                formGroupKeys.includes(configName)
            );

            let includedConfigKey = knownRename.find((configName) =>
                configKeys.includes(configName)
            );

            if (includedFormGroupKey && includedConfigKey) {
                if (includedFormGroupKey != includedConfigKey) {
                    let value = preset.webcamSettings[includedConfigKey];
                    delete preset.webcamSettings[includedConfigKey];
                    preset.webcamSettings[includedFormGroupKey] = value;
                    renamed = true;
                    renamedKeys.push(includedConfigKey);
                }
            }
            if (
                (includedFormGroupKey && !includedConfigKey) ||
                (!includedFormGroupKey && includedConfigKey)
            ) {
                delete preset.webcamSettings[includedConfigKey];
                unknown = true;
            }
        });

        let unresolvedKeys = configKeys
            .filter((item) => formGroupKeys.indexOf(item) < 0)
            .filter((item) => renamedKeys.indexOf(item) < 0);
        if (unresolvedKeys.length > 0) {
            unknown = true;
        }

        return unknown;
    }

    async checkAllPresetsForCurrentDevice() {
        this.mutex.runExclusive(async () => {
            let unknown_all = [];

            if (environment.production) {
                this.v4l2Renames = this.configHandler.readV4l2Names();
            } else {
                this.v4l2Renames = this.configHandler.readV4l2Names(
                    this.electron.process.cwd() +
                        "/src/cameractrls/v4l2_kernel_names.json"
                );
            }

            for (const profile of this.webcamPresetsCurrentDevice) {
                let unknown = await this.checkConfig(profile);
                unknown_all.push(unknown);
            }

            if (unknown_all.includes(true)) {
                if (await this.configMismatchDialog()) {
                    await this.savePreset(
                        this.selectedPreset.presetName,
                        true,
                        false
                    );
                }
            }
        });
    }

    public async applyPreset(
        config: WebcamPresetValues,
        markAsPristine: boolean = false,
        setViewWebcam: boolean = false
    ): Promise<void> {
        this.mutex.runExclusive(async () => {
            this.unsetLoading(false);
            this.setLoading();
            this.stopWebcam();

            if (markAsPristine) {
                this.webcamFormGroup.markAsPristine();
            }

            if (!this.detachedWebcamWindowActive) {
                document.getElementById("video").style.visibility = "hidden";
            }

            this.webcamFormGroup.patchValue(config);
            if (!this.checkIfFormgroupValid()) {
                this.notValidPresetDialog();
                this.applyPreset(this.defaultSettings);
                return;
            }

            let webcamConfig = this.createWebcamConfig(config);
            this.setSliderEnabledStatus();

            if (!this.detachedWebcamWindowActive) {
                await this.setWebcamWithConfig(webcamConfig);
                await this.executeWebcamCtrlsList(config);
                await this.setTimeout(500);

                document.getElementById("video").style.visibility = "visible";
                this.unsetLoading(true);
            }

            if (this.detachedWebcamWindowActive) {
                this.electron.ipcRenderer.send(
                    "setting-webcam-with-loading",
                    webcamConfig
                );
            }
            if (setViewWebcam) {
                this.viewWebcam = config;
            }
        });
    }

    private setDefaultSettings(settings: WebcamDeviceInformation[]) {
        this.defaultSettings = {};
        settings.forEach((setting) => {
            if (setting.default != undefined) {
                this.defaultSettings[setting.name] = setting.default;
            } else {
                this.defaultSettings[setting.name] = setting.current;
            }
        });
    }

    private async reloadConfigValues(): Promise<void> {
        await this.getWebcamSettings().then(async (data) => {
            this.webcamFormGroup = this.convertSettingsToFormGroup(
                JSON.parse(data)
            );
            this.viewWebcam = this.webcamFormGroup.getRawValue();
            this.setDefaultSettings(JSON.parse(data));
        });
    }

    private filterPresetsForCurrentDevice() {
        this.webcamPresetsCurrentDevice = [];
        this.webcamPresetsOtherDevices = [];
        this.setDefaultPreset();

        if (this.allPresetData != undefined) {
            this.allPresetData = this.allPresetData.filter(
                (webcamPreset) => webcamPreset.presetName != "Default"
            );

            this.allPresetData.forEach((config) => {
                if (config.webcamId == this.selectedWebcam.id) {
                    this.webcamPresetsCurrentDevice.push(config);
                } else {
                    this.webcamPresetsOtherDevices.push(config);
                }
            });
        }
    }

    private askOverwritePreset(presetName: string) {
        let config = {
            title: $localize`:@@webcamDialogAskOverwriteTitle:Webcam preset not avaiable`,
            description: $localize`:@@webcamDialogAskOverwriteDescription:Do you want to overwrite the webcam preset?`,
            buttonAbortLabel: $localize`:@@dialogAbort:Cancel`,
            buttonConfirmLabel: $localize`:@@dialogContinue:Continue`,
        };
        this.utils.confirmDialog(config).then((confirm) => {
            if (confirm) {
                this.savePreset(presetName);
            }
        });
    }

    public async savePreset(
        presetName: string,
        overwrite: boolean = false,
        setActive: boolean = true
    ): Promise<boolean> {
        let saveComplete: boolean = false;
        this.utils.pageDisabled = true;
        let currentPreset = this.getWebcamPreset(presetName);

        let webcamConfigs = this.webcamPresetsCurrentDevice.filter(
            (webcamPreset) => webcamPreset.presetName !== "Default"
        );
        if (overwrite) {
            webcamConfigs.forEach((preset) => {
                if (setActive) {
                    preset.active = false;
                    if (preset.presetName == presetName) {
                        preset.active = true;
                        preset.webcamSettings = currentPreset.webcamSettings;
                    }
                }

                if (!setActive) {
                    if (preset.presetName == presetName) {
                        preset.webcamSettings = currentPreset.webcamSettings;
                    }
                }
            });

            webcamConfigs = webcamConfigs.concat(
                this.webcamPresetsOtherDevices
            );
        }
        if (!overwrite) {
            webcamConfigs.forEach((preset) => (preset.active = false));
            webcamConfigs = webcamConfigs.concat(
                currentPreset,
                this.webcamPresetsOtherDevices
            );
        }

        await this.config
            .pkexecWriteWebcamConfigAsync(webcamConfigs)
            .then((confirm) => {
                if (confirm) {
                    if (setActive) {
                        this.activePreset = currentPreset;
                        this.selectedPreset = currentPreset;
                    }

                    this.viewWebcam = this.webcamFormGroup.getRawValue();
                    this.webcamFormGroup.markAsPristine();

                    if (overwrite) {
                        this.webcamPresetsCurrentDevice.forEach((preset) => {
                            if (preset.presetName == presetName) {
                                preset.webcamSettings =
                                    currentPreset.webcamSettings;
                            }
                        });
                        this.allPresetData.forEach((preset) => {
                            if (preset.presetName == presetName) {
                                preset.webcamSettings =
                                    currentPreset.webcamSettings;
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

    private noPresetNameWarningDialog() {
        let config = {
            title: $localize`:@@webcamDialogPresetNameUnsetTitle:The webcam preset was not saved`,
            description: $localize`:@@webcamDialogPresetNameUnsetDescription:The webcam preset name was no set and thus the preset was not saved.`,
            buttonConfirmLabel: $localize`:@@dialogContinue:Continue`,
        };
        this.utils.confirmDialog(config).then();
    }

    private defaultOverwriteNotAllowed() {
        let config = {
            title: $localize`:@@webcamDialogDefaultCanNotOverwriteTitle:Overwriting default settings failed`,
            description: $localize`:@@webcamDialogDefaultCanNotOverwriteDescription:Please select a different name for your webcam preset.`,
            buttonConfirmLabel: $localize`:@@dialogContinue:Continue`,
        };
        this.utils.confirmDialog(config).then();
    }

    private async askOverwriteOrNewPreset(): Promise<string | undefined> {
        let config = {
            title: $localize`:@@webcamDialogAskPresetOverwriteTitle:Overwrite webcam preset?`,
            description: $localize`:@@webcamDialogAskPresetOverwriteDescription:Do you want to overwrite the current webcam preset or create a new one?`,
            labelData: [
                {
                    label: $localize`:@@dialogOverwrite:Overwrite`,
                    value: "overwrite",
                },
                {
                    label: $localize`:@@dialogNewPreset:New webcam preset`,
                    value: "new",
                },
            ],
        };
        return this.utils.choiceDialog(config).then((dialogResult) => {
            return dialogResult["value"];
        });
    }

    async askPresetNameDialog(): Promise<string> {
        let config = {
            title: $localize`:@@webcamDialogAskPresetNameTitle:Saving webcam preset`,
            description: $localize`:@@webcamDialogAskPresetNameDescription:Set name for webcam preset.`,
            prefill: "",
            buttonAbortLabel: $localize`:@@dialogAbort:Cancel`,
            buttonConfirmLabel: $localize`:@@dialogContinue:Continue`,
        };
        return this.utils.inputTextDialog(config).then((x) => {
            return x;
        });
    }

    public async handlePresetName() {
        let presetName = await this.askPresetNameDialog();
        if (presetName == undefined) {
            this.noPresetNameWarningDialog();
            return;
        }
        if (presetName == "Default") {
            this.defaultOverwriteNotAllowed();
            return;
        }
        if (this.checkIfPresetNameAvailable(presetName)) {
            this.savePreset(presetName);
        } else {
            this.askOverwritePreset(presetName);
        }
    }

    public async savingWebcamPreset() {
        let selection: string | undefined;
        if (this.selectedPreset.presetName == "Default") {
            await this.handlePresetName();
            return;
        }
        selection = await this.askOverwriteOrNewPreset();
        if (selection == undefined) {
            return;
        }
        if (selection == "overwrite") {
            this.savePreset(this.selectedPreset.presetName, true);
        }
        if (selection == "new") {
            await this.handlePresetName();
        }
    }

    public mouseup() {
        this.mutex.runExclusive(() => {
            if (this.timer) {
                clearInterval(this.timer);
            }
        });
    }

    private async valueOffsetFunc(
        configParameter: string,
        offset: number
    ): Promise<void> {
        this.webcamFormGroup.get(configParameter).markAsDirty();

        let min = this.getOptionValue(configParameter, "min");
        let max = this.getOptionValue(configParameter, "max");
        let newValue =
            this.webcamFormGroup.controls[configParameter].value + offset;
        if (newValue < min) {
            newValue = min;
        } else if (newValue > max) {
            newValue = max;
        }

        this.webcamFormGroup.controls[configParameter].setValue(newValue);
        await this.executeWebcamCtrls(configParameter, newValue);
        this.cdref.detectChanges();
    }

    public mousedown(configParameter: string, offset: number) {
        this.mutex.runExclusive(() => {
            this.valueOffsetFunc(configParameter, offset);
            this.timer = setInterval(() => {
                this.valueOffsetFunc(configParameter, offset);
            }, 200);
        });
    }

    public showAdvancedSettings() {
        this.easyModeActive = false;
    }

    public disableAdvancedSettings() {
        this.easyModeActive = true;
    }

    public getOptionValue(
        configName: string,
        configVar: string
    ): number | string {
        let value: number | string;
        this.presetSettings.forEach((webcamDeviceInformationEntry) => {
            if (webcamDeviceInformationEntry.name == configName) {
                value = webcamDeviceInformationEntry[configVar];
            }
        });
        return value;
    }

    private setDefaultPreset(active: boolean = false) {
        this.defaultPreset = {
            presetName: "Default",
            active: active,
            webcamId: this.selectedWebcam.id,
            webcamSettings: this.defaultSettings,
        };
        this.selectedPreset = this.defaultPreset;

        this.webcamPresetsCurrentDevice =
            this.webcamPresetsCurrentDevice.filter(
                (webcamPreset) => webcamPreset.presetName != "Default"
            );
        this.webcamPresetsCurrentDevice.unshift(this.defaultPreset);
    }

    applyConfigAllowed() {
        if (
            this.activePreset != this.selectedPreset &&
            !this.webcamFormGroup.dirty
        ) {
            return true;
        }
        return false;
    }

    private async loadingPresetData(): Promise<void> {
        await this.reloadConfigValues();
        if (fs.existsSync(TccPaths.WEBCAM_FILE)) {
            this.allPresetData = this.configHandler.readWebcamSettings();
            this.filterPresetsForCurrentDevice();

            await this.checkAllPresetsForCurrentDevice();

            let activePresets = this.webcamPresetsCurrentDevice.filter(
                (webcamPreset) => webcamPreset.active == true
            );

            if (activePresets.length > 0) {
                this.activePreset = this.selectedPreset = activePresets[0];
                await this.applyPreset(
                    activePresets[0].webcamSettings,
                    false,
                    true
                );
            }
            if (activePresets.length == 0) {
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

    private defaultPresetWarningDialog() {
        let config = {
            title: $localize`:@@webcamDialogDefaultCanNotDeleteTitle:Deleting default webcam preset failed`,
            description: $localize`:@@webcamDialogDefaultCanNotDeleteDescription:The default preset cannot be deleted.`,
            buttonConfirmLabel: $localize`:@@dialogContinue:Continue`,
        };
        this.utils.confirmDialog(config).then();
    }

    private async presetDeleteConfirmDialog() {
        let config = {
            title: $localize`:@@webcamDialogDeletePresetConfirmTitle:Deleting webcam preset`,
            description: $localize`:@@webcamDialogDeletePresetConfirmDescription:Are you sure that you want to delete this webcam preset?`,
            buttonAbortLabel: $localize`:@@dialogAbort:Cancel`,
            buttonConfirmLabel: $localize`:@@dialogContinue:Continue`,
        };
        return this.utils.confirmDialog(config).then((dialogResult) => {
            return dialogResult["confirm"];
        });
    }

    public async deletePreset(): Promise<void> {
        this.mutex.runExclusive(async () => {
            if (this.selectedPreset.presetName == "Default") {
                this.defaultPresetWarningDialog();
                return;
            }
            let confirmed = await this.presetDeleteConfirmDialog();
            if (confirmed) {
                if (this.selectedPreset.presetName == "Default") {
                    this.defaultPresetWarningDialog();
                    return;
                }

                this.utils.pageDisabled = true;

                let currentConfigs = this.webcamPresetsCurrentDevice.filter(
                    (webcamPreset) =>
                        webcamPreset.presetName !=
                            this.selectedPreset.presetName &&
                        webcamPreset.presetName != "Default"
                );
                let webcamConfigs = currentConfigs.concat(
                    this.webcamPresetsOtherDevices
                );

                await this.config
                    .pkexecWriteWebcamConfigAsync(webcamConfigs)
                    .then((confirm) => {
                        if (confirm) {
                            this.activePreset = this.defaultPreset;

                            this.webcamPresetsCurrentDevice = currentConfigs;
                            this.webcamPresetsCurrentDevice.unshift(
                                this.defaultPreset
                            );

                            this.allPresetData = webcamConfigs;
                            this.webcamFormGroup.markAsPristine();
                            this.selectedPreset = this.defaultPreset;
                            this.applyPreset(this.defaultSettings);
                        }
                    });
                this.utils.pageDisabled = false;
            }
        });
    }

    public getPercentValue(preset: string): number {
        let max = Number(this.getOptionValue(preset, "max"));
        let min = Number(this.getOptionValue(preset, "min"));
        let current = this.webcamFormGroup.get(preset).value;
        return Math.round(((current - min) * 100) / (max - min));
    }

    public async discardFormInput(): Promise<void> {
        this.webcamFormGroup.markAsPristine();
        this.applyPreset(this.viewWebcam);
    }

    public comparePresets(
        preset1: WebcamPreset,
        preset2: WebcamPreset
    ): boolean {
        return preset1 && preset2
            ? preset1.presetName === preset2.presetName
            : preset2 === preset2;
    }

    private setTimeout(delay: number) {
        return new Promise((resolve) => setTimeout(resolve, delay));
    }

    public modeSelectionTriggered(mode: MatTab) {
        if (mode.textLabel == "Simple") {
            this.disableAdvancedSettings();
            this.selectedModeTabIndex = "Simple";
        }
        if (mode.textLabel == "Advanced") {
            this.showAdvancedSettings();
            this.selectedModeTabIndex = "Advanced";
        }
    }

    checkValid(setting: string) {
        return this.webcamFormGroup.get(setting).status == "VALID";
    }

    public getConfigTranslation(configText: string): string {
        if (configText == "exposure_auto" || configText == "auto_exposure") {
            return $localize`:@@webcamExposureAuto:Exposure, Auto`;
        }
        if (configText == "exposure_time_absolute") {
            return $localize`:@@webcamExposureTimeAbsolute:Exposure time (absolute)`;
        }
        if (configText == "exposure_dynamic_framerate") {
            return $localize`:@@webcamExposureDynamicFramerate:Exposure dynamic framerate`;
        }
        if (configText == "exposure_absolute") {
            return $localize`:@@webcamExposureAbsolute:Exposure (Absolute)`;
        }
        if (configText == "exposure_auto_priority") {
            return $localize`:@@webcamExposureAutoPriority:Exposure, Auto Priority`;
        }
        if (configText == "gain") {
            return $localize`:@@webcamGain:Gain`;
        }
        if (configText == "backlight_compensation") {
            return $localize`:@@webcamBacklightCompensation:Backlight Compensation`;
        }
        if (configText == "white_balance_automatic") {
            return $localize`:@@webcamWhiteBalanceAutomatic:White Balance, Auto`;
        }
        if (configText == "white_balance_temperature_auto") {
            return $localize`:@@webcamWhiteBalanceTemperatureAuto:White Balance Temperature, Auto`;
        }
        if (configText == "white_balance_temperature") {
            return $localize`:@@whiteBalanceTemperature:White Balance Temperature`;
        }
        if (configText == "brightness") {
            return $localize`:@@webcamBrightness:Brightness`;
        }
        if (configText == "contrast") {
            return $localize`:@@webcamContrast:Contrast`;
        }
        if (configText == "saturation") {
            return $localize`:@@webcamSaturation:Saturation`;
        }
        if (configText == "sharpness") {
            return $localize`:@@webcamSharpness:Sharpness`;
        }
        if (configText == "hue") {
            return $localize`:@@webcamHue:Hue`;
        }
        if (configText == "gamma") {
            return $localize`:@@webcamGamma:Gamma`;
        }
        if (configText == "resolution") {
            return $localize`:@@webcamResolution:Resolution`;
        }
        if (configText == "fps") {
            return $localize`:@@webcamFps:Frames per Second`;
        }
        if (configText == "aperture_priority_mode") {
            return $localize`:@@webcamAperturePriorityMode:Aperture Priority Mode`;
        }
        if (configText == "manual_mode") {
            return $localize`:@@webcamManualMode:Manual Mode`;
        }
        return configText;
    }

    public getTitleTranslation(configText: string): string {
        if (configText == "General") {
            return $localize`:@@webcamTitleGeneral:General`;
        }
        if (configText == "Exposure") {
            return $localize`:@@webcamTitleExposure:Exposure`;
        }
        if (configText == "Dynamic Range") {
            return $localize`:@@webcamTitleDynamicRange:Dynamic Range`;
        }
        if (configText == "Balance") {
            return $localize`:@@webcamTitleBalance:Balance`;
        }
        if (configText == "Color") {
            return $localize`:@@webcamTitleColor:Color`;
        }
        if (configText == "Capture") {
            return $localize`:@@webcamTitleCapture:Capture`;
        }
        return configText;
    }

    ngOnDestroy() {
        this.stopWebcam();
        this.subscriptions.unsubscribe();

        if (this.detachedWebcamWindowActive) {
            this.electron.ipcRenderer.send("close-webcam-preview");
        }
    }
}
