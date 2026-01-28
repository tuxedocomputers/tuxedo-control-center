/*!
 * Copyright (c) 2019-2026 TUXEDO Computers GmbH <tux@tuxedocomputers.com>
 *
 * This file is part of TUXEDO Control Center.
 *
 * TUXEDO Control Center is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * TUXEDO Control Center is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with TUXEDO Control Center.  If not, see <https://www.gnu.org/licenses/>.
 */

// biome-ignore lint: injection token
import { ChangeDetectorRef, Component, type ElementRef, type OnInit, ViewChild } from '@angular/core';
import type { IpcRendererEvent } from 'electron';
import type { WebcamConstraints } from '../../../common/models/TccWebcamSettings';

@Component({
    selector: 'app-webcam-preview',
    templateUrl: './webcam-preview.component.html',
    styleUrls: ['./webcam-preview.component.scss'],
    standalone: false,
})
export class WebcamPreviewComponent implements OnInit {
    @ViewChild('video', { static: true })
    public video: ElementRef;
    private mediaStream: MediaStream;
    public spinnerActive: boolean = undefined;

    constructor(public cdRef: ChangeDetectorRef) {}

    public async ngOnInit(): Promise<void> {
        window.webcam.onSettingWebcamWithLoading(
            async (event: IpcRendererEvent, config: WebcamConstraints): Promise<void> => {
                this.spinnerActive = true;
                this.cdRef.detectChanges();
                document.getElementById('video').style.visibility = 'hidden';
                this.stopWebcam();
                await this.setWebcamWithConfig(config);
                window.webcamAPI.applyControls();
                await new Promise<void>(
                    (resolve: () => void): NodeJS.Timeout =>
                        setTimeout(async (): Promise<void> => {
                            document.getElementById('video').style.visibility = 'visible';
                            this.spinnerActive = false;
                            this.cdRef.detectChanges();
                            resolve();
                        }, 500),
                );
            },
        );
    }

    private async setWebcamWithConfig(config: WebcamConstraints): Promise<void> {
        await navigator.mediaDevices
            .getUserMedia({
                video: config,
            })
            .then(async (stream: MediaStream): Promise<void> => {
                this.video.nativeElement.srcObject = stream;
                this.mediaStream = stream;
            });
        this.mediaStream.getVideoTracks()[0].onended = (): void => {
            window.webcamAPI.videoEnded();
        };
    }

    private stopWebcam(): void {
        this.video.nativeElement.pause();
        if (this.mediaStream !== undefined) {
            for (const track of this.mediaStream.getTracks()) {
                track.stop();
            }
        }
        this.video.nativeElement.srcObject = null;
    }

    async ngOnDestroy(): Promise<void> {
        this.stopWebcam();
    }
}
