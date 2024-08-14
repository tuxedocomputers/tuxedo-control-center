import {
    ChangeDetectorRef,
    Component,
    ElementRef,
    OnInit,
    ViewChild,
} from "@angular/core";
import { WebcamConstraints } from "src/common/models/TccWebcamSettings";

@Component({
    selector: "app-webcam-preview",
    templateUrl: "./webcam-preview.component.html",
    styleUrls: ["./webcam-preview.component.scss"],
})
export class WebcamPreviewComponent implements OnInit {
    constructor(
        private cdref: ChangeDetectorRef
    ) {}

    @ViewChild("video", { static: true })
    public video: ElementRef;
    mediaDeviceStream: MediaStream;
    spinnerActive: boolean = false;

    ngOnInit(): void {
        window.webcam.onSettingWebcamWithLoading(async (event: any, config: WebcamConstraints): Promise<void> => {
            document.getElementById("video").style.visibility = "hidden";
                this.spinnerActive = true;
                this.cdref.detectChanges();
                this.stopWebcam();
                await this.setWebcamWithConfig(config);
                window.webcamAPI.applyControls();
                setTimeout(async (): Promise<void> => {
                    document.getElementById("video").style.visibility =
                        "visible";
                    this.spinnerActive = false;
                    this.cdref.detectChanges();
                }, 500);
            }
        );
    }

    private async setWebcamWithConfig(
        config: WebcamConstraints
    ): Promise<void> {
        await navigator.mediaDevices
            .getUserMedia({
                video: config,
            })
            .then(async (stream: MediaStream): Promise<void> => {
                this.video.nativeElement.srcObject = stream;
                this.mediaDeviceStream = stream;
            });
        this.mediaDeviceStream.getVideoTracks()[0].onended = (): void => {
            window.webcamAPI.videoEnded();
        };
    }

    private stopWebcam(): void {
        this.video.nativeElement.pause();
        if (this.mediaDeviceStream != undefined) {
            for (const track of this.mediaDeviceStream.getTracks()) {
                track.stop();
            }
        }
        this.video.nativeElement.srcObject = null;
    }

    async ngOnDestroy(): Promise<void> {
        this.stopWebcam();
    }
}
