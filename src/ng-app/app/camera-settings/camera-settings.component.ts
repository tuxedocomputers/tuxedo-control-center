import { Component, OnInit } from "@angular/core";
import { ElectronService } from "ngx-electron";
import { Observable, Subject } from "rxjs";
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

  selectedWebcamId: any;
  webcamDropdownData: any[] = [];
  cameraBrightnessValue: number = 0;
  cameraBrightnessMax: number = 100; // todo: set automatically
  cameraBrightnessMin: number = 0;
  cameraBrightnessStep: number = 1;
  nextWebcam: Subject<boolean | string> = new Subject<boolean | string>();
  allowCameraSwitch: boolean = false;

  public setCameraMetadata(device: any, cameraPathsWithStreams: any) {
    let deviceId = device.label.match(/\((.*:.*)\)/);
    if (deviceId != null) {
      this.getCameraPathsWithId(deviceId[1]).then((availableIds) => {
        cameraPathsWithStreams.forEach((cameraPath) => {
          if (
            Object.values(JSON.parse(availableIds)).indexOf(cameraPath) > -1
          ) {
            this.webcamDropdownData.push({
              label: device.label,
              id: device.deviceId,
              path: `/dev/${cameraPath}`,
            });
          }
        });
        console.log(this.webcamDropdownData);
      });
    }
  }

  public setAllCameraMetadata() {
    this.getCameraVideoStreamPaths().then((data) => {
      let cameraPathsWithStreams = JSON.parse(data);

      navigator.mediaDevices
        .getUserMedia({ audio: false, video: true })
        .then(() => {
          navigator.mediaDevices
            .enumerateDevices()
            .then((devices) => {
              devices.forEach((device) => {
                this.setCameraMetadata(device, cameraPathsWithStreams);
              });
            })
            .catch((error) => {
              console.log("Error :", error);
            });
        });
    });
  }

  public getWebcamPathWithId() {
    let webcamEntry = this.webcamDropdownData.find(
      (x) => x["id"] == this.selectedWebcamId
    );
    return webcamEntry["path"];
  }

  public setCameraBrightness(event: any) {
    let devicePath = this.getWebcamPathWithId();

    this.executeShellCommand(
      `v4l2-ctl -d ${devicePath} -c brightness=${event.value}`
    );
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

  public get nextWebcamObservable(): Observable<boolean | string> {
    return this.nextWebcam.asObservable();
  }

  public setWebcam(webcamId: string) {
    this.nextWebcam.next(webcamId);
  }

  constructor(
    private electron: ElectronService,
    private utils: UtilsService,
    public compat: CompatibilityService
  ) {}

  ngOnInit(): void {
    this.setAllCameraMetadata();
  }
}
