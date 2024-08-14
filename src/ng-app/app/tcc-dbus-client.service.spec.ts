import { TestBed, TestBedStatic } from '@angular/core/testing';

import { TccDBusClientService } from './tcc-dbus-client.service';

describe('TccDbusClientService', (): void => {
  beforeEach((): TestBedStatic => TestBed.configureTestingModule({}));

  it('should be created', (): void => {
    const service: TccDBusClientService = TestBed.get(TccDBusClientService);
    expect(service).toBeTruthy();
  });
});
