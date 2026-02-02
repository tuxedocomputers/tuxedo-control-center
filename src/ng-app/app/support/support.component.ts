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

import { STEPPER_GLOBAL_OPTIONS } from '@angular/cdk/stepper';
import { Component, type OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import type { MatInput } from '@angular/material/input';
import type { MatStepper } from '@angular/material/stepper';
// biome-ignore lint: injection token
import { ActivatedRoute } from '@angular/router';
// biome-ignore lint: injection token
import { UtilsService } from '../utils.service';

@Component({
    selector: 'app-support',
    templateUrl: './support.component.html',
    styleUrls: ['./support.component.scss'],
    providers: [
        {
            provide: STEPPER_GLOBAL_OPTIONS,
            useValue: { displayDefaultIndicatorType: false },
        },
    ],
    standalone: false,
})
export class SupportComponent implements OnInit {
    public aptInstalled: boolean = false;
    public webfaiCreatorInstalled: boolean;
    public isX11: number = -1;
    public formTicketNumber: FormGroup;
    public systeminfoRunOutput: string = '';
    public systeminfoRunProgress: boolean = false;
    public systemInfosCompleted: boolean = false;
    public webfaiCreatorProgramName: string = 'tuxedo-webfai-creator';
    // TODO how can we buffer this value better without using sync calls that will likely blockade everything?
    private installProgress: Map<string, boolean> = new Map();
    private isCheckingInstallation: Map<string, boolean> = new Map();

    constructor(
        private utils: UtilsService,
        private route: ActivatedRoute,
    ) {}

    public ngOnInit(): void {
        this.setVariablesWithRouteSnapshot();
        this.updateProgressStatus();
        this.formTicketNumber = new FormGroup({
            inputTicketNumber: new FormControl('', [Validators.required, Validators.pattern('^(99)([0-9]){7}')]),
        });

        window.ipc.onUpdateSystemInfosLabel((_event: any, text: string): void => {
            this.systeminfoOutput(text);
        });
    }

    private setVariablesWithRouteSnapshot(): void {
        const data = this.route.snapshot.data;

        this.aptInstalled = data.aptInstalled;
        this.webfaiCreatorInstalled = data.webfaiCreatorInstalled;
        this.isX11 = data.x11Status;
    }

    public focusControl(control: MatInput): void {
        setTimeout((): void => {
            control.focus();
        }, 0);
    }

    public openExternalUrl(url: string): void {
        this.utils.openExternal(url);
    }

    public async updateWebfaiCreatorInstallStatus(): Promise<void> {
        this.webfaiCreatorInstalled = await window.pgms.webfaiCreatorInstalled();
        this.isCheckingInstallation.set(this.webfaiCreatorProgramName, false);
    }

    public buttonInstallRemoveWebfaiCreator(): void {
        this.installProgress.set(this.webfaiCreatorProgramName, true);
        this.isCheckingInstallation.set(this.webfaiCreatorProgramName, true);
        if (this.webfaiCreatorInstalled) {
            window.pgms.uninstallWebfaiCreator().then((): void => {
                this.updateWebfaiCreatorInstallStatus();
                this.updateProgressStatus();
            });
        } else {
            window.pgms.installWebfaiCreator().then((): void => {
                this.updateWebfaiCreatorInstallStatus();
                this.updateProgressStatus();
            });
        }
        this.updateProgressStatus();
        setTimeout((): void => {
            this.updateProgressStatus();
        }, 500);
        setTimeout((): void => {
            this.updateProgressStatus();
        }, 1000);
    }

    public buttonStartWebfaiCreator(): void {
        window.pgms.startWebfaiCreator();
    }

    public progress(): Map<string, boolean> {
        return this.installProgress;
    }

    public progressCheck(): Map<string, boolean> {
        return this.isCheckingInstallation;
    }

    private async updateProgressStatus(): Promise<void> {
        this.installProgress = await window.pgms.isInProgress();
        this.isCheckingInstallation = await window.pgms.isCheckingInstallation();
    }

    public buttonStartSysteminfo(systeminfoStepper: MatStepper): void {
        this.systeminfoRunProgress = true;
        this.utils.pageDisabled = true;
        window.ipc
            .runSysteminfo(this.formTicketNumber.controls.inputTicketNumber.value)
            .then(() => {
                this.systeminfoOutput('Done');
                this.systemInfosCompleted = true;
                systeminfoStepper.selected.completed = true;
                systeminfoStepper.next();
            })
            .catch((err: unknown): void => {
                console.error(`support: buttonStartSysteminfo failed => ${err}`);
                this.systeminfoRunOutput = err.toString();
            })
            .finally((): void => {
                this.systeminfoRunProgress = false;
                this.utils.pageDisabled = false;
            });
    }

    public systeminfoOutput(text: string): void {
        this.systeminfoRunOutput = text;
    }
}
