import { Component, ElementRef, OnInit, ViewChild } from "@angular/core";
import { ElectronService } from "ngx-electron";
import { fromEvent, Observable, Subject, Subscription } from "rxjs";
import { WebcamJSON, WebcamSettigs } from "src/common/models/TccWebcamSettings";
import { CompatibilityService } from "../compatibility.service";
import { UtilsService } from "../utils.service";
import { ChangeDetectorRef } from "@angular/core";
import { WebcamGuardService } from "../webcam.service";

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

    webcamDropdownData: any[] = [];
    selectedWebcamId: any;
    nextWebcam: Subject<boolean | string> = new Subject<boolean | string>();
    allowCameraSwitch: boolean = false;
    webcamSettings: WebcamSettigs[];
    expandedRegions: { [key: string]: boolean } = {};
    newWindow = null;
    tracks: any;
    private subscriptions: Subscription = new Subscription();
    webcamInitComplete: boolean = false;
    spinnerActive: boolean = false;
    @ViewChild("video", { static: true })
    public video: ElementRef;
    webcamConfig: any = undefined;
    previewWindowActive: boolean = false;

    metadataStream: any;
    mediaDeviceStream: any;

    constructor(
        private electron: ElectronService,
        private utils: UtilsService,
        public compat: CompatibilityService,
        private cdref: ChangeDetectorRef,
        private webcamGuard: WebcamGuardService
    ) {}

    async ngOnInit() {
        this.webcamGuard.setLoadingStatus(true);
        this.utils.pageDisabled = true;
        const cameraWindowObservable = fromEvent(
            this.electron.ipcRenderer,
            "camera-window-closed"
        );
        this.subscriptions.add(
            cameraWindowObservable.subscribe(async () => {
                document.getElementById("hidden").style.display = "flex";
                this.setWebcam(this.selectedWebcamId);
            })
        );

        await this.setAllCameraMetadata().then(async (webcamData) => {
            this.webcamDropdownData = webcamData;
            await this.setWebcamWithId(webcamData[0].id);
        });
    }

    ngAfterContentChecked() {
        this.cdref.detectChanges();
    }

    async ngOnDestroy() {
        this.stopWebcam();
        this.subscriptions.unsubscribe();
    }

    // support.component.ts
    public executeShellCommand(command: string): Promise<string> {
        return new Promise<string>((resolve) => {
            this.utils
                .execCmd(command)
                .then((result) => {
                    resolve(result.toString());
                })
                .catch((e) => {
                    console.log(e);
                });
        });
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

    public async setCameraMetadata(device: any, cameraPathsWithStreams: any) {
        let deviceId = device.label.match(/\((.*:.*)\)/);
        if (deviceId != null) {
            await this.getCameraPathsWithId(deviceId[1]).then(
                (availableIds) => {
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
                }
            );
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

    public async setDevicesMetadata(devices: any, cameraPathsWithStreams: any) {
        let filteredDevices = devices.filter(
            (device) => device.kind == "videoinput"
        );
        for (const device of filteredDevices) {
            await this.setCameraMetadata(device, cameraPathsWithStreams);
        }
    }

    public setAllCameraMetadata(): Promise<any[]> {
        return new Promise<any[]>((resolve) => {
            this.getCameraVideoStreamPaths().then(async (data) => {
                let cameraPathsWithStreams = JSON.parse(data);
                await navigator.mediaDevices
                    .getUserMedia({ audio: false, video: true })
                    .then(async (stream) => {
                        this.metadataStream = stream;
                        await navigator.mediaDevices
                            .enumerateDevices()
                            .then(async (devices) => {
                                await this.setDevicesMetadata(
                                    devices,
                                    cameraPathsWithStreams
                                );
                            })
                            .catch((error) => {
                                console.log("Error :", error);
                            });
                    });
                resolve(this.webcamDropdownData);
            });
        });
    }

    async stopWebcam() {
        await this.video.nativeElement.pause();
        for (const track of this.metadataStream.getTracks()) {
            track.stop();
        }
        for (const track of this.mediaDeviceStream.getTracks()) {
            track.stop();
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

    public async setWebcam(webcamId: string) {
        this.previewWindowActive = true;
        this.spinnerActive = true;
        this.webcamGuard.setLoadingStatus(true);
        await this.stopWebcam();
        await this.setWebcamWithId(webcamId);
    }

    public openWindow(event: any) {
        this.stopWebcam();
        document.getElementById("hidden").style.display = "none";

        this.electron.ipcRenderer.send("createWebcamPreview");
        this.electron.ipcRenderer.send(
            "changing-active-webcamId",
            this.selectedWebcamId
        );
    }

    public enableCamera() {
        this.setWebcam(this.selectedWebcamId);
    }

    getCurrentCofigValue(
        configType: string,
        configCategory: string,
        configName: string
    ) {
        let configValue = undefined;
        this.webcamSettings.forEach((config) => {
            if (
                config.config_type == configType &&
                config.config_category == configCategory
            ) {
                config.config_data.forEach((configParameter) => {
                    if (configParameter.name == configName) {
                        configValue = configParameter.current;
                    }
                });
            }
        });
        return configValue;
    }

    public setSliderValue(event: any, configParameter: string) {
        this.executeCameraCtrls(configParameter, event.value);
    }

    executeCameraCtrls(parameter: string, value: string) {
        let devicePath = this.getWebcamInformation()["path"];
        this.executeShellCommand(
            "python3 " +
                this.electron.process.cwd() +
                `/src/cameractrls/cameractrls.py -d ${devicePath} -c ${parameter}=${value}`
        );
    }

    public setCheckboxValue(event: any, configParameter: string) {
        this.executeCameraCtrls(configParameter, String(Number(event.checked)));

        // white_balance_temperature must be set after disabling auto to take effect
        if (
            configParameter == "white_balance_temperature_auto" &&
            event.checked == false
        ) {
            let currentWhiteBalance = this.getCurrentCofigValue(
                "Color",
                "Balance",
                "white_balance_temperature"
            );
            this.executeCameraCtrls(
                "white_balance_temperature",
                currentWhiteBalance
            );
        }
        setTimeout(() => {
            this.reloadConfigValues();
        }, 100);
    }

    setMenuConfigValue(configParameter: string, option: string) {
        this.executeCameraCtrls(configParameter, option);

        // exposure_absolute must be set after disabling auto to take effect
        // todo: check if other laptops have the same naming scheme
        if (configParameter == "exposure_auto" && option == "manual_mode") {
            let currentExposure = this.getCurrentCofigValue(
                "Exposure",
                "Exposure",
                "exposure_absolute"
            );

            this.executeCameraCtrls("exposure_absolute", currentExposure);
        }
    }

    public setOptionsMenuValue(
        event: any,
        configParameter: string,
        option: string
    ) {
        if (event.isUserInput) {
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

    public async reloadConfigValues() {
        await this.getCameraSettings().then((data) => {
            const settings: WebcamSettigs[] = JSON.parse(data);
            this.webcamSettings = settings;
        });
    }

    public handleRegionPanelStateChange(key: string, isOpen: boolean) {
        this.expandedRegions = { ...this.expandedRegions, [key]: isOpen };
    }

    // todo: multiple custom presets
    public savingWebcamPresets(event: any) {
        let mySettings: WebcamSettigs[] = this.webcamSettings;
        let myWebcamJSON: WebcamJSON = {
            presetName: "test",
            webcamId:
                this.getWebcamInformation()["label"].match(/\((.*:.*)\)/)[1],
            webcamSettings: mySettings,
        };
        const fs = require("fs");
        fs.writeFileSync("webcam_settings.json", JSON.stringify(myWebcamJSON));
    }

    getDefaultWebcamConfig(webcamId: string) {
        let resolution = this.getCurrentCofigValue(
            "Capture",
            "Capture",
            "resolution"
        );
        let webcamWidth = Number(resolution.split("x")[0]);
        let webcamHeight = Number(resolution.split("x")[1]);
        let fps = this.getCurrentCofigValue("Capture", "Capture", "fps");

        return {
            deviceId: { exact: webcamId },
            width: { exact: webcamWidth },
            height: { exact: webcamHeight },
            frameRate: { exact: fps },
        };
    }

    async setResolution(option: string) {
        await this.stopWebcam();
        this.spinnerActive = true;
        this.webcamGuard.setLoadingStatus(true);
        if (this.webcamConfig == undefined) {
            this.webcamConfig = await this.getDefaultWebcamConfig(
                this.selectedWebcamId
            );
        }
        this.webcamConfig.width = { exact: Number(option.split("x")[0]) };
        this.webcamConfig.height = { exact: Number(option.split("x")[1]) };
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
        this.setWebcamWithConfig(this.webcamConfig);
        return;
    }

    async setWebcamWithConfig(config?: any): Promise<void> {
        await navigator.mediaDevices
            .getUserMedia({
                video: config,
            })
            .then(async (stream) => {
                this.video.nativeElement.srcObject = stream;
                this.mediaDeviceStream = stream;
            });
    }

    videoReady() {
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

    // not possible to use variable to dynamically generate translations, because localize needs to know at compiletime
    getConfigTranslation(configText: string) {
        if (configText == "Exposure, Auto") {
            return $localize`Exposure, Auto`;
        }
        if (configText == "Exposure (Absolute)") {
            return $localize`Exposure (Absolute)`;
        }
        if (configText == "Exposure, Auto Priority") {
            return $localize`Exposure, Auto Priority`;
        }
        if (configText == "Gain") {
            return $localize`Gain`;
        }
        if (configText == "Backlight Compensation") {
            return $localize`Backlight Compensation`;
        }
        if (configText == "White Balance Temperature, Auto") {
            return $localize`White Balance Temperature, Auto`;
        }
        if (configText == "White Balance Temperature") {
            return $localize`White Balance Temperature`;
        }
        if (configText == "Brightness") {
            return $localize`Brightness`;
        }
        if (configText == "Contrast") {
            return $localize`Contrast`;
        }
        if (configText == "Saturation") {
            return $localize`Saturation`;
        }
        if (configText == "Sharpness") {
            return $localize`Sharpness`;
        }
        if (configText == "Hue") {
            return $localize`Hue`;
        }
        if (configText == "Gamma") {
            return $localize`Gamma`;
        }
        return configText;
    }
}
