import { TestBed, TestBedStatic } from '@angular/core/testing';

import { ConfigService } from './config.service';

describe('ConfigService', (): void => {
  beforeEach((): TestBedStatic => TestBed.configureTestingModule({}));

  it('should be created', (): void => {
    const service: ConfigService = TestBed.get(ConfigService);
    expect(service).toBeTruthy();
  });
});
