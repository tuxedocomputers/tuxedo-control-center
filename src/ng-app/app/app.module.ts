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

import { OverlayModule } from '@angular/cdk/overlay';
import { DecimalPipe, registerLocaleData } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import localeDe from '@angular/common/locales/de';
import localeDeExtra from '@angular/common/locales/extra/de';
import { NgModule, provideZoneChangeDetection } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialogModule } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSliderModule } from '@angular/material/slider';
import { MatStepperModule } from '@angular/material/stepper';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { GaugeModule } from 'angular-gauge';
import { Chart, registerables } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { BaseChartDirective, ThemeService } from 'ng2-charts';
import { ColorPickerModule } from 'ngx-color-picker';
import { MarkdownModule } from 'ngx-markdown';
import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';
import { AquarisControlComponent } from './aquaris-control/aquaris-control.component';
import { ChangeCryptPasswordComponent } from './change-crypt-password/change-crypt-password.component';
import { ChargingSettingsComponent } from './charging-settings/charging-settings.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { DialogChoiceComponent } from './dialog-choice/dialog-choice.component';
import { DialogConfirmComponent } from './dialog-confirm/dialog-confirm.component';
import { DialogInputTextComponent } from './dialog-input-text/dialog-input-text.component';
import { DialogWaitingComponent } from './dialog-waiting/dialog-waiting.component';
import { FanChartComponent } from './fan-chart/fan-chart.component';
import { FanCustomChartComponent } from './fan-custom-chart/fan-custom-chart.component';
import { GlobalSettingsComponent } from './global-settings/global-settings.component';
import { InfoComponent } from './info/info.component';
import { KeyboardBacklightComponent } from './keyboard-backlight/keyboard-backlight.component';
import { KeyboardVisualComponent } from './keyboard-visual/keyboard-visual.component';
import { MainGuiComponent } from './main-gui/main-gui.component';
import { PrimeDialogComponent } from './prime-dialog/prime-dialog.component';
import { PrimeSelectComponent } from './prime-select/prime-select.component';
import { ProfileConflictComponent } from './profile-conflict-dialog/profile-conflict-dialog.component';
import { ProfileConflictDialogService } from './profile-conflict-dialog/profile-conflict-dialog.service';
import { ProfileDetailsEditComponent } from './profile-details-edit/profile-details-edit.component';
import { ProfileManagerComponent } from './profile-manager/profile-manager.component';
import { ProfileOverviewTileComponent } from './profile-overview-tile/profile-overview-tile.component';
import { ShutdownTimerComponent } from './shutdown-timer/shutdown-timer.component';
import { SupportComponent } from './support/support.component';
import { TgpChartComponent } from './tgp-chart/tgp-chart.component';
import { TomteGuiComponent } from './tomte-gui/tomte-gui.component';
import { ToolsComponent } from './tools/tool.component';
import { WebcamPreviewComponent } from './webcam-preview/webcam-preview.component';
import { WebcamSettingsComponent } from './webcam-settings/webcam-settings.component';

registerLocaleData(localeDe, 'de', localeDeExtra);

declare const require;

@NgModule({
    declarations: [
        AppComponent,
        ProfileManagerComponent,
        SupportComponent,
        ProfileOverviewTileComponent,
        ProfileDetailsEditComponent,
        InfoComponent,
        DashboardComponent,
        GlobalSettingsComponent,
        ShutdownTimerComponent,
        ToolsComponent,
        KeyboardBacklightComponent,
        ChangeCryptPasswordComponent,
        FanChartComponent,
        TgpChartComponent,
        MainGuiComponent,
        AquarisControlComponent,
        DialogInputTextComponent,
        DialogConfirmComponent,
        DialogChoiceComponent,
        ChargingSettingsComponent,
        WebcamSettingsComponent,
        WebcamPreviewComponent,
        TomteGuiComponent,
        ProfileConflictComponent,
        KeyboardVisualComponent,
        DialogWaitingComponent,
        PrimeSelectComponent,
        PrimeDialogComponent,
        FanCustomChartComponent,
    ],
    imports: [
        BrowserModule,
        AppRoutingModule,
        BrowserAnimationsModule,
        FormsModule,
        HttpClientModule,
        ReactiveFormsModule,
        MatSidenavModule,
        MatToolbarModule,
        MatListModule,
        MatIconModule,
        MatTableModule,
        MatFormFieldModule,
        MatSelectModule,
        MatButtonModule,
        MatCardModule,
        MatChipsModule,
        MatExpansionModule,
        MatInputModule,
        MatTooltipModule,
        MatCheckboxModule,
        MatRadioModule,
        MatDividerModule,
        MatSliderModule,
        MatGridListModule,
        MatStepperModule,
        MatButtonToggleModule,
        MatProgressBarModule,
        MatProgressSpinnerModule,
        MatSlideToggleModule,
        MatTabsModule,
        MatDialogModule,
        MarkdownModule.forRoot(),
        OverlayModule,
        GaugeModule.forRoot(),
        ColorPickerModule,
        MatMenuModule,
        MatRadioModule,
        BaseChartDirective,
    ],
    providers: [DecimalPipe, ThemeService, ProfileConflictDialogService, provideZoneChangeDetection()],
    bootstrap: [AppComponent],
})
export class AppModule {
    constructor() {
        // https://github.com/chartjs/chartjs-plugin-datalabels/issues/309
        Chart.register(...registerables);
        Chart.register(ChartDataLabels);
    }
}
