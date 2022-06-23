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

import { NgxElectronModule } from 'ngx-electron';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatInputModule, MatInput } from '@angular/material/input';
import { MatTooltipModule} from '@angular/material/tooltip';
import { MatCheckboxModule} from '@angular/material/checkbox';
import { MatDividerModule} from '@angular/material/divider';
import { MatSliderModule } from '@angular/material/slider';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatStepperModule } from '@angular/material/stepper';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTabsModule } from '@angular/material/tabs';
import { MatDialogModule } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu'

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
import { ChangeCryptPasswordComponent } from './change-crypt-password/change-crypt-password.component';
import { FanGraphComponent } from './fan-graph/fan-graph.component';

import { ChartsModule, ThemeService } from 'ng2-charts';
import { ColorPickerModule } from 'ngx-color-picker';
import { MainGuiComponent } from './main-gui/main-gui.component';
import { AquarisControlComponent } from './aquaris-control/aquaris-control.component';
import { DialogInputTextComponent } from './dialog-input-text/dialog-input-text.component';
import { DialogConfirmComponent } from './dialog-confirm/dialog-confirm.component';

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
    ChangeCryptPasswordComponent,
    FanGraphComponent,
    MainGuiComponent,
    AquarisControlComponent,
    DialogInputTextComponent,
    DialogConfirmComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    NgxElectronModule,
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
    MatMenuModule
  ],
  providers: [
    DecimalPipe,
    ThemeService
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
