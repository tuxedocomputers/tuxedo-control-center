import { TestBed } from '@angular/core/testing';

import { DbusService } from './dbus.service';

describe('DbusService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: DbusService = TestBed.get(DbusService);
    expect(service).toBeTruthy();
  });
});
