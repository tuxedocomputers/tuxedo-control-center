import {
    ChangeDetectorRef,
    Component,
    ElementRef,
    OnInit,
    ViewChild,
} from "@angular/core";
import { ElectronService } from "ngx-electron";

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
            async (event, webcamConfig) => {
                this.spinnerActive = true;
                this.cdref.detectChanges();
                await this.stopWebcam();
                await this.setWebcamWithConfig(webcamConfig);
                this.spinnerActive = false;
                this.cdref.detectChanges();
            }
        );
    }

    // todo: deduplicate
    async setWebcamWithConfig(config?: any): Promise<void> {
        await navigator.mediaDevices
            .getUserMedia({
                video: config,
            })
            .then(async (stream) => {
                this.video.nativeElement.srcObject = stream;
                this.mediaDeviceStream = stream;
            });
        return new Promise(
            (resolve) => (this.video.nativeElement.onplaying = resolve)
        );
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

    async ngOnDestroy() {
        this.stopWebcam();
    }
}
