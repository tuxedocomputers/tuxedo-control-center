import { Component, ElementRef, OnInit, ViewChild } from "@angular/core";
import { ElectronService } from "ngx-electron";
import { fromEvent, Subscription } from "rxjs";
import {
    WebcamPreset,
    WebcamDeviceInformation,
    WebcamConstraints,
    WebcamDevice,
    WebcamPresetValues,
} from "src/common/models/TccWebcamSettings";
import { CompatibilityService } from "../compatibility.service";
import { UtilsService } from "../utils.service";
import { ChangeDetectorRef } from "@angular/core";
import { WebcamGuardService } from "../webcam.service";
import { setInterval, clearInterval } from "timers";
import { FormControl } from "@angular/forms";
import { FormGroup } from "@angular/forms";
import { ConfigHandler } from "src/common/classes/ConfigHandler";
import { TccPaths } from "src/common/classes/TccPaths";
import { MatOptionSelectionChange } from "@angular/material/core";
import * as fs from "fs";

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

    webcamDropdownData: WebcamDevice[] = [];
    selectedWebcamId: string;
    expandedRegions: { [key: string]: boolean } = {};
    newWindow = null;
    private subscriptions: Subscription = new Subscription();
    webcamInitComplete: boolean = false;
    spinnerActive: boolean = false;
    @ViewChild("video", { static: true })
    public video: ElementRef;
    webcamConfig: WebcamConstraints = undefined;
    timer: NodeJS.Timeout = null;
    presetDataFromJson: WebcamPreset[];
    presetSettings: WebcamDeviceInformation[];
    defaultPreset: WebcamPreset;
    defaultSettings: WebcamPresetValues;
    detachedWebcamWindowActive: Boolean = false;

    notThisWebcamConfigs: WebcamPreset[] = [];
    thisWebcamConfigs: WebcamPreset[] = [];
    webcamFormGroup: FormGroup = new FormGroup({});

    viewWebcam: WebcamPresetValues;
    selectedPreset: WebcamPreset;
    mediaDeviceStream: MediaStream;
    webcamCategories: string[] = [];

    // todo: getting from config?
    easyOptions: string[] = ["brightness", "contrast", "resolution"];
    easyModeActive: boolean = true;

    constructor(
        private electron: ElectronService,
        private utils: UtilsService,
        public compat: CompatibilityService,
        private cdref: ChangeDetectorRef,
        private webcamGuard: WebcamGuardService
    ) {}
    private config: ConfigHandler;

    async ngOnInit() {
        const cameraApplyObservable = fromEvent(
            this.electron.ipcRenderer,
            "apply-controls"
        );
        this.subscriptions.add(
            cameraApplyObservable.subscribe(async () => {
                let controls = this.getControls(this.viewWebcam);
                await this.executeCameraCtrlsList(controls);
            })
        );

        this.config = new ConfigHandler(
            TccPaths.SETTINGS_FILE,
            TccPaths.PROFILES_FILE,
            TccPaths.AUTOSAVE_FILE,
            TccPaths.FANTABLES_FILE
        );

        this.webcamGuard.setLoadingStatus(true);
        this.utils.pageDisabled = true;
        const cameraWindowObservable = fromEvent(
            this.electron.ipcRenderer,
            "external-camera-preview-closed"
        );
        this.subscriptions.add(
            cameraWindowObservable.subscribe(async () => {
                this.detachedWebcamWindowActive = false;
                document.getElementById("hidden").style.display = "flex";
                this.applyConfig(this.viewWebcam);
            })
        );

        // todo: handle case where no webcam is available
        await this.mapCameraPathsToDevice().then(async (webcamData) => {
            this.selectedWebcamId = webcamData[0].id;
        });

        await this.loadingConfigDataFromJSON();
    }

    ngAfterContentChecked() {
        this.cdref.detectChanges();
    }

    public getCameraPathsWithId(id: string): Promise<string> {
        return new Promise<string>((resolve) => {
            this.utils
                .execFile(
                    "bash " +
                        this.electron.process.cwd() +
                        `/src/bash-scripts/get_camera_paths_with_ids.sh ${id}`
                )
                .then((data) => {
                    resolve(data.toString());
                })
                .catch((error) => {
                    console.log(error);
                    resolve("");
                });
        });
    }

    public async matchDeviceWithPath(
        device: InputDeviceInfo | MediaDeviceInfo,
        cameraPathsWithStreams: string[],
        dropdownData: WebcamDevice[]
    ) {
        // todo: clean
        let deviceId = device.label.match(/\((.*:.*)\)/)[1];
        if (deviceId != null) {
            await this.getCameraPathsWithId(deviceId).then((availableIds) => {
                cameraPathsWithStreams.forEach((cameraPath) => {
                    if (
                        Object.values(JSON.parse(availableIds)).indexOf(
                            cameraPath
                        ) > -1
                    ) {
                        dropdownData.push({
                            label: device.label,
                            id: device.deviceId,
                            path: `/dev/${cameraPath}`,
                        });
                    }
                });
            });
        }
    }

    public getCameraVideoStreamPaths(): Promise<string> {
        return new Promise<string>((resolve) => {
            this.utils
                .execFile(
                    "bash " +
                        this.electron.process.cwd() +
                        "/src/bash-scripts/get_camera_paths_with_video_streams.sh"
                )
                .then((data) => {
                    resolve(data.toString());
                })
                .catch((error) => {
                    console.log(error);
                    resolve("");
                });
        });
    }

    public getCameraSettings(): Promise<string> {
        return new Promise<string>((resolve) => {
            this.utils
                .execFile(
                    "python3 " +
                        this.electron.process.cwd() +
                        `/src/cameractrls/cameractrls.py -d ${
                            this.getWebcamInformation()["path"]
                        }`
                )
                .then((data) => {
                    resolve(data.toString());
                })
                .catch((error) => {
                    console.log(error);
                    // todo: handle case when device got disconnected
                    resolve("");
                });
        });
    }

    public mapCameraPathsToDevice(): Promise<WebcamDevice[]> {
        let dropdownData = [];
        return new Promise<WebcamDevice[]>((resolve) => {
            this.getCameraVideoStreamPaths().then(
                async (cameraPathsWithStreams) => {
                    navigator.mediaDevices
                        .enumerateDevices()
                        .then(
                            async (
                                devices: (InputDeviceInfo | MediaDeviceInfo)[]
                            ) => {
                                let filteredDevices = devices.filter(
                                    (device) => device.kind == "videoinput"
                                );
                                for (const device of filteredDevices) {
                                    await this.matchDeviceWithPath(
                                        device,
                                        JSON.parse(cameraPathsWithStreams),
                                        dropdownData
                                    );
                                }
                                this.webcamDropdownData = dropdownData;
                                resolve(this.webcamDropdownData);
                            }
                        );
                }
            );
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
            // todo: handle case where no webcam is available
            await this.mapCameraPathsToDevice().then(async (webcamData) => {
                this.selectedWebcamId = webcamData[0].id;
            });
            await this.loadingConfigDataFromJSON();
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

    async setWebcamWithId(webcamId: string) {
        this.selectedWebcamId = webcamId;
        let config = await this.getDefaultWebcamConfig(webcamId);
        config.deviceId = { exact: webcamId };
        this.electron.ipcRenderer.send("setting-webcam-with-loading", config);
        return this.setWebcamWithConfig(config);
    }

    setLoading() {
        this.spinnerActive = true;
        this.webcamGuard.setLoadingStatus(true);
        this.cdref.detectChanges();
    }

    public async setWebcam(webcamId: string) {
        this.setLoading();
        await this.stopWebcam();
        this.selectedPreset = this.defaultPreset;
        await this.reloadConfigValues();
        await this.filterPresetsForCurrentDevice();
        let webcamConfig = await this.getDefaultWebcamConfig(webcamId);

        if (this.detachedWebcamWindowActive) {
            this.electron.ipcRenderer.send(
                "setting-webcam-with-loading",
                webcamConfig
            );
        }
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
            deviceId: { exact: this.selectedWebcamId },
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

    public setSliderValue(sliderValue: number, configParameter: string) {
        this.executeCameraCtrls(configParameter, sliderValue);
    }

    async executeCameraCtrls(parameter: string, value: number | string) {
        let devicePath = this.getWebcamInformation()["path"];
        this.utils.execCmd(
            "python3 " +
                this.electron.process.cwd() +
                `/src/cameractrls/cameractrls.py -d ${devicePath} -c ${parameter}=${value}`
        );
    }

    async executeCameraCtrlsList(controls) {
        let controlStr = "";
        Object.entries(controls).forEach((x) => {
            if (x[1] != undefined) {
                controlStr = controlStr + `${x[0]}=${x[1]},`;
            }
        });

        let devicePath = this.getWebcamInformation()["path"];
        await this.utils.execCmd(
            "python3 " +
                this.electron.process.cwd() +
                `/src/cameractrls/cameractrls.py -d ${devicePath} -c ${controlStr}`
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
        await this.executeCameraCtrls(configParameter, String(Number(checked)));
        this.setWhiteBalanceDisabledStatus(configParameter, checked);

        // white_balance_temperature must be set after disabling auto to take effect and small delay required
        if (
            configParameter == "white_balance_temperature_auto" &&
            checked == false &&
            this.webcamFormGroup.get("white_balance_temperature") != null
        ) {
            setTimeout(async () => {
                await this.executeCameraCtrls(
                    "white_balance_temperature",
                    this.webcamFormGroup.get("white_balance_temperature").value
                );
            }, 100);
        }
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
            this.setLoading();
            this.webcamFormGroup.get(configParameter).markAsDirty();
            this.setExposureDisabledStatus(configParameter, option);
            this.webcamFormGroup.controls[configParameter].setValue(option);
            await this.applyConfig(this.webcamFormGroup.getRawValue());
        }
    }

    convertFormgroupToSettings(presetName: string) {
        let config_stuff: WebcamPreset = {
            presetName: presetName,
            webcamId: this.getWebcamId(),
            webcamSettings: this.webcamFormGroup.getRawValue(),
        };
        return config_stuff;
    }

    convertSettingsToFormGroup(settings: WebcamDeviceInformation[]) {
        this.presetSettings = settings;
        let group = {};
        let categories = [];
        settings.forEach((setting) => {
            group[setting.name] = new FormControl({
                value: setting.current,
                disabled: !setting.active,
            });
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
    }

    getWebcamInformation() {
        let webcamEntry = this.webcamDropdownData.find(
            (x) => x["id"] == this.selectedWebcamId
        );
        return webcamEntry;
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

    getControls(config: any) {
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

    // todo: refactor
    async applyConfig(config: WebcamPresetValues) {
        this.setLoading();

        if (!this.detachedWebcamWindowActive) {
            document.getElementById("video").style.visibility = "hidden";
        }

        this.viewWebcam = config;
        this.webcamFormGroup.markAsPristine();

        for (const field in this.webcamFormGroup.controls) {
            this.webcamFormGroup.get(field).setValue(config[field]);
        }
        let [webcamWidth, webcamHeight] = config["resolution"].split("x");

        let webcamConfig = {
            deviceId: { exact: this.selectedWebcamId },
            width: { exact: Number(webcamWidth) },
            height: { exact: Number(webcamHeight) },
            frameRate: { exact: Number(config["fps"]) },
        };

        let controls = this.getControls(config);

        await this.stopWebcam();

        if (!this.detachedWebcamWindowActive) {
            await this.setWebcamWithConfig(webcamConfig);
            await this.executeCameraCtrlsList(controls);

            setTimeout(async () => {
                document.getElementById("video").style.visibility = "visible";
                this.unsetLoading();
                this.cdref.detectChanges();
            }, 500);
        }

        if (this.detachedWebcamWindowActive) {
            this.electron.ipcRenderer.send(
                "setting-webcam-with-loading",
                webcamConfig
            );
        }
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
                let currentWebcamId = this.getWebcamId();
                if (config.webcamId == currentWebcamId) {
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
        // todo: adjust path with variable
        this.config.writeWebcamSettings(config, "webcamSettings.json");

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

    getWebcamId() {
        return this.getWebcamInformation()["label"].match(/\((.*:.*)\)/)[1];
    }

    public mouseup() {
        if (this.timer) {
            clearInterval(this.timer);
        }
    }

    valueOffsetFunc(configParameter: string, offset: any) {
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

    public mousedown(preset: any, offset: any) {
        this.valueOffsetFunc(preset, offset);
        this.timer = setInterval(() => {
            this.valueOffsetFunc(preset, offset);
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
            webcamId: this.getWebcamId(),
            webcamSettings: this.defaultSettings,
        };
        this.selectedPreset = this.defaultPreset;

        this.thisWebcamConfigs = this.thisWebcamConfigs.filter(
            (x) => x.presetName != "Default"
        );
        this.thisWebcamConfigs.unshift(this.defaultPreset);
    }

    async loadingConfigDataFromJSON() {
        if (fs.existsSync("webcamSettings.json")) {
            await this.reloadConfigValues();
            let presetData = this.config.readWebcamSettings(
                "webcamSettings.json"
            );
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
        this.config.writeWebcamSettings(config, "webcamSettings.json");
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

    comparer(o1: WebcamPreset, o2: WebcamPreset): boolean {
        return o1 && o2 ? o1.presetName === o2.presetName : o2 === o2;
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
