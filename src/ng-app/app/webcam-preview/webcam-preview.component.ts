import {
    ChangeDetectorRef,
    Component,
    ElementRef,
    OnInit,
    ViewChild,
} from "@angular/core";
import { ElectronService } from "ngx-electron";
import { WebcamConstraints } from "src/common/models/TccWebcamSettings";

@Component({
    selector: "app-webcam-preview",
    templateUrl: "./webcam-preview.component.html",
    styleUrls: ["./webcam-preview.component.scss"],
})
export class WebcamPreviewComponent implements OnInit {
    constructor(
        private electron: ElectronService,
        private cdref: ChangeDetectorRef
    ) {}

    @ViewChild("video", { static: true })
    public video: ElementRef;
    mediaDeviceStream: any;
    spinnerActive: boolean = false;

    ngOnInit(): void {
        this.electron.ipcRenderer.on(
            "setting-webcam-with-loading",
            async (event, config) => {
                document.getElementById("video").style.visibility = "hidden";
                this.spinnerActive = true;
                this.cdref.detectChanges();
                this.stopWebcam();
                await this.setWebcamWithConfig(config);
                this.electron.ipcRenderer.send("apply-controls");
                setTimeout(async () => {
                    document.getElementById("video").style.visibility =
                        "visible";
                    this.spinnerActive = false;
                    this.cdref.detectChanges();
                }, 500);
            }
        );
    }

    // todo: handle situation where webcam gets unplugged while external window is visible
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

    async ngOnDestroy() {
        this.stopWebcam();
    }
}
