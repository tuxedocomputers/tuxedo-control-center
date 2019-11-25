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
