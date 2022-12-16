import { Component, ElementRef, OnInit, ViewChild } from "@angular/core";
import { ElectronService } from "ngx-electron";
import { fromEvent, Observable, Subject, Subscription } from "rxjs";
import { WebcamJSON, WebcamSettigs } from "src/common/models/TccWebcamSettings";
import { CompatibilityService } from "../compatibility.service";
import { UtilsService } from "../utils.service";
import { ChangeDetectorRef } from "@angular/core";

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

    webcamHeight: number = undefined;
    webcamWidth: number = undefined;
    webcamFPS: number = undefined;

    constructor(
        private electron: ElectronService,
        private utils: UtilsService,
        public compat: CompatibilityService,
        private cdref: ChangeDetectorRef
    ) {}

    async ngOnInit() {
        this.utils.pageDisabled = true;
        const cameraWindowObservable = fromEvent(
            this.electron.ipcRenderer,
            "camera-window-closed"
        );
        this.subscriptions.add(
            cameraWindowObservable.subscribe(() => {
                this.enableCamera();
            })
        );

        await this.setAllCameraMetadata().then((webcamData) => {
            this.webcamDropdownData = webcamData;
            this.selectedWebcamId = webcamData[0].id;

            let webcamId: string = webcamData[0].id;
            this.getCameraSettings(this.getWebcamPathWithId()).then;
            this.setWebcamWithIdAndSettings(webcamId).then(() => {
                this.utils.pageDisabled = false;
                this.webcamInitComplete = true;
            });
        });
    }

    ngAfterContentChecked() {
        this.cdref.detectChanges();
    }

    ngOnDestroy(): void {
        this.subscriptions.unsubscribe();
        this.stopWebcam();
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

    public getCameraSettings(devicePath: string): Promise<string> {
        return new Promise<string>((resolve) => {
            this.utils
                .execFile(
                    "python3 " +
                        this.electron.process.cwd() +
                        `/src/cameractrls/cameractrls.py -d ${devicePath}`
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

                        this.tracks = stream.getVideoTracks();
                        this.video.nativeElement.srcObject = stream;
                    });
                resolve(this.webcamDropdownData);
            });
        });
    }

    public getWebcamPathWithId() {
        let webcamEntry = this.webcamDropdownData.find(
            (x) => x["id"] == this.selectedWebcamId
        );
        return webcamEntry["path"];
    }

    public getWebcamId() {
        let webcamEntry = this.webcamDropdownData.find(
            (x) => x["id"] == this.selectedWebcamId
        );
        return webcamEntry["label"].match(/\((.*:.*)\)/)[1];
    }

    async setWithWebcamId(webcamId: string, config?: any): Promise<void> {
        if (config == undefined) {
            config = this.getWebcamConfig(
                undefined,
                undefined,
                undefined,
                webcamId
            );
        }
        await navigator.mediaDevices
            .getUserMedia({
                video: config,
            })
            .then((stream) => {
                this.video.nativeElement.srcObject = stream;
                this.tracks = stream.getVideoTracks();
            });
    }

    stopWebcam() {
        if (this.video.nativeElement.srcObject != null) {
            for (const track of this.video.nativeElement.srcObject.getTracks()) {
                track.stop();
            }
        }
        this.video.nativeElement.srcObject = null;
    }

    setWebcamWithIdAndSettings(webcamId: string, config?: any) {
        return this.getCameraSettings(this.getWebcamPathWithId()).then(
            async (data) => {
                const settings: WebcamSettigs[] = JSON.parse(data);
                this.webcamSettings = settings;
                await this.setWithWebcamId(webcamId, config);
                return new Promise(
                    (resolve) => (this.video.nativeElement.onplaying = resolve)
                );
            }
        );
    }

    public setWebcam(webcamId: string) {
        this.spinnerActive = true;
        this.stopWebcam();
        this.setWebcamWithIdAndSettings(webcamId).then(
            () => (this.spinnerActive = false)
        );
    }

    public openWindow(event: any) {
        this.stopWebcam();
        this.electron.ipcRenderer.send("createWebcamPreview");
        this.electron.ipcRenderer.send(
            "changing-active-webcamId",
            this.selectedWebcamId
        );
    }

    public enableCamera() {
        this.setWebcam(this.selectedWebcamId);
    }

    public get nextWebcamObservable(): Observable<boolean | string> {
        return this.nextWebcam.asObservable();
    }

    // todo: deduplicate code
    public setWhiteBalance(devicePath: string) {
        this.webcamSettings.forEach((config) => {
            if (
                config.config_category == "Balance" &&
                config.config_type == "Color"
            ) {
                config.config_data.forEach((configParameter) => {
                    if (configParameter.name == "white_balance_temperature") {
                        this.executeShellCommand(
                            `v4l2-ctl -d ${devicePath} -c white_balance_temperature=${configParameter.current}`
                        );
                    }
                });
            }
        });
    }

    public setExposure(devicePath: string) {
        this.webcamSettings.forEach((config) => {
            if (
                config.config_category == "Exposure" &&
                config.config_type == "Exposure"
            ) {
                config.config_data.forEach((configParameter) => {
                    if (configParameter.name == "exposure_absolute") {
                        this.executeShellCommand(
                            "python3 " +
                                this.electron.process.cwd() +
                                `/src/cameractrls/cameractrls.py -d ${devicePath} -c exposure_absolute=${configParameter.current}`
                        );
                    }
                });
            }
        });
    }

    public setSliderValue(event: any, configParameter: string) {
        let devicePath = this.getWebcamPathWithId();
        this.executeShellCommand(
            `v4l2-ctl -d ${devicePath} -c ${configParameter}=${event.value}`
        );
    }

    public setCheckboxValue(event: any, configParameter: string) {
        let devicePath = this.getWebcamPathWithId();
        this.executeShellCommand(
            `v4l2-ctl -d ${devicePath} -c ${configParameter}=${Number(
                event.checked
            )}`
        );

        // white_balance_temperature must be set after disabling auto to take effect
        if (
            configParameter == "white_balance_temperature_auto" &&
            event.checked == false
        ) {
            this.setWhiteBalance(devicePath);
        }
        this.reloadConfigValues();
    }

    // todo: deduplicate
    getResolution() {
        this.webcamSettings.forEach((config) => {
            if (
                config.config_category == "Capture" &&
                config.config_type == "Capture"
            ) {
                config.config_data.forEach((configParameter) => {
                    if (configParameter.name == "resolution") {
                        if (typeof configParameter.current === "string") {
                            this.webcamWidth = Number(
                                configParameter.current.split("x")[0]
                            );
                            this.webcamHeight = Number(
                                configParameter.current.split("x")[1]
                            );
                        }
                    }
                });
            }
        });
    }

    getFPS() {
        this.webcamSettings.forEach((config) => {
            if (
                config.config_category == "Capture" &&
                config.config_type == "Capture"
            ) {
                config.config_data.forEach((configParameter) => {
                    if (configParameter.name == "fps") {
                        this.webcamFPS = Number(configParameter.current);
                    }
                });
            }
        });
    }

    getWebcamConfig(
        width?: number,
        height?: number,
        fps?: number,
        webcamId?: string
    ) {
        if (width == undefined || height == undefined) {
            if (
                this.webcamWidth == undefined ||
                this.webcamHeight == undefined
            ) {
                this.getResolution();
            }

            width = this.webcamWidth;
            height = this.webcamHeight;
        } else {
            this.webcamWidth = width;
            this.webcamHeight = height;
        }

        if (fps == undefined) {
            if (this.webcamFPS == undefined) {
                this.getFPS();
            }
            fps = this.webcamFPS;
        } else {
            this.webcamFPS = fps;
        }

        if (webcamId == undefined) {
            webcamId = this.selectedWebcamId;
        } else {
            this.selectedWebcamId = webcamId;
        }

        return {
            deviceId: webcamId,
            width: { exact: width },
            height: { exact: height },
            frameRate: { exact: fps },
        };
    }

    setResolution(option: string) {
        this.stopWebcam();
        this.spinnerActive = true;

        let width = Number(option.split("x")[0]);
        let height = Number(option.split("x")[1]);
        let config = this.getWebcamConfig(width, height);
        this.setWebcamWithIdAndSettings(this.selectedWebcamId, config).then(
            () => (this.spinnerActive = false)
        );
        return;
    }

    setFPS(option: string) {
        this.stopWebcam();
        this.spinnerActive = true;
        let fps = Number(option);
        let config = this.getWebcamConfig(undefined, undefined, fps);
        this.setWebcamWithIdAndSettings(this.selectedWebcamId, config).then(
            () => (this.spinnerActive = false)
        );
        return;
    }

    setMenuConfigValue(configParameter: string, option: string) {
        let devicePath = this.getWebcamPathWithId();

        this.executeShellCommand(
            "python3 " +
                this.electron.process.cwd() +
                `/src/cameractrls/cameractrls.py -d ${devicePath} -c ${configParameter}=${option}`
        );

        // exposure_absolute must be set after disabling auto to take effect
        // todo: check if other laptops have the same naming scheme
        if (configParameter == "exposure_auto" && option == "manual_mode") {
            this.setExposure(devicePath);
        }
    }

    public setOptionsMenuValue(
        event: any,
        configParameter: string,
        option: string
    ) {
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

    public reloadConfigValues() {
        this.getCameraSettings(this.getWebcamPathWithId()).then((data) => {
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
            webcamId: this.getWebcamId(),
            webcamSettings: mySettings,
        };
        const fs = require("fs");
        fs.writeFileSync("webcam_settings.json", JSON.stringify(myWebcamJSON));
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
