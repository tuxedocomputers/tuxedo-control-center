import { Component, OnInit } from "@angular/core";
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
    webcamDisabled: any = true;
    showPortal: boolean = false;
    private subscriptions: Subscription = new Subscription();

    constructor(
        private electron: ElectronService,
        private utils: UtilsService,
        public compat: CompatibilityService,
        private cdref: ChangeDetectorRef
    ) {}

    async ngOnInit() {
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
            this.setWebcam(webcamData[0].id);
        });
    }

    ngAfterContentChecked() {
        this.cdref.detectChanges();
    }

    ngOnDestroy(): void {
        this.subscriptions.unsubscribe();
        this.disableCamera();
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

    public setWebcam(webcamId: string) {
        this.getCameraSettings(this.getWebcamPathWithId()).then((data) => {
            const settings: WebcamSettigs[] = JSON.parse(data);
            this.webcamSettings = settings;
        });
        this.nextWebcam.next(webcamId);
        this.electron.ipcRenderer.send("changing-active-webcamId", webcamId);
    }

    public disableCamera() {
        if (this.tracks != undefined) {
            this.tracks.forEach((track) => {
                track.stop();
            });
        }
        this.webcamDisabled = false;
    }

    public openWindow(event: any) {
        this.electron.ipcRenderer.send("createWebcamPreview");
        this.disableCamera();
        this.setWebcam(this.selectedWebcamId);
    }

    public enableCamera() {
        this.webcamDisabled = true;
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
        console.log(this.webcamDropdownData);
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

    public setOptionsMenuValue(
        event: any,
        configParameter: string,
        option: string
    ) {
        let devicePath = this.getWebcamPathWithId();

        // if capture related, camera needs to be turned off to avoid "recourse is busy"
        if (["pixelformat", "resolution", "fps"].includes(configParameter)) {
            console.log("todo");
        }

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
