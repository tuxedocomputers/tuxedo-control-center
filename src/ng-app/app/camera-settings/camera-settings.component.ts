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
import * as fs from "fs";
import { MatOptionSelectionChange } from "@angular/material/core";
import { MatSliderChange } from "@angular/material/slider";

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
    allowCameraSwitch: boolean = false;
    expandedRegions: { [key: string]: boolean } = {};
    newWindow = null;
    private subscriptions: Subscription = new Subscription();
    webcamInitComplete: boolean = false;
    spinnerActive: boolean = false;
    @ViewChild("video", { static: true })
    public video: ElementRef;
    webcamConfig: WebcamConstraints = undefined;
    previewWindowActive: boolean = false;
    timer: NodeJS.Timeout = null;
    myFormGroup: FormGroup;
    presetDataFromJson: WebcamPreset[];
    presetSettings: WebcamDeviceInformation[];

    notThisWebcamConfigs: WebcamPreset[] = [];
    thisWebcamConfigs: WebcamPreset[] = [];
    webcamFormGroup: FormGroup = new FormGroup({});
    selectedPreset: WebcamPreset;

    mediaDeviceStream: MediaStream;

    // todo: get data from json
    categories_from_json: string[] = [
        "Balance",
        "Capture",
        "Color",
        "Dynamic Range",
        "Exposure",
    ];
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
            "setting-webcam-with-loading"
        );
        this.subscriptions.add(
            cameraWindowObservable.subscribe(async () => {
                document.getElementById("hidden").style.display = "flex";
                this.setWebcam(this.selectedWebcamId);
            })
        );

        // todo: handle case where no webcam is available
        await this.mapCameraPathsToDevice().then(async (webcamData) => {
            this.webcamDropdownData = webcamData;
            this.selectedWebcamId = webcamData[0].id;
        });

        this.loadingConfigDataFromJSON();
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
        cameraPathsWithStreams: string[]
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
                        this.webcamDropdownData.push({
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
                                        JSON.parse(cameraPathsWithStreams)
                                    );
                                }
                                resolve(this.webcamDropdownData);
                            }
                        );
                }
            );
        });
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
        await this.reloadConfigValues();
        let config = this.getDefaultWebcamConfig(webcamId);
        config.deviceId = { exact: webcamId };
        return this.setWebcamWithConfig(config);
    }

    setLoading() {
        this.previewWindowActive = true;
        this.spinnerActive = true;
        this.webcamGuard.setLoadingStatus(true);
        this.cdref.detectChanges();
    }

    public async setWebcam(webcamId: string) {
        this.setLoading();
        await this.stopWebcam();
        await this.setWebcamWithId(webcamId);
    }

    public openWindow() {
        this.stopWebcam();
        document.getElementById("hidden").style.display = "none";
        // todo: check and/or implement cleaner
        let config = this.getDefaultWebcamConfig(this.selectedWebcamId);
        this.electron.ipcRenderer.send("createWebcamPreview", config);
        this.electron.ipcRenderer.send("setting-webcam-with-loading", config);
    }

    public enableCamera() {
        this.setWebcam(this.selectedWebcamId);
    }

    public setSliderValue(event: MatSliderChange, configParameter: string) {
        this.executeCameraCtrls(configParameter, event.value);
    }

    async executeCameraCtrls(parameter: string, value: number | string) {
        let devicePath = this.getWebcamInformation()["path"];
        this.utils.execCmd(
            "python3 " +
                this.electron.process.cwd() +
                `/src/cameractrls/cameractrls.py -d ${devicePath} -c ${parameter}=${value}`
        );
    }

    setWhiteBalanceDisabledStatus(configParameter: String, checked: Boolean) {
        if (
            configParameter == "white_balance_temperature_auto" &&
            checked == true
        ) {
            this.webcamFormGroup.get("white_balance_temperature").disable();
        }
        if (
            configParameter == "white_balance_temperature_auto" &&
            checked == false
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
            checked == false
        ) {
            setTimeout(async () => {
                await this.executeCameraCtrls(
                    "white_balance_temperature",
                    this.webcamFormGroup.get("white_balance_temperature").value
                );
                this.reloadConfigValues();
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

    public setOptionsMenuValue(
        event: MatOptionSelectionChange,
        configParameter: string,
        option: string
    ) {
        if (event.isUserInput) {
            this.setExposureDisabledStatus(configParameter, option);

            this.webcamFormGroup.controls[configParameter].setValue(option);
            if (configParameter == "resolution") {
                this.setResolution(option);
                return;
            }

            if (configParameter == "fps") {
                this.setFPS(option);
                return;
            }

            this.setMenuConfigValue(configParameter, option);
            setTimeout(() => {
                this.reloadConfigValues();
            }, 100);
        }
    }

    convertFormgroupToSettings(presetName: string) {
        let config_stuff: WebcamPreset = {
            presetName: presetName,
            webcamId: this.getWebcamId(),
            webcamSettings: this.webcamFormGroup.value,
        };
        return config_stuff;
    }

    convertSettingsToFormGroup(settings: WebcamDeviceInformation[]) {
        this.presetSettings = settings;
        let group = {};
        settings.forEach((setting) => {
            group[setting.name] = new FormControl({
                value: setting.current,
                disabled: !setting.active,
            });
        });
        return new FormGroup(group);
    }

    async setResolution(resolution: string) {
        await this.stopWebcam();
        this.spinnerActive = true;
        this.webcamGuard.setLoadingStatus(true);
        if (this.webcamConfig == undefined) {
            this.webcamConfig = await this.getDefaultWebcamConfig(
                this.selectedWebcamId
            );
        }
        let [webcamWidth, webcamHeight] = resolution.split("x");
        this.webcamConfig.width = { exact: Number(webcamWidth) };
        this.webcamConfig.height = { exact: Number(webcamHeight) };

        this.electron.ipcRenderer.send(
            "changing-active-webcamId",
            this.webcamConfig
        );

        this.setWebcamWithConfig(this.webcamConfig);
        return;
    }

    async setFPS(option: string) {
        await this.stopWebcam();

        this.spinnerActive = true;
        this.webcamGuard.setLoadingStatus(true);
        if (this.webcamConfig == undefined) {
            this.webcamConfig = await this.getDefaultWebcamConfig(
                this.selectedWebcamId
            );
        }
        this.webcamConfig.frameRate = { exact: Number(option) };

        this.electron.ipcRenderer.send(
            "setting-webcam-with-loading",
            this.webcamConfig
        );

        this.setWebcamWithConfig(this.webcamConfig);

        return;
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

    checkIfPresetNameAvailable(checkPresetName: string): boolean {
        let presetNames: string[] = [];
        this.thisWebcamConfigs.forEach((preset) => {
            presetNames.push(preset.presetName);
        });
        return !presetNames.includes(checkPresetName);
    }

    async applyConfig(config: WebcamPresetValues) {
        this.setLoading();

        for (const field in this.webcamFormGroup.controls) {
            this.webcamFormGroup.get(field).setValue(config[field]);
        }
        let [webcamWidth, webcamHeight] = config["resolution"].split("x");
        this.webcamConfig = {
            deviceId: { exact: this.selectedWebcamId },
            width: { exact: Number(webcamWidth) },
            height: { exact: Number(webcamHeight) },
            frameRate: { exact: Number(config["fps"]) },
        };

        await this.stopWebcam();
        for (const field in this.webcamFormGroup.controls) {
            if (field != "resolution" && field != "fps") {
                this.executeCameraCtrls(field, config[field]);
            }
        }
        await this.setWebcamWithConfig(this.webcamConfig);
    }

    public async reloadConfigValues() {
        await this.getCameraSettings().then((data) => {
            this.webcamFormGroup = this.convertSettingsToFormGroup(
                JSON.parse(data)
            );
        });
    }

    // todo: rename or adjust function
    getDefaultWebcamConfig(webcamId: string) {
        let [webcamWidth, webcamHeight] = this.getOptionValue(
            "resolution",
            "current"
        ).split("x");
        let fps = this.getOptionValue("fps", "current");

        return {
            deviceId: { exact: webcamId },
            width: { exact: Number(webcamWidth) },
            height: { exact: Number(webcamHeight) },
            frameRate: { exact: Number(fps) },
        };
    }

    filterPresetsForCurrentDevice(webcamPresets: WebcamPreset[]) {
        webcamPresets.forEach((config) => {
            let currentWebcamId = this.getWebcamId();
            if (config.webcamId == currentWebcamId) {
                this.thisWebcamConfigs.push(config);
            } else {
                this.notThisWebcamConfigs.push(config);
            }
        });
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
        this.thisWebcamConfigs = this.thisWebcamConfigs.filter(
            (x) => x.presetName != presetName
        );
        let preset = this.convertFormgroupToSettings(presetName);
        this.selectedPreset = preset;
        this.thisWebcamConfigs.push(preset);
        let config = this.thisWebcamConfigs.concat(this.notThisWebcamConfigs);
        // todo: adjust path with variable
        this.config.writeWebcamSettings(config, "webcamSettings.json");
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

    // todo: utilize for configuration of values
    public mouseup() {
        console.log("Mouse Up");
        if (this.timer) {
            clearInterval(this.timer);
        }
    }

    public mousedown() {
        this.timer = setInterval(() => {
            console.log("Mouse Down");
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

    async loadingConfigDataFromJSON() {
        // todo: selecting last saved instead of first in list
        if (fs.existsSync("webcamSettings.json")) {
            this.reloadConfigValues();
            let presetData = this.config.readWebcamSettings(
                "webcamSettings.json"
            );
            this.presetDataFromJson = presetData;
            this.filterPresetsForCurrentDevice(presetData);
            this.applyConfig(this.presetDataFromJson[0].webcamSettings);
        } else {
            await this.reloadConfigValues();
            this.applyConfig(this.webcamFormGroup.getRawValue());
        }
    }

    async deletePreset() {
        this.thisWebcamConfigs = this.thisWebcamConfigs.filter(
            (x) => x.presetName != this.selectedPreset.presetName
        );
        this.selectedPreset = null;
        let config = this.thisWebcamConfigs.concat(this.notThisWebcamConfigs);
        // todo: adjust path with variable
        this.config.writeWebcamSettings(config, "webcamSettings.json");
    }

    getPercentValue(preset: string, current: number) {
        let max = this.getOptionValue(preset, "max");
        let min = this.getOptionValue(preset, "min");
        return Math.round(((current - min) * 100) / (max - min));
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
    }
}
