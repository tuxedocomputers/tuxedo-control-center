import { TestBed } from '@angular/core/testing';

import { DBusService } from './dbus.service';

describe('DbusService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: DBusService = TestBed.get(DBusService);
    expect(service).toBeTruthy();
  });
});
