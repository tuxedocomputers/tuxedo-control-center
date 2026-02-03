/*!
 * Copyright (c) 2019-2022 TUXEDO Computers GmbH <tux@tuxedocomputers.com>
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
import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';

// import { NgxElectronModule } from 'ngx-electron';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatLegacyListModule as MatListModule } from '@angular/material/legacy-list';
import { MatIconModule } from '@angular/material/icon';
import { MatLegacyTableModule as MatTableModule } from '@angular/material/legacy-table';
import { MatLegacyFormFieldModule as MatFormFieldModule } from '@angular/material/legacy-form-field';
import { MatLegacySelectModule as MatSelectModule } from '@angular/material/legacy-select';
import { MatLegacyButtonModule as MatButtonModule } from '@angular/material/legacy-button';
import { MatLegacyCardModule as MatCardModule } from '@angular/material/legacy-card';
import { MatLegacyChipsModule as MatChipsModule } from '@angular/material/legacy-chips';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatLegacyInputModule as MatInputModule, MatLegacyInput as MatInput } from '@angular/material/legacy-input';
import { MatLegacyTooltipModule as MatTooltipModule } from '@angular/material/legacy-tooltip';
import { MatLegacyCheckboxModule as MatCheckboxModule } from '@angular/material/legacy-checkbox';
import { MatLegacyRadioModule as MatRadioModule } from '@angular/material/legacy-radio';
import { MatDividerModule } from '@angular/material/divider';
import { MatLegacySliderModule as MatSliderModule } from '@angular/material/legacy-slider';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatStepperModule } from '@angular/material/stepper';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatLegacyProgressBarModule as MatProgressBarModule } from '@angular/material/legacy-progress-bar';
import { MatLegacyProgressSpinnerModule as MatProgressSpinnerModule } from '@angular/material/legacy-progress-spinner';
import { MatLegacySlideToggleModule as MatSlideToggleModule } from '@angular/material/legacy-slide-toggle';
import { MatLegacyTabsModule as MatTabsModule } from '@angular/material/legacy-tabs';
import { MatLegacyDialogModule as MatDialogModule } from '@angular/material/legacy-dialog';
import { MatLegacyMenuModule as MatMenuModule } from '@angular/material/legacy-menu';

import { DecimalPipe, registerLocaleData } from '@angular/common';
import { ProfileManagerComponent } from './profile-manager/profile-manager.component';
import { SupportComponent } from './support/support.component';
import { HttpClientModule } from '@angular/common/http';
import { ProfileOverviewTileComponent } from './profile-overview-tile/profile-overview-tile.component';
import { ProfileDetailsEditComponent } from './profile-details-edit/profile-details-edit.component';
import { InfoComponent } from './info/info.component';

import { MarkdownModule } from 'ngx-markdown';
import { CpuDashboardComponent } from './cpu-dashboard/cpu-dashboard.component';

import localeDe from '@angular/common/locales/de';
import localeDeExtra from '@angular/common/locales/extra/de';

import { OverlayModule } from '@angular/cdk/overlay';

import { GaugeModule } from 'angular-gauge';
import { GlobalSettingsComponent } from './global-settings/global-settings.component';
import { ShutdownTimerComponent } from './shutdown-timer/shutdown-timer.component';
import { ToolsComponent } from "./tools/tool.component";
import { KeyboardBacklightComponent } from "./keyboard-backlight/keyboard-backlight.component";
import { ChangeCryptPasswordComponent } from './change-crypt-password/change-crypt-password.component';
import { FanGraphComponent } from './fan-graph/fan-graph.component';

import { ChartsModule, ThemeService } from 'ng2-charts';
import { ColorPickerModule } from 'ngx-color-picker';
import { MainGuiComponent } from './main-gui/main-gui.component';
import { AquarisControlComponent } from './aquaris-control/aquaris-control.component';
import { DialogInputTextComponent } from './dialog-input-text/dialog-input-text.component';
import { DialogConfirmComponent } from './dialog-confirm/dialog-confirm.component';
import { TomteGuiComponent } from './tomte-gui/tomte-gui.component';
import { ProfileConflictDialogService } from './profile-conflict-dialog/profile-conflict-dialog.service';
import { ProfileConflictComponent } from './profile-conflict-dialog/profile-conflict-dialog.component';
import { ChargingSettingsComponent } from './charging-settings/charging-settings.component';
import { WebcamSettingsComponent } from "./webcam-settings/webcam-settings.component";
import { WebcamPreviewComponent } from "./webcam-preview/webcam-preview.component";
import { DialogChoiceComponent } from './dialog-choice/dialog-choice.component';
import { KeyboardVisualComponent } from './keyboard-visual/keyboard-visual.component';
import { DialogWaitingComponent } from './dialog-waiting/dialog-waiting.component';
import { PrimeSelectComponent } from './prime-select/prime-select.component';
import { PrimeDialogComponent } from './prime-dialog/prime-dialog.component';
import { FanSliderComponent } from './fan-slider/fan-slider.component';

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
    CpuDashboardComponent,
    GlobalSettingsComponent,
    ShutdownTimerComponent,
    ToolsComponent,
    KeyboardBacklightComponent,
    ChangeCryptPasswordComponent,
    FanGraphComponent,
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
    FanSliderComponent,
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    // NgxElectronModule,
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
    ChartsModule,
    ColorPickerModule,
    MatMenuModule,
    MatRadioModule
  ],
  providers: [
    DecimalPipe,
    ThemeService,
    ProfileConflictDialogService
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
