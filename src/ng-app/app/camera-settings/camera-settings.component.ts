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
import { environment } from "../../environments/environment";

@Component({
    selector: "app-camera-settings",
    templateUrl: "./camera-settings.component.html",
    styleUrls: ["./camera-settings.component.scss"],
})
export class CameraSettingsComponent implements OnInit {
    // from profile settings
    gridParams = {
        cols: 9,
        headerSpan: 4,
        valueSpan: 2,
        inputSpan: 3,
    };

    @ViewChild("video", { static: true })
    video: ElementRef;
    mediaDeviceStream: MediaStream;

    expandedRegions: { [key: string]: boolean } = {};
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
    selectedCamera: WebcamDevice;

    defaultSettings: WebcamPresetValues;
    viewWebcam: WebcamPresetValues;

    // todo: getting from config?
    easyOptions: string[] = ["brightness", "contrast", "resolution"];
    easyModeActive: boolean = true;

    constructor(
        private electron: ElectronService,
        private utils: UtilsService,
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
                await this.executeCameraCtrlsList(
                    this.webcamFormGroup.getRawValue()
                );
            })
        );

        const cameraWindowObservable = fromEvent(
            this.electron.ipcRenderer,
            "external-camera-preview-closed"
        );
        this.subscriptions.add(
            cameraWindowObservable.subscribe(() => {
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
                this.utils.pageDisabled = false;
                this.cdref.detectChanges();
                return;
            } else {
                if (webcamDeviceReference == undefined) {
                    this.selectedCamera = webcamData[0];
                }
                if (webcamDeviceReference != undefined) {
                    let filtered = webcamData.filter(
                        (webcamDevice) =>
                            webcamDevice.deviceId ==
                            webcamDeviceReference.deviceId
                    );
                    this.selectedCamera = filtered[0];
                }
                await this.loadingPresetData();
                this.unsetLoading();
            }
        });
    }

    ngAfterContentChecked() {
        this.cdref.detectChanges();
    }

    private getCameraListBashPath() {
        let bashPath: String;
        if (environment.production) {
            bashPath = TccPaths.TCCD_BASH_CAMERAPATHS_FILE;
        } else {
            bashPath =
                this.electron.process.cwd() +
                "/src/bash-scripts/get_camera_paths.sh";
        }
        return bashPath;
    }

    private getWebcamPaths(): Promise<WebcamPath> {
        return new Promise<WebcamPath>((resolve) => {
            this.utils
                .execFile("bash " + this.getCameraListBashPath())
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
        cameraId: string
    ): [string, string] {
        for (const device of devices) {
            let deviceId = device.label.match(/\((.*:.*)\)/)[1];
            if (deviceId == cameraId) {
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
        return new Promise<WebcamDevice[]>((resolve) => {
            let dropdownData: WebcamDevice[] = [];
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

    private async cameraNotAvailabledDialog(): Promise<void> {
        let config = {
            title: "Camera can not be accessed",
            description: "Camera can not be accessed.",
            buttonConfirmLabel: "Continue",
        };
        this.utils.confirmDialog(config).then();
    }

    private getCameraCtrlPythonPath() {
        let cameraCtrolsPath: String;
        if (environment.production) {
            cameraCtrolsPath = TccPaths.TCCD_PYTHON_CAMERACTRL_FILE;
        } else {
            cameraCtrolsPath =
                this.electron.process.cwd() + "/src/cameractrls/cameractrls.py";
        }
        return cameraCtrolsPath;
    }

    private getCameraSettings(): Promise<string> {
        return new Promise<string>((resolve) => {
            this.utils
                .execFile(
                    "python3 " +
                        this.getCameraCtrlPythonPath() +
                        ` -d ${this.selectedCamera.path}`
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

    private cameraUnpluggedDialog() {
        let config = {
            title: "Camera unplugged",
            description: "Camera got unplugged.",
            buttonConfirmLabel: "Continue",
        };
        this.utils.confirmDialog(config).then();
    }

    private handleVideoEnded() {
        this.cameraUnpluggedDialog();
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
        this.selectedCamera = webcamPreset;

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
        await this.applyPreset(preset, false, true);
    }

    private getCurrentWebcamConstraints(): WebcamConstraints {
        let [webcamWidth, webcamHeight] = this.webcamFormGroup
            .getRawValue()
            ["resolution"].split("x");
        let fps = this.webcamFormGroup.getRawValue()["fps"];
        return {
            deviceId: { exact: this.selectedCamera.deviceId },
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
            this.executeCameraCtrls(configParameter, sliderValue);
        });
    }

    private async executeCameraCtrls(
        parameter: string,
        value: number | string
    ): Promise<void> {
        let webcamPaths = this.getPathsWithId(this.selectedCamera.id);

        webcamPaths.forEach(async (devicePath) => {
            await this.utils.execCmd(
                "python3 " +
                    this.getCameraCtrlPythonPath() +
                    ` -d ${devicePath} -c ${parameter}=${value}`
            );
        });
    }

    private async executeCameraCtrlsList(
        controls: WebcamPresetValues
    ): Promise<void> {
        let controlStr = "";
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

        let webcamPaths = this.getPathsWithId(this.selectedCamera.id);
        webcamPaths.forEach(async (devicePath) => {
            await this.utils.execCmd(
                "python3 " +
                    this.getCameraCtrlPythonPath() +
                    ` -d ${devicePath} -c ${controlStr}`
            );
        });
    }

    public async setCheckboxValue(
        checked: Boolean,
        configParameter: string
    ): Promise<void> {
        this.mutex.runExclusive(async () => {
            await this.executeCameraCtrls(
                configParameter,
                String(Number(checked))
            );
            this.setSliderEnabledStatus(this.webcamFormGroup.getRawValue());

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

    public async setMenuConfigValue(
        configParameter: string,
        option: string
    ): Promise<void> {
        await this.executeCameraCtrls(configParameter, option);

        // exposure_absolute must be set after disabling auto to take effect
        // todo: check if other laptops have the same naming scheme
        if (configParameter == "exposure_auto" && option == "manual_mode") {
            await this.executeCameraCtrls(
                "exposure_absolute",
                this.webcamFormGroup.get("exposure_absolute").value
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

                this.setSliderEnabledStatus(this.webcamFormGroup.getRawValue());
                await this.applyPreset(this.webcamFormGroup.getRawValue());
            });
        }
    }

    private getWebcamPreset(presetName: string): WebcamPreset {
        return {
            presetName: presetName,
            active: true,
            webcamId: this.selectedCamera.id,
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

    private async setWebcamWithConfig(
        config: WebcamConstraints
    ): Promise<void> {
        await navigator.mediaDevices
            .getUserMedia({
                video: config,
            })
            .then(async (stream) => {
                this.video.nativeElement.srcObject = stream;
                this.mediaDeviceStream = stream;
            });
        this.mediaDeviceStream.getVideoTracks()[0].onended = () => {
            this.handleVideoEnded();
        };
    }

    private unsetLoading() {
        this.spinnerActive = false;
        this.webcamGuard.setLoadingStatus(false);
        this.utils.pageDisabled = false;
        this.webcamInitComplete = true;
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
    private setSliderEnabledStatus(config: WebcamPresetValues) {
        if (
            "white_balance_temperature_auto" in config &&
            "white_balance_temperature" in config
        ) {
            if (config.white_balance_temperature_auto) {
                this.webcamFormGroup.get("white_balance_temperature").disable();
            }
            if (!config.white_balance_temperature_auto) {
                this.webcamFormGroup.get("white_balance_temperature").enable();
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
            title: "Camera preset faulty",
            description:
                "Camera preset contains invalid configurations and therefore won't be applied. Reverting to default preset.",
            buttonConfirmLabel: "Continue",
        };
        this.utils.confirmDialog(config).then();
    }

    private createWebcamConfig(config: WebcamPresetValues): WebcamConstraints {
        let [webcamWidth, webcamHeight] = config["resolution"].split("x");
        return {
            deviceId: { exact: this.selectedCamera.deviceId },
            width: { exact: Number(webcamWidth) },
            height: { exact: Number(webcamHeight) },
            frameRate: { exact: Number(config["fps"]) },
        };
    }

    public async applyPreset(
        config: WebcamPresetValues,
        markAsPristine: boolean = false,
        setViewWebcam: boolean = false
    ): Promise<void> {
        this.mutex.runExclusive(async () => {
            this.setLoading();
            this.stopWebcam();

            if (markAsPristine) {
                this.webcamFormGroup.markAsPristine();
            }

            if (!this.detachedWebcamWindowActive) {
                document.getElementById("video").style.visibility = "hidden";
            }

            this.webcamFormGroup.setValue(config);
            if (!this.checkIfFormgroupValid()) {
                this.notValidPresetDialog();
                this.applyPreset(this.defaultSettings);
                return;
            }

            let webcamConfig = this.createWebcamConfig(config);
            this.setSliderEnabledStatus(config);

            if (!this.detachedWebcamWindowActive) {
                await this.setWebcamWithConfig(webcamConfig);
                await this.executeCameraCtrlsList(config);
                await this.setTimeout(500);

                document.getElementById("video").style.visibility = "visible";
                this.unsetLoading();
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
        await this.getCameraSettings().then(async (data) => {
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
                if (config.webcamId == this.selectedCamera.id) {
                    this.webcamPresetsCurrentDevice.push(config);
                } else {
                    this.webcamPresetsOtherDevices.push(config);
                }
            });
        }
    }

    private askOverwritePreset(presetName: string) {
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

    private async savePreset(presetName: string): Promise<void> {
        this.utils.pageDisabled = true;
        let preset = this.getWebcamPreset(presetName);

        let webcamConfigs = this.webcamPresetsCurrentDevice.filter(
            (webcamPreset) => webcamPreset.presetName !== "Default"
        );
        webcamConfigs.forEach((x) => (x.active = false));
        webcamConfigs = webcamConfigs.concat(
            preset,
            this.webcamPresetsOtherDevices
        );

        await this.config
            .pkexecWriteWebcamConfigAsync(webcamConfigs)
            .then((confirm) => {
                if (confirm) {
                    this.webcamPresetsCurrentDevice.push(preset);
                    this.viewWebcam = this.webcamFormGroup.getRawValue();
                    this.webcamFormGroup.markAsPristine();
                    this.selectedPreset = preset;
                    this.allPresetData.push(preset);
                }
            });
        this.utils.pageDisabled = false;
    }

    private noPresetNameWarningDialog() {
        let config = {
            title: "Preset was not saved",
            description:
                "The preset name was no set and thus the preset was not saved.",
            buttonConfirmLabel: "Continue",
        };
        // todo: decide if retry
        //this.utils.confirmDialog(config).then(() => this.savingWebcamPresets());
        this.utils.confirmDialog(config).then();
    }

    public savingWebcamPresets() {
        let config = {
            title: "Saving Preset",
            description: "Set the preset name",
            prefill: "",
        };
        this.utils.inputTextDialog(config).then((presetName) => {
            if (!presetName) {
                this.noPresetNameWarningDialog();
                return;
            }

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
        await this.executeCameraCtrls(configParameter, newValue);
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

    private setDefaultPreset() {
        this.defaultPreset = {
            presetName: "Default",
            active: false,
            webcamId: this.selectedCamera.id,
            webcamSettings: this.defaultSettings,
        };
        this.selectedPreset = this.defaultPreset;

        this.webcamPresetsCurrentDevice =
            this.webcamPresetsCurrentDevice.filter(
                (webcamPreset) => webcamPreset.presetName != "Default"
            );
        this.webcamPresetsCurrentDevice.unshift(this.defaultPreset);
    }

    private async loadingPresetData(): Promise<void> {
        await this.reloadConfigValues();
        if (fs.existsSync(TccPaths.WEBCAM_FILE)) {
            this.allPresetData = this.configHandler.readWebcamSettings();
            this.filterPresetsForCurrentDevice();
            let filtered = this.webcamPresetsCurrentDevice.filter(
                (webcamPreset) => webcamPreset.active == true
            );

            if (filtered.length > 0) {
                this.selectedPreset = filtered[0];
                await this.applyPreset(filtered[0].webcamSettings, false, true);
            }
            if (filtered.length == 0) {
                this.setDefaultPreset();
                await this.applyPreset(this.defaultSettings, false, true);
            }
        } else {
            this.setDefaultPreset();
            await this.applyPreset(this.defaultSettings, false, true);
        }
    }

    private defaultPresetWarningDialog() {
        let config = {
            title: "Deleting Preset",
            description: "You are not allowed to delete the default preset.",
            buttonConfirmLabel: "Continue",
        };
        this.utils.confirmDialog(config).then();
    }

    public async deletePreset(): Promise<void> {
        this.mutex.runExclusive(async () => {
            if (this.selectedPreset.presetName == "Default") {
                this.defaultPresetWarningDialog();
                return;
            }

            this.utils.pageDisabled = true;

            let currentConfigs = this.webcamPresetsCurrentDevice.filter(
                (webcamPreset) =>
                    webcamPreset.presetName != this.selectedPreset.presetName &&
                    webcamPreset.presetName != "Default"
            );
            let webcamConfigs = currentConfigs.concat(
                this.webcamPresetsOtherDevices
            );

            let activePresets = webcamConfigs.filter(
                (webcamPreset) => webcamPreset.active == true
            );

            await this.config
                .pkexecWriteWebcamConfigAsync(webcamConfigs)
                .then((confirm) => {
                    if (confirm) {
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

    // todo: put translations into json
    public getConfigTranslation(configText: string): string {
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

    ngOnDestroy() {
        this.stopWebcam();
        this.subscriptions.unsubscribe();

        if (this.detachedWebcamWindowActive) {
            this.electron.ipcRenderer.send("close-webcam-preview");
        }
    }
}
