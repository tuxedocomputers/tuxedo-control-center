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
import { CompatibilityService } from "../compatibility.service";
import { UtilsService } from "../utils.service";
import { ChangeDetectorRef } from "@angular/core";
import { WebcamGuardService } from "../webcam.service";
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

@Component({
    selector: "app-camera-settings",
    templateUrl: "./camera-settings.component.html",
    styleUrls: ["./camera-settings.component.scss"],
})
export class CameraSettingsComponent implements OnInit {
    // from profile settings
    public gridParams = {
        cols: 9,
        headerSpan: 4,
        valueSpan: 2,
        inputSpan: 3,
    };

    @ViewChild("video", { static: true })
    public video: ElementRef;
    mediaDeviceStream: MediaStream;

    expandedRegions: { [key: string]: boolean } = {};
    newWindow = null;
    timer: NodeJS.Timeout = null;
    subscriptions: Subscription = new Subscription();
    mutex = new Mutex();

    spinnerActive: boolean = false;
    detachedWebcamWindowActive: Boolean = false;

    webcamDropdownData: WebcamDevice[] = [];
    selectedWebcamDeviceId: string;
    selectedWebcamId: string;
    webcamInitComplete: boolean = false;
    webcamConfig: WebcamConstraints = undefined;
    notThisWebcamConfigs: WebcamPreset[] = [];
    thisWebcamConfigs: WebcamPreset[] = [];
    webcamFormGroup: FormGroup = new FormGroup({});
    webcamCategories: string[] = [];

    presetDataFromJson: WebcamPreset[];
    presetSettings: WebcamDeviceInformation[];
    defaultPreset: WebcamPreset;
    selectedPreset: WebcamPreset;
    selectedCamera: WebcamDevice;

    defaultSettings: WebcamPresetValues;
    viewWebcam: WebcamPresetValues;

    // todo: getting from config?
    easyOptions: string[] = ["brightness", "contrast", "resolution"];
    easyModeActive: boolean = true;

    constructor(
        private electron: ElectronService,
        private utils: UtilsService,
        public compat: CompatibilityService,
        private cdref: ChangeDetectorRef,
        private webcamGuard: WebcamGuardService,
        private config: ConfigService
    ) {}
    private configHandler: ConfigHandler;

    async ngOnInit() {
        this.webcamGuard.setLoadingStatus(true);
        this.utils.pageDisabled = true;

        this.configHandler = new ConfigHandler(
            TccPaths.SETTINGS_FILE,
            TccPaths.PROFILES_FILE,
            TccPaths.WEBCAM_FILE,
            TccPaths.AUTOSAVE_FILE,
            TccPaths.FANTABLES_FILE
        );

        const cameraApplyObservable = fromEvent(
            this.electron.ipcRenderer,
            "apply-controls"
        );
        this.subscriptions.add(
            cameraApplyObservable.subscribe(async () => {
                let controls = this.getControls(
                    this.webcamFormGroup.getRawValue()
                );
                await this.executeCameraCtrlsList(controls);
            })
        );

        const cameraWindowObservable = fromEvent(
            this.electron.ipcRenderer,
            "external-camera-preview-closed"
        );
        this.subscriptions.add(
            cameraWindowObservable.subscribe(async () => {
                this.detachedWebcamWindowActive = false;
                document.getElementById("hidden").style.display = "flex";
                this.applyConfig(this.webcamFormGroup.getRawValue());
            })
        );

        this.reloadWebcamList();
    }

    public async reloadWebcamList() {
        if (this.mutex.isLocked()) return;
        this.mutex.runExclusive(async () => {
            let webcamData = await this.setWebcamDeviceInformation();
            this.webcamDropdownData = webcamData;
            if (webcamData.length == 0) {
                await this.stopWebcam();
                // todo: trying to make it cleaner
                this.webcamInitComplete = false;
                this.webcamGuard.setLoadingStatus(false);
                this.utils.pageDisabled = false;
                this.cdref.detectChanges();
                return;
            } else {
                this.selectedWebcamDeviceId = webcamData[0].deviceId;
                this.selectedWebcamId = webcamData[0].id;
                this.selectedCamera = webcamData[0];
                await this.loadingConfigDataFromJSON();
                this.unsetLoading();
            }
        });
    }

    ngAfterContentChecked() {
        this.cdref.detectChanges();
    }

    getWebcamPaths() {
        return new Promise<WebcamPath>((resolve) => {
            this.utils
                .execFile(
                    "bash " +
                        this.electron.process.cwd() +
                        "/src/bash-scripts/get_camera_paths.sh"
                )
                .then((data) => {
                    resolve(JSON.parse(data.toString()));
                })
                .catch((error) => {
                    console.log(error);
                    resolve(null);
                });
        });
    }

    getWebcamDevices() {
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

    getDeviceData(
        devices: (InputDeviceInfo | MediaDeviceInfo)[],
        cameraId: string
    ): [string, string] {
        for (const device of devices) {
            let deviceId = device.label.match(/\((.*:.*)\)/)[1];
            if (deviceId == cameraId) {
                return [device.label, device.deviceId];
            }
        }
    }

    async setWebcamDeviceInformation(): Promise<WebcamDevice[]> {
        let devices = await this.getWebcamDevices();
        return new Promise<WebcamDevice[]>((resolve) => {
            let dropdownData = [];
            this.getWebcamPaths().then((webcamPaths) => {
                for (const [cameraPath, cameraId] of Object.entries(
                    webcamPaths
                )) {
                    let [label, deviceId] = this.getDeviceData(
                        devices,
                        cameraId
                    );
                    dropdownData.push({
                        label: label,
                        deviceId: deviceId,
                        id: cameraId,
                        path: `/dev/${cameraPath}`,
                    });
                }
                resolve(dropdownData);
            });
        });
    }

    async cameraNotAvailabledDialog() {
        let config = {
            title: "Camera can not be accessed",
            description: "Camera can not be accessed.",
            buttonConfirmLabel: "Continue",
        };
        this.utils.confirmDialog(config).then();
    }

    public getCameraSettings(): Promise<string> {
        return new Promise<string>((resolve) => {
            this.utils
                .execFile(
                    "python3 " +
                        this.electron.process.cwd() +
                        `/src/cameractrls/cameractrls.py -d ${this.selectedCamera.path}`
                )
                .then((data) => {
                    resolve(data.toString());
                })
                .catch((error) => {
                    this.cameraNotAvailabledDialog();
                    this.reloadWebcamList();
                });
        });
    }

    async cameraUnpluggedDialog() {
        let config = {
            title: "Camera unplugged",
            description: "Camera got unplugged.",
            buttonConfirmLabel: "Continue",
        };
        this.utils.confirmDialog(config).then();
    }

    async checkIfUnplugged() {
        this.mediaDeviceStream.getVideoTracks()[0].onended = async () => {
            await this.cameraUnpluggedDialog();
            this.reloadWebcamList();
        };
    }

    async stopWebcam() {
        await this.video.nativeElement.pause();
        if (this.mediaDeviceStream != undefined) {
            for (const track of this.mediaDeviceStream.getTracks()) {
                track.stop();
            }
        }
        this.video.nativeElement.srcObject = null;
    }

    setLoading() {
        this.spinnerActive = true;
        this.webcamGuard.setLoadingStatus(true);
        this.cdref.detectChanges();
    }

    public async setWebcam(webcamPreset: WebcamDevice) {
        this.setLoading();
        await this.stopWebcam();

        this.selectedWebcamId = webcamPreset.id;
        this.selectedWebcamDeviceId = webcamPreset.deviceId;

        await this.reloadConfigValues();
        await this.filterPresetsForCurrentDevice();

        let webcamConfig = await this.getDefaultWebcamConfig(
            webcamPreset.deviceId
        );

        if (this.detachedWebcamWindowActive) {
            this.electron.ipcRenderer.send(
                "setting-webcam-with-loading",
                webcamConfig
            );
        }

        // todo: load last active preset
        if (!this.detachedWebcamWindowActive) {
            await this.applyConfig(this.defaultSettings);
        }
    }

    getCurrentWebcamConfig() {
        let [webcamWidth, webcamHeight] = this.webcamFormGroup
            .getRawValue()
            ["resolution"].split("x");
        let fps = this.webcamFormGroup.getRawValue()["fps"];
        return {
            deviceId: { exact: this.selectedWebcamDeviceId },
            width: { exact: Number(webcamWidth) },
            height: { exact: Number(webcamHeight) },
            frameRate: { exact: Number(fps) },
        };
    }

    public async openWindow() {
        await this.stopWebcam();
        document.getElementById("hidden").style.display = "none";
        let webcamConfig = this.getCurrentWebcamConfig();
        this.electron.ipcRenderer.send("create-webcam-preview", webcamConfig);
        this.detachedWebcamWindowActive = true;
    }

    public async setSliderValue(sliderValue: number, configParameter: string) {
        this.mutex.runExclusive(() => {
            this.executeCameraCtrls(configParameter, sliderValue);
        });
    }

    async executeCameraCtrls(parameter: string, value: number | string) {
        this.utils.execCmd(
            "python3 " +
                this.electron.process.cwd() +
                `/src/cameractrls/cameractrls.py -d ${this.selectedCamera.path} -c ${parameter}=${value}`
        );
    }

    async executeCameraCtrlsList(controls) {
        let controlStr = "";
        Object.entries(controls).forEach((x) => {
            if (x[1] != undefined) {
                controlStr = controlStr + `${x[0]}=${x[1]},`;
            }
        });

        await this.utils.execCmd(
            "python3 " +
                this.electron.process.cwd() +
                `/src/cameractrls/cameractrls.py -d ${this.selectedCamera.path} -c ${controlStr}`
        );
    }

    setWhiteBalanceDisabledStatus(configParameter: String, checked: Boolean) {
        let whiteBalanceTemperatureAvailable =
            this.webcamFormGroup.get("white_balance_temperature") != null;
        if (
            configParameter == "white_balance_temperature_auto" &&
            checked == true &&
            whiteBalanceTemperatureAvailable
        ) {
            this.webcamFormGroup.get("white_balance_temperature").disable();
        }
        if (
            configParameter == "white_balance_temperature_auto" &&
            checked == false &&
            whiteBalanceTemperatureAvailable
        ) {
            this.webcamFormGroup.get("white_balance_temperature").enable();
        }
    }

    public async setCheckboxValue(checked: Boolean, configParameter: string) {
        this.mutex.runExclusive(async () => {
            await this.executeCameraCtrls(
                configParameter,
                String(Number(checked))
            );
            this.setWhiteBalanceDisabledStatus(configParameter, checked);

            // white_balance_temperature must be set after disabling auto to take effect and small delay required
            if (
                configParameter == "white_balance_temperature_auto" &&
                checked == false &&
                this.webcamFormGroup.get("white_balance_temperature") != null
            ) {
                await this.setTimeout(250);
                await this.executeCameraCtrls(
                    "white_balance_temperature",
                    this.webcamFormGroup.get("white_balance_temperature").value
                );
            }
        });
    }

    setMenuConfigValue(configParameter: string, option: string) {
        this.executeCameraCtrls(configParameter, option);

        // exposure_absolute must be set after disabling auto to take effect
        // todo: check if other laptops have the same naming scheme
        if (configParameter == "exposure_auto" && option == "manual_mode") {
            this.executeCameraCtrls(
                "exposure_absolute",
                this.webcamFormGroup.get("exposure_absolute").value
            );
        }
    }

    setExposureDisabledStatus(configParameter: string, option: string) {
        if (
            configParameter == "exposure_auto" &&
            option == "aperture_priority_mode"
        ) {
            this.webcamFormGroup.get("exposure_absolute").disable();
        }

        if (configParameter == "exposure_auto" && option == "manual_mode") {
            this.webcamFormGroup.get("exposure_absolute").enable();
        }
    }

    public async setOptionsMenuValue(
        event: MatOptionSelectionChange,
        configParameter: string,
        option: string
    ) {
        if (event.isUserInput) {
            this.mutex.runExclusive(async () => {
                this.setLoading();
                this.webcamFormGroup.get(configParameter).markAsDirty();
                this.setExposureDisabledStatus(configParameter, option);
                this.webcamFormGroup.controls[configParameter].setValue(option);
                await this.applyConfig(this.webcamFormGroup.getRawValue());
            });
        }
    }

    convertFormgroupToSettings(presetName: string) {
        let config_stuff: WebcamPreset = {
            presetName: presetName,
            webcamId: this.selectedWebcamId,
            webcamSettings: this.webcamFormGroup.getRawValue(),
        };
        return config_stuff;
    }

    setFormgroupValidator(setting: WebcamDeviceInformation): ValidatorFn {
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

    convertSettingsToFormGroup(settings: WebcamDeviceInformation[]) {
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

    async setWebcamWithConfig(config: WebcamConstraints): Promise<void> {
        await navigator.mediaDevices
            .getUserMedia({
                video: config,
            })
            .then(async (stream) => {
                this.video.nativeElement.srcObject = stream;
                this.mediaDeviceStream = stream;
            });
        await this.checkIfUnplugged();
    }

    unsetLoading() {
        this.spinnerActive = false;
        this.webcamGuard.setLoadingStatus(false);
        this.utils.pageDisabled = false;
        this.webcamInitComplete = true;
        this.cdref.detectChanges();
    }

    getWebcamSettingNames() {
        return Object.keys(this.webcamFormGroup.getRawValue());
    }

    checkIfPresetNameAvailable(checkPresetName: string): boolean {
        let presetNames: string[] = [];
        this.thisWebcamConfigs.forEach((preset) => {
            presetNames.push(preset.presetName);
        });
        return !presetNames.includes(checkPresetName);
    }

    getControls(config: WebcamPresetValues) {
        let controls = [];
        for (const field in this.webcamFormGroup.controls) {
            if (field != "resolution" && field != "fps") {
                if (
                    "white_balance_temperature_auto" in config &&
                    "white_balance_temperature" in config
                ) {
                    if (config.white_balance_temperature_auto) {
                        this.webcamFormGroup
                            .get("white_balance_temperature")
                            .disable();
                    }
                    if (!config.white_balance_temperature_auto) {
                        this.webcamFormGroup
                            .get("white_balance_temperature")
                            .enable();
                    }
                }
                if (
                    "exposure_auto_priority" in config &&
                    "exposure_absolute" in config
                ) {
                    if (config.exposure_auto == "aperture_priority_mode") {
                        this.webcamFormGroup.get("exposure_absolute").disable();
                    }
                    if (config.exposure_auto != "aperture_priority_mode") {
                        this.webcamFormGroup.get("exposure_absolute").enable();
                    }
                }
                controls[field] = config[field];
            }
        }
        return controls;
    }

    checkIfFormgroupValid() {
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

    async notValidPresetDialog() {
        let config = {
            title: "Camera preset faulty",
            description:
                "Camera preset contains invalid configurations and therefore won't be applied. Reverting to default preset.",
            buttonConfirmLabel: "Continue",
        };
        this.utils.confirmDialog(config).then();
    }

    createWebcamConfig(config: WebcamPresetValues) {
        let [webcamWidth, webcamHeight] = config["resolution"].split("x");
        return {
            deviceId: { exact: this.selectedWebcamDeviceId },
            width: { exact: Number(webcamWidth) },
            height: { exact: Number(webcamHeight) },
            frameRate: { exact: Number(config["fps"]) },
        };
    }

    async applyConfig(config: WebcamPresetValues) {
        this.mutex.runExclusive(async () => {
            this.setLoading();
            await this.stopWebcam();

            if (!this.detachedWebcamWindowActive) {
                document.getElementById("video").style.visibility = "hidden";
            }

            this.viewWebcam = config;
            this.webcamFormGroup.markAsPristine();

            for (const field in this.webcamFormGroup.controls) {
                this.webcamFormGroup.get(field).setValue(config[field]);
            }

            if (!this.checkIfFormgroupValid()) {
                await this.notValidPresetDialog();
                this.applyConfig(this.defaultSettings);
                return;
            }

            let webcamConfig = this.createWebcamConfig(config);
            let controls = this.getControls(config);

            if (!this.detachedWebcamWindowActive) {
                await this.setWebcamWithConfig(webcamConfig);
                await this.executeCameraCtrlsList(controls);
                await this.setTimeout(500);

                document.getElementById("video").style.visibility = "visible";
                this.unsetLoading();
                this.cdref.detectChanges();
            }

            if (this.detachedWebcamWindowActive) {
                this.electron.ipcRenderer.send(
                    "setting-webcam-with-loading",
                    webcamConfig
                );
            }
        });
    }

    public async getDefaultSettings(settings: WebcamDeviceInformation[]) {
        this.defaultSettings = {};
        settings.forEach((setting) => {
            if (setting.default != undefined) {
                this.defaultSettings[setting.name] = setting.default;
            } else {
                this.defaultSettings[setting.name] = setting.current;
            }
        });
    }

    public async reloadConfigValues() {
        await this.getCameraSettings().then(async (data) => {
            this.webcamFormGroup = this.convertSettingsToFormGroup(
                JSON.parse(data)
            );
            await this.getDefaultSettings(JSON.parse(data));
            this.viewWebcam = this.webcamFormGroup.getRawValue();
        });
    }

    async getDefaultWebcamConfig(webcamId: string) {
        let [webcamWidth, webcamHeight] = this.getOptionValue(
            "resolution",
            "default"
        ).split("x");
        let fps = this.getOptionValue("fps", "default");
        return {
            deviceId: { exact: webcamId },
            width: { exact: Number(webcamWidth) },
            height: { exact: Number(webcamHeight) },
            frameRate: { exact: Number(fps) },
        };
    }

    async filterPresetsForCurrentDevice() {
        this.thisWebcamConfigs = [];
        this.notThisWebcamConfigs = [];
        this.setDefaultPreset();
        if (this.presetDataFromJson != undefined) {
            this.presetDataFromJson.forEach((config) => {
                if (config.webcamId == this.selectedWebcamId) {
                    this.thisWebcamConfigs.push(config);
                } else {
                    this.notThisWebcamConfigs.push(config);
                }
            });
        }
    }

    askOverwritePreset(presetName: string) {
        let config = {
            title: "Preset name not avaiable",
            description: "Do you want to overwrite the preset?",
            buttonAbortLabel: "Cancel",
            buttonConfirmLabel: "Overwrite",
        };
        this.utils.confirmDialog(config).then((confirm) => {
            if (confirm) {
                this.savePreset(presetName);
            }
        });
    }

    savePreset(presetName: string) {
        let preset = this.convertFormgroupToSettings(presetName);
        this.reloadConfigValues();

        this.thisWebcamConfigs = this.thisWebcamConfigs.filter(
            (x) => x.presetName != "Default"
        );

        this.thisWebcamConfigs.push(preset);
        let config = this.thisWebcamConfigs.concat(this.notThisWebcamConfigs);
        // todo: moving saving functionality into config service
        // only saving preset if password has been confirmed
        this.config.pkexecWriteWebcamConfigAsync(config);

        this.viewWebcam = this.webcamFormGroup.getRawValue();
        this.webcamFormGroup.markAsPristine();
        this.thisWebcamConfigs.unshift(this.defaultPreset);
        this.selectedPreset = preset;
    }

    public savingWebcamPresets() {
        let config = {
            title: "Saving Preset",
            description: "Set the preset name",
            prefill: "",
        };
        this.utils.inputTextDialog(config).then((presetName) => {
            if (this.checkIfPresetNameAvailable(presetName)) {
                this.savePreset(presetName);
            } else {
                this.askOverwritePreset(presetName);
            }
        });
    }

    public handleRegionPanelStateChange(key: string, isOpen: boolean) {
        this.expandedRegions = { ...this.expandedRegions, [key]: isOpen };
    }

    public mouseup() {
        if (this.timer) {
            clearInterval(this.timer);
        }
    }

    valueOffsetFunc(configParameter: string, offset: number) {
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
        this.executeCameraCtrls(configParameter, newValue);
        this.cdref.detectChanges();
    }

    public mousedown(configParameter: string, offset: number) {
        this.valueOffsetFunc(configParameter, offset);
        this.timer = setInterval(() => {
            this.valueOffsetFunc(configParameter, offset);
        }, 200);
    }

    showAdvancedSettings() {
        this.easyModeActive = false;
    }

    disableAdvancedSettings() {
        this.easyModeActive = true;
    }

    getOptionValue(configName: string, configVar: string) {
        let value;
        this.presetSettings.forEach((x) => {
            if (x.name == configName) {
                value = x[configVar];
            }
        });
        return value;
    }

    setDefaultPreset() {
        this.defaultPreset = {
            presetName: "Default",
            webcamId: this.selectedWebcamId,
            webcamSettings: this.defaultSettings,
        };
        this.selectedPreset = this.defaultPreset;

        this.thisWebcamConfigs = this.thisWebcamConfigs.filter(
            (x) => x.presetName != "Default"
        );
        this.thisWebcamConfigs.unshift(this.defaultPreset);
    }

    async loadingConfigDataFromJSON() {
        if (fs.existsSync(TccPaths.WEBCAM_FILE)) {
            await this.reloadConfigValues();
            let presetData = this.configHandler.readWebcamSettings();
            this.presetDataFromJson = presetData;
            await this.filterPresetsForCurrentDevice();
            // todo: selecting last saved instead of default
            this.setDefaultPreset();
            await this.applyConfig(this.defaultSettings);
        } else {
            await this.reloadConfigValues();
            this.setDefaultPreset();
            await this.applyConfig(this.webcamFormGroup.getRawValue());
        }
    }

    defaultPresetWarningDialog() {
        let config = {
            title: "Deleting Preset",
            description: "You are not allowed to delete the default preset.",
            buttonConfirmLabel: "Continue",
        };
        this.utils.confirmDialog(config).then();
    }

    async deletePreset() {
        if (this.selectedPreset.presetName == "Default") {
            this.defaultPresetWarningDialog();
            return;
        }

        this.thisWebcamConfigs = this.thisWebcamConfigs.filter(
            (x) => x.presetName != this.selectedPreset.presetName
        );
        this.selectedPreset = null;
        let config = this.thisWebcamConfigs.concat(this.notThisWebcamConfigs);
        // todo: adjust path with variable
        this.config.pkexecWriteWebcamConfigAsync(config);
        this.webcamFormGroup.markAsPristine();
        this.selectedPreset = this.defaultPreset;
        this.applyConfig(this.defaultSettings);
    }

    getPercentValue(preset: string) {
        let max = this.getOptionValue(preset, "max");
        let min = this.getOptionValue(preset, "min");
        let current = this.webcamFormGroup.get(preset).value;
        return Math.round(((current - min) * 100) / (max - min));
    }

    async discardFormInput() {
        this.webcamFormGroup.markAsPristine();
        this.applyConfig(this.viewWebcam);
    }

    comparePresets(o1: WebcamPreset, o2: WebcamPreset): boolean {
        return o1 && o2 ? o1.presetName === o2.presetName : o2 === o2;
    }

    setTimeout(delay: number) {
        return new Promise((resolve) => setTimeout(resolve, delay));
    }

    // todo: put translations into json
    getConfigTranslation(configText: string) {
        if (configText == "exposure_auto") {
            return $localize`:@@exposure_auto:Exposure, Auto`;
        }
        if (configText == "exposure_absolute") {
            return $localize`:@@exposure_auto:Exposure (Absolute)`;
        }
        if (configText == "exposure_auto_priority") {
            return $localize`:@@exposure_auto_priority:Exposure, Auto Priority`;
        }
        if (configText == "gain") {
            return $localize`:@@gain:Gain`;
        }
        if (configText == "backlight_compensation") {
            return $localize`:@@backlight_compensation:Backlight Compensation`;
        }
        if (configText == "white_balance_temperature_auto") {
            return $localize`:@@white_balance_temperature_auto:White Balance Temperature, Auto`;
        }
        if (configText == "white_balance_temperature") {
            return $localize`:@@white_balance_temperature:White Balance Temperature`;
        }
        if (configText == "brightness") {
            return $localize`:@@brightness:Brightness`;
        }
        if (configText == "contrast") {
            return $localize`:@@contrast:Contrast`;
        }
        if (configText == "saturation") {
            return $localize`:@@saturation:Saturation`;
        }
        if (configText == "sharpness") {
            return $localize`:@@sharpness:Sharpness`;
        }
        if (configText == "hue") {
            return $localize`:@@hue:Hue`;
        }
        if (configText == "gamma") {
            return $localize`:@@hue:Gamma`;
        }
        if (configText == "resolution") {
            return $localize`:@@resolution:Resolution`;
        }
        if (configText == "fps") {
            return $localize`:@@fps:Frames per Second`;
        }
        return configText;
    }

    async ngOnDestroy() {
        this.stopWebcam();
        this.subscriptions.unsubscribe();

        if (this.detachedWebcamWindowActive) {
            this.electron.ipcRenderer.send("close-webcam-preview");
        }
    }
}
