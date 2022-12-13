import { Component, OnInit } from "@angular/core";
import { ElectronService } from "ngx-electron";
import { Observable, Subject } from "rxjs";

@Component({
    selector: "app-webcam-preview",
    templateUrl: "./webcam-preview.component.html",
    styleUrls: ["./webcam-preview.component.scss"],
})
export class WebcamPreviewComponent implements OnInit {
    constructor(private electron: ElectronService) {}

    nextWebcam: Subject<boolean | string> = new Subject<boolean | string>();

    // todo: deduplicate?
    public get nextWebcamObservable(): Observable<boolean | string> {
        return this.nextWebcam.asObservable();
    }

    ngOnInit(): void {
        this.electron.ipcRenderer.on("updating-webcamId", (event, webcamId) => {
            this.nextWebcam.next(webcamId);
        });
    }

    // todo: ngOnDestroy webcam
}
