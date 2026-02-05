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
// biome-ignore lint: injection token
import { ActivatedRoute } from '@angular/router';
import type { ITomteInformation, ITomteModule } from '../../../common/models/ITomteAPI';
import type { ConfirmDialogResult } from '../dialog-confirm/dialog-confirm.component';
// biome-ignore lint: injection token
import { UtilsService } from '../utils.service';

@Component({
    selector: 'app-tomte-gui',
    templateUrl: './tomte-gui.component.html',
    styleUrls: ['./tomte-gui.component.scss'],
    providers: [
        {
            provide: STEPPER_GLOBAL_OPTIONS,
            useValue: { displayDefaultIndicatorType: false },
        },
    ],
    standalone: false,
})
export class TomteGuiComponent implements OnInit {
    public jsonError: boolean = false;
    public rebootRequired: boolean = false;
    public tomteListArray: ITomteModule[] = [];
    public moduleToolTips: Map<string, string> = new Map();
    public columnsToDisplay: string[] = [
        'moduleName',
        'moduleVersion',
        'moduleInstalled',
        'moduleBlocked',
        'moduleDescription',
    ];

    public tomteMode: string = '';
    public tomteModes: string[] = ['AUTOMATIC', 'UPDATES_ONLY', 'DONT_CONFIGURE'];
    public showRetryButton: boolean = false;
    public loadingInformation: boolean = false;
    public aptInstalled: boolean = false;
    public tomteInstalled: boolean = false;

    constructor(
        private utils: UtilsService,
        private route: ActivatedRoute,
    ) {}

    public ngOnInit(): void {
        this.setVariablesWithRouteSnapshot();
        this.tomtelist();
    }

    private setVariablesWithRouteSnapshot(): void {
        const data = this.route.snapshot.data;

        this.aptInstalled = data.aptInstalled;
        this.tomteInstalled = data.tomteInstalled;
    }

    public openExternalUrl(url: string): void {
        this.utils.openExternal(url);
    }

    private async tomtelist(): Promise<void> {
        this.showRetryButton = false;
        this.loadingInformation = true;

        this.tomteInstalled = await window.pgms.tomteInstalled();

        if (this.tomteInstalled) {
            let tomteInformation: ITomteInformation;

            for (let i: number = 0; i < 30; i++) {
                tomteInformation = await window.tomteAPI.getTomteInformation();

                if (!tomteInformation) {
                    this.jsonError = true;
                }

                if (tomteInformation) {
                    this.jsonError = false;
                    this.getModuleDescriptions();
                    break;
                } else {
                    if (i === 10) {
                        this.throwErrorMessage(
                            $localize`:@@tomteGuiTomteListErrorPopup:Information from command 'tomte list' could not be obtained. Is tomte already running?`,
                        );
                    }

                    await new Promise((resolve) => setTimeout(resolve, 1000));

                    if (i === 29) {
                        this.showRetryButton = true;
                    }
                }
            }

            this.tomteListArray = tomteInformation?.modules ?? [];
            this.tomteMode = tomteInformation?.mode ?? '';
        }

        this.getModuleDescriptions();
        this.loadingInformation = false;
    }

    /*
        Loads the descriptions for each module in the background and puts it into moduleToolTips Variable that is then
        read in the HTML file
    */
    private async getModuleDescriptions(): Promise<void> {
        if (this.moduleToolTips.size < this.tomteListArray?.length) {
            for (let i: number = 0; i < this.tomteListArray?.length; i++) {
                const moduleName: string = this.tomteListArray[i]?.name;

                if (this.moduleToolTips.has(moduleName)) {
                    continue;
                }

                const results: string = await window.tomteAPI.getModuleDescription(
                    moduleName,
                    this.utils.getCurrentLanguageId(),
                );

                if (!results) {
                    continue;
                }

                this.moduleToolTips.set(moduleName, results);
            }
        }
    }

    /*
        Returns properly translated tooltip for the sliders in each of their proper conditions
    */
    // todo: maybe refactor
    public getSliderToolTip(
        name: string,
        whichButton: string,
        required: string,
        blocked: string,
        installed: string,
    ): string {
        if (whichButton === 'blocked') {
            if (required === 'prerequisite' || name === 'tuxedo-control-center' || name === 'tuxedo-drivers') {
                return $localize`:@@tomteGuiSliderToolTipBlockRequisite:This module is essential for the proper operation of your TUXEDO and cannot be deactivated`;
            }
            if (blocked === 'yes') {
                return $localize`:@@tomteGuiSliderToolTipUnblock:Activate module`;
            } else {
                return $localize`:@@tomteGuiSliderToolTipBlock:Deactivate module`;
            }
        }

        if (whichButton === 'installed') {
            if (required === 'prerequisite' || name === 'tuxedo-control-center' || name === 'tuxedo-drivers') {
                return $localize`:@@tomteGuiSliderToolTipUninstallRequisite:This module is essential for the proper operation of your TUXEDO and cannot be uninstalled`;
            }
            if (blocked === 'yes') {
                return $localize`:@@tomteGuiSliderToolTipUnInstallBlocked:Cannot install or uninstall a module that is blocked`;
            }
            if (installed === 'yes') {
                return $localize`:@@tomteGuiSliderToolTipBlockUninstall:Uninstall this module`;
            } else {
                return $localize`:@@tomteGuiSliderToolTipInstall:Install this module`;
            }
        }
    }

    /*
        Opens Dialog containing given errormessage
        Also logs the error to the browser console
    */
    private async throwErrorMessage(err: string | undefined): Promise<void> {
        console.error(`tomte-gui: throwErrorMessage => ${err}`);

        await this.utils.confirmDialog({
            title: $localize`:@@tomteGuiDialogErrorTitle:An Error occured!`,
            description: err,
            linkLabel: ``,
            linkHref: null,
            buttonAbortLabel: ``,
            buttonConfirmLabel: `Ok`,
            checkboxNoBotherLabel: `:`,
            showCheckboxNoBother: false,
        });
    }

    /*
        Opens Dialog asking the user if they are sure to proceed
    */
    private async confirmChangesDialog(): Promise<boolean> {
        const tomteGuiNoticeDisable: string = localStorage.getItem('tomteGuiNoticeDisable');

        if (tomteGuiNoticeDisable === null || tomteGuiNoticeDisable === 'false') {
            const askToClose: ConfirmDialogResult = await this.utils.confirmDialog({
                title: $localize`:@@tomteBreakingChangesTitle:Authentication is required to run TUXEDO Tomte`,
                description: $localize`:@@tomteBreakingChangesWarning:Warning: Changes to the default Tomte-configuration can lead to your device not working properly anymore!`,
                linkLabel: '',
                linkHref: '',
                buttonAbortLabel: $localize`:@@tomteAbortButtonLabel:Abort`,
                buttonConfirmLabel: $localize`:@@tomteConfirmButtonLabel:I understand`,
                checkboxNoBotherLabel: $localize`:@@tomteDialogCheckboxNoBotherLabel:Don't ask again`,
                showCheckboxNoBother: true,
            });

            if (askToClose.noBother) {
                localStorage.setItem('tomteGuiNoticeDisable', 'true');
            }

            if (!askToClose.confirm) {
                return false;
            }
        }

        return true;
    }

    /*
        Opens Dialog informing the user that everything they have customly configured will be rewoken by issueing this command
    */
    private async confirmResetDialog(): Promise<boolean> {
        const askToClose: ConfirmDialogResult = await this.utils.confirmDialog({
            title: $localize`:@@tomteResetDefaultsTitle:Are you sure you want to reset to defaults?`,
            description: $localize`:@@tomteResetDefaultsMessage:This will revert any manual configuration you did, are you sure you want to proceed?`,
            linkLabel: '',
            linkHref: '',
            buttonAbortLabel: $localize`:@@tomteAbortButtonLabel:Abort`,
            buttonConfirmLabel: $localize`:@@tomteConfirmButtonLabel:I understand`,
            checkboxNoBotherLabel: '',
            showCheckboxNoBother: false,
        });

        if (askToClose.confirm) {
            return true;
        }

        if (!askToClose.confirm) {
            return false;
        }
    }

    /*
        Tries to completely restore tomte to default configuration.
        Throws exhaustive error message if it fails.
    */
    public async tomteResetToDefaults(): Promise<void> {
        this.utils.pageDisabled = true;
        const confirmed: boolean = await this.confirmResetDialog();

        if (!confirmed) {
            this.tomtelist();
            this.utils.pageDisabled = false;
            return;
        }

        const success: string = await window.tomteAPI.resetToDefaults();

        if (success) {
            this.tomtelist();
        } else {
            this.throwErrorMessage(
                $localize`:@@tomteGuiResetFailedPopup:Reset failed. Maybe Tomte is already running? If that is the case simply try again later.`,
            );
        }

        this.utils.pageDisabled = false;
    }

    /*
        Tries to either install or uninstall a given module, depending on if the module is already installed or not
        Not to be confused with the installTomteButton() function that instead tries to install tomte
    */
    public async tomteModuleInstallButton(name: string, installed: string, blocked: string) {
        this.utils.pageDisabled = true;
        const confirmed: boolean = await this.confirmChangesDialog();

        if (!confirmed) {
            this.tomtelist();
            this.utils.pageDisabled = false;
            return;
        }

        if (blocked === 'yes') {
            this.utils.pageDisabled = false;
            return;
        }

        if (installed === 'yes') {
            await window.tomteAPI.removeModule(name).catch((err: unknown): void => {
                console.error(`tomote-gui: tomteModuleInstallButton removeModule failed => ${err}`);
                this.utils.pageDisabled = false;
                this.tomtelist();
                return;
            });
        } else {
            await window.tomteAPI.installModule(name).catch((err: unknown): void => {
                console.error(`tomote-gui: tomteModuleInstallButton installModule failed => ${err}`);
                this.utils.pageDisabled = false;
                this.tomtelist();
                return;
            });
        }

        this.tomtelist();
        this.utils.pageDisabled = false;
    }

    /*
        Tries to either block or unblock a given module, depending on if the module is already blocked or not
    */
    public async tomteBlockButton(name: string, blocked: string): Promise<void> {
        const confirmed: boolean = await this.confirmChangesDialog();

        if (!confirmed) {
            this.tomtelist();
            this.utils.pageDisabled = false;
            return;
        }

        this.utils.pageDisabled = true;

        if (blocked === 'yes') {
            await window.tomteAPI.unBlockModule(name).catch((err: unknown): void => {
                console.error(`tomote-gui: tomteBlockButton unBlockModule failed => ${err}`);
                this.utils.pageDisabled = false;
                return;
            });
        } else {
            await window.tomteAPI.blockModule(name).catch((err: unknown): void => {
                console.error(`tomote-gui: tomteBlockButton blockModule failed => ${err}`);
                this.utils.pageDisabled = false;
                return;
            });
        }

        this.tomtelist();
        this.utils.pageDisabled = false;
    }

    /*
        Changes the mode tomte is operating in to the mode given and throws an error message if this doesnt work
    */
    public async tomteModeButton(mode: { value: ['AUTOMATIC', 'UPDATES_ONLY', 'DONT_CONFIGURE'] }): Promise<void> {
        const confirmed: boolean = await this.confirmChangesDialog();

        if (!confirmed) {
            this.tomtelist();
            this.utils.pageDisabled = false;
            return;
        }

        this.utils.pageDisabled = true;

        await window.tomteAPI.setMode(mode.value).catch((err: unknown): void => {
            console.error(`tomote-gui: tomteModeButton failed => ${err}`);
            this.utils.pageDisabled = false;
            return;
        });

        this.tomtelist();
        this.utils.pageDisabled = false;
    }

    /*
        Tries to install tomte when button is clicked and throws error message if it fails.
        Not to be confused with the tomteModuleInstallButton() function, which tries to install or uninstall a given module
    */
    public async installTomteButton(): Promise<void> {
        this.utils.pageDisabled = true;
        const tomteInstalled: boolean = await window.pgms.installTomte();

        if (!tomteInstalled) {
            this.throwErrorMessage(
                $localize`:@@tomteGuiInstallErrorMessagePopup:Tomte failed to install. Do you use a tuxedo device and are using the tuxedo repos?`,
            );
        }

        this.utils.pageDisabled = false;
        this.tomtelist();
    }
}
