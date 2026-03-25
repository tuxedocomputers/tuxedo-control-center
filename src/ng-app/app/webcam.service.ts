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

import { Injectable } from '@angular/core';
import { FormGroup } from '@angular/forms';
import type { WebcamDevice, WebcamDeviceInformation } from '../../common/models/TccWebcamSettings';

// using a service to store values because DOM does not always update otherwise
// https://stackoverflow.com/questions/69749023/angular-variable-value-change-doesnt-reflect-in-dom
@Injectable({
    providedIn: 'root',
})
export class WebcamService {
    public mediaStream: MediaStream = undefined;
    public detachedWebcamWindowActiveStatus: boolean = false;
    public spinnerStatus: boolean = false;
    public selectedWebcam: WebcamDevice = undefined;
    public webcamFormGroup: FormGroup<{}> = new FormGroup({});
    public presetSettings: WebcamDeviceInformation[] = undefined;

    public setMediaStream(mediaStream: MediaStream): void {
        this.mediaStream = mediaStream;
    }
    public getMediaStream(): MediaStream {
        return this.mediaStream;
    }

    public setDetachedWebcamWindowActive(status: boolean): void {
        this.detachedWebcamWindowActiveStatus = status;
    }
    public getDetachedWebcamWindowActive(): boolean {
        return this.detachedWebcamWindowActiveStatus;
    }

    public setSpinnerStatus(status: boolean): void {
        this.spinnerStatus = status;
    }

    public getSpinnerStatus(): boolean {
        return this.spinnerStatus;
    }

    public setSelectedWebcam(selectedWebcam: WebcamDevice): void {
        this.selectedWebcam = selectedWebcam;
    }

    public getSelectedWebcam(): WebcamDevice {
        return this.selectedWebcam;
    }

    public setWebcamFormGroup(webcamFormGroup: FormGroup<{}>): void {
        this.webcamFormGroup = webcamFormGroup;
    }

    public getWebcamFormGroup(): FormGroup<{}> {
        return this.webcamFormGroup;
    }

    public setPresetSettings(presetSettings: WebcamDeviceInformation[]): void {
        this.presetSettings = presetSettings;
    }

    public getPresetSettings(): WebcamDeviceInformation[] {
        return this.presetSettings;
    }
}
