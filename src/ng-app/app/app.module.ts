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

registerLocaleData(localeDe, 'de', localeDeExtra);

declare const require;
const translations = new Map<string, string>();
translations.set('de', require('raw-loader!./../assets/locale/lang.de-DE.xlf'));

@NgModule({
  declarations: [
    AppComponent,
    ProfileManagerComponent,
    SupportComponent,
    ProfileOverviewTileComponent,
    ProfileDetailsEditComponent,
    InfoComponent,
    CpuDashboardComponent
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
    MarkdownModule.forRoot()
  ],
  providers: [
    { provide: TRANSLATIONS_FORMAT, useValue: 'xlf' },
    { provide: TRANSLATIONS, useFactory: () => {
      let t = translations.get(localStorage.getItem('localeId'));
      if (t === null || t === undefined) { t = 'en'; }
      return t;
    } },
    DecimalPipe,
    I18n
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
