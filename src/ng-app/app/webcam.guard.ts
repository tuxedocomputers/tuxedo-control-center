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
import type { FormGroup } from '@angular/forms';
import type { CanDeactivate } from '@angular/router';
import type { ConfirmDialogData, ConfirmDialogResult } from './dialog-confirm/dialog-confirm.component';
// biome-ignore lint: deb does build with type, but creates constructor dependency injection error
import { UtilsService } from './utils.service';

export interface CanComponentDeactivate {
    webcamFormGroup: FormGroup;
}

@Injectable({
    providedIn: 'root',
})
export class WebcamSettingsGuard implements CanDeactivate<CanComponentDeactivate> {
    constructor(private utils: UtilsService) {}
    private loading: boolean = false;

    askUnsavedPreset(): Promise<ConfirmDialogResult> {
        const config: ConfirmDialogData = {
            title: $localize`:@@webcamDialogUnsavedChangesTitle:Unsaved changes`,
            description: $localize`:@@webcamDialogUnsavedChangesDescription:Changes were not saved. Are you sure that you want to leave before saving?`,
            buttonAbortLabel: $localize`:@@dialogReturn:Go back`,
            buttonConfirmLabel: $localize`:@@dialogLeave:Leave`,
        };
        return this.utils.confirmDialog(config);
    }

    public setLoadingStatus(status: boolean): void {
        this.loading = status;
    }

    public async canDeactivate(component: CanComponentDeactivate): Promise<boolean> {
        if (component.webcamFormGroup.dirty) {
            let canRoute: boolean;
            await this.askUnsavedPreset().then((x: ConfirmDialogResult): void => {
                canRoute = x['confirm'];
            });
            return canRoute;
        }

        if (this.loading) {
            return false;
        }

        return true;
    }
}
