import { TestBed } from '@angular/core/testing';

import { TccDBusClientService } from './tcc-dbus-client.service';

describe('TccDbusClientService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: TccDBusClientService = TestBed.get(TccDBusClientService);
    expect(service).toBeTruthy();
  });
});
