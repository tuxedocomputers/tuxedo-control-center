import { Component, OnInit } from "@angular/core";
import { ElectronService } from "ngx-electron";
import { Observable, Subject } from "rxjs";
import { WebcamSettigs } from "src/common/models/TccWebcamSettings";
import { CompatibilityService } from "../compatibility.service";
import { UtilsService } from "../utils.service";

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

    constructor(
        private electron: ElectronService,
        private utils: UtilsService,
        public compat: CompatibilityService
    ) {}

    ngOnInit() {
        this.setAllCameraMetadata();
    }

    // support.component.ts
    public async executeShellCommand(command: string): Promise<string> {
        return new Promise<string>(async (resolve) => {
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

    public setCameraMetadata(device: any, cameraPathsWithStreams: any) {
        let deviceId = device.label.match(/\((.*:.*)\)/);
        if (deviceId != null) {
            this.getCameraPathsWithId(deviceId[1]).then((availableIds) => {
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

    public setAllCameraMetadata(): Promise<null> {
        return new Promise<null>((resolve) => {
            this.getCameraVideoStreamPaths().then((data) => {
                let cameraPathsWithStreams = JSON.parse(data);
                navigator.mediaDevices
                    .getUserMedia({ audio: false, video: true })
                    .then(() => {
                        navigator.mediaDevices
                            .enumerateDevices()
                            .then((devices) => {
                                devices.forEach((device) => {
                                    this.setCameraMetadata(
                                        device,
                                        cameraPathsWithStreams
                                    );
                                });
                            })
                            .catch((error) => {
                                console.log("Error :", error);
                            });
                    });
                resolve(null);
            });
        });
    }

    public getWebcamPathWithId() {
        let webcamEntry = this.webcamDropdownData.find(
            (x) => x["id"] == this.selectedWebcamId
        );
        return webcamEntry["path"];
    }

    public setWebcam(webcamId: string) {
        this.getCameraSettings(this.getWebcamPathWithId()).then((data) => {
            const settings: WebcamSettigs[] = JSON.parse(data);
            this.webcamSettings = settings;
        });
        this.nextWebcam.next(webcamId);
    }

    public get nextWebcamObservable(): Observable<boolean | string> {
        return this.nextWebcam.asObservable();
    }

    // todo: deduplicate code
    public setWhiteBalance(devicePath: string) {
        this.webcamSettings.forEach((x) => {
            if (x.config_category == "Balance" && x.config_type == "Color") {
                x.config_data.forEach((y) => {
                    if (y.name == "white_balance_temperature") {
                        this.executeShellCommand(
                            `v4l2-ctl -d ${devicePath} -c white_balance_temperature=${y.current}`
                        );
                    }
                });
            }
        });
    }

    public setExposure(devicePath: string) {
        this.webcamSettings.forEach((x) => {
            if (
                x.config_category == "Exposure" &&
                x.config_type == "Exposure"
            ) {
                x.config_data.forEach((y) => {
                    if (y.name == "exposure_absolute") {
                        this.executeShellCommand(
                            "python3 " +
                                this.electron.process.cwd() +
                                `/src/cameractrls/cameractrls.py -d ${devicePath} -c exposure_absolute=${y.current}`
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
