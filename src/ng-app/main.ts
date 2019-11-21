import { enableProdMode, TRANSLATIONS, TRANSLATIONS_FORMAT } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { AppModule } from './app/app.module';
import { environment } from './environments/environment';

import 'hammerjs';

if (environment.production) {
  enableProdMode();
}

// TODO: Set localeId according to settings
if (localStorage.getItem('localeId') === null) {
  localStorage.setItem('localeId', 'en');
}

declare const require;
const translations = new Map<string, string>();
translations.set('de', require('raw-loader!./assets/locale/lang.de-DE.xlf'));

platformBrowserDynamic().bootstrapModule(AppModule, {
  providers: [
    { provide: TRANSLATIONS, useValue: translations.get(localStorage.getItem('localeId')) },
    { provide: TRANSLATIONS_FORMAT, useValue: 'xlf' }
  ]
}).catch(err => console.error(err));
