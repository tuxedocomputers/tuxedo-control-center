import { TestBed } from '@angular/core/testing';
import { DecimalPipe } from '@angular/common';

import { TccDBusClientService } from './tcc-dbus-client.service';

describe('TccDbusClientService', () => {
  beforeEach(() => TestBed.configureTestingModule({
    providers: [DecimalPipe]
  }));

  it('should be created', () => {
    const service: TccDBusClientService = TestBed.inject(TccDBusClientService);
    expect(service).toBeTruthy();
  });
});
