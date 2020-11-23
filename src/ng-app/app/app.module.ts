/*!
 * Copyright (c) 2019 TUXEDO Computers GmbH <tux@tuxedocomputers.com>
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
import { BrowserModule, HAMMER_GESTURE_CONFIG } from '@angular/platform-browser';
import { NgModule, LOCALE_ID, TRANSLATIONS_FORMAT, TRANSLATIONS } from '@angular/core';

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

import { I18n } from '@ngx-translate/i18n-polyfill';

import { OverlayModule } from '@angular/cdk/overlay';

import { GaugeModule } from 'angular-gauge';
import { ShutdownTimerComponent } from './shutdown-timer/shutdown-timer.component';
import { ToolsComponent } from "./tools/tool.component";

registerLocaleData(localeDe, 'de', localeDeExtra);

// TODO: Set localeId according to settings
let langId = 'en';
if (localStorage.getItem('langId') !== undefined && localStorage.getItem('langId') !== null) {
  langId = localStorage.getItem('langId');
}

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
    ShutdownTimerComponent,
    ToolsComponent
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
    MarkdownModule.forRoot(),
    OverlayModule,
    GaugeModule.forRoot()
  ],
  providers: [
    { provide: TRANSLATIONS_FORMAT, useValue: 'xlf' },
    { provide: LOCALE_ID, useValue: langId },
    { provide: TRANSLATIONS, useFactory: () => {
      let translation;
      try {
        translation = require('raw-loader!./../assets/locale/lang.' + langId + '.xlf');
      } catch (err) {
        translation = '';
      }
      return translation;
    }},
    DecimalPipe,
    I18n
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
