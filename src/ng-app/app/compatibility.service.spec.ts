import { TestBed } from '@angular/core/testing';

import { CompatibilityService } from './compatibility.service';

describe('CompatibilityService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: CompatibilityService = TestBed.get(CompatibilityService);
    expect(service).toBeTruthy();
  });
});
