import { TestBed, TestBedStatic } from '@angular/core/testing';

import { CompatibilityService } from './compatibility.service';

describe('CompatibilityService', (): void => {
  beforeEach((): TestBedStatic => TestBed.configureTestingModule({}));

  it('should be created', (): void => {
    const service: CompatibilityService = TestBed.get(CompatibilityService);
    expect(service).toBeTruthy();
  });
});
