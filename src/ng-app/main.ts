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
import { enableProdMode, TRANSLATIONS, TRANSLATIONS_FORMAT, LOCALE_ID } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { AppModule } from './app/app.module';
import { environment } from './environments/environment';

import 'hammerjs';

if (environment.production) {
  enableProdMode();
}

// TODO: Set localeId according to settings
let langId = 'en';
if (localStorage.getItem('langId') !== undefined && localStorage.getItem('langId') !== null) {
  langId = localStorage.getItem('langId');
}

declare const require;
let translation;
try {
  translation = require('raw-loader!./assets/locale/lang.' + langId + '.xlf');
} catch (err) {
  translation = '';
}

platformBrowserDynamic().bootstrapModule(AppModule, {
  providers: [
    { provide: TRANSLATIONS_FORMAT, useValue: 'xlf' },
    { provide: LOCALE_ID, useFactory: () => {
      return langId;
    }, deps: [] },
    { provide: TRANSLATIONS, useFactory: (localeId) => {
      return translation;
    }, deps: [ LOCALE_ID ] }
  ]
}).catch(err => console.error(err));
